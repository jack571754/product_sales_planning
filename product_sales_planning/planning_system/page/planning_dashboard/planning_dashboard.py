import frappe
from frappe.utils import getdate, today, date_diff, format_datetime
import json

@frappe.whitelist()
def get_dashboard_data(filters=None, search_text=None, sort_by=None, sort_order="asc"):
    """
    获取看板数据

    优化点：
    1. 批量查询店铺信息，避免 N+1 问题
    2. 添加错误处理
    3. 使用 SQL 优化统计查询
    4. 支持过滤、搜索和排序
    """
    try:
        # 解析过滤器参数
        if isinstance(filters, str):
            filters = json.loads(filters) if filters else {}
        elif filters is None:
            filters = {}

        # 1. 基础统计
        stats = {
            "ongoing": frappe.db.count("Schedule tasks", {"status": "开启中"}),
            "closed": frappe.db.count("Schedule tasks", {"status": "已结束"}),
            "types": len(frappe.db.sql("SELECT DISTINCT type FROM `tabSchedule tasks`"))
        }

        # 额外统计
        stats["urgent_count"] = 0
        stats["submitted_count"] = 0
        stats["approved_count"] = 0
        stats["rejected_count"] = 0

        # 2. 构建父任务过滤条件
        parent_filters = {"status": "开启中"}
        if filters.get("plan_type"):
            parent_filters["type"] = filters["plan_type"]

        # 🔥 新增：如果指定了任务筛选，直接过滤任务
        if filters.get("task_id"):
            parent_filters["name"] = filters["task_id"]

        parents = frappe.get_all(
            "Schedule tasks",
            filters=parent_filters,
            fields=["name", "type", "end_date", "status", "start_date"],
            order_by="end_date asc"
        )

        if not parents:
            return {
                "stats": stats,
                "tasks": [],
                "filter_options": get_filter_options()
            }

        processed_tasks = []
        current_date = getdate(today())

        # 3. 批量获取所有店铺信息（优化：避免 N+1 查询）
        store_cache = {}

        # 先收集所有需要的店铺ID
        all_store_ids = set()
        parent_docs = {}

        for p in parents:
            try:
                doc = frappe.get_doc("Schedule tasks", p.name)
                parent_docs[p.name] = doc

                if doc.set_store:
                    for item in doc.set_store:
                        if item.store_name:
                            all_store_ids.add(item.store_name)
            except Exception as e:
                frappe.log_error(f"获取任务失败: {p.name}", str(e))
                continue

        # 批量查询所有店铺信息
        if all_store_ids:
            stores = frappe.get_all(
                "Store List",
                filters={"name": ["in", list(all_store_ids)]},
                fields=["name", "shop_name", "channel"]
            )
            for store in stores:
                store_cache[store.name] = {
                    "shop_name": store.shop_name,
                    "channel": store.channel or "未知渠道"
                }

        # 4. 遍历并拆箱
        type_map = {"MON": "月度常规计划", "PRO": "专项促销活动"}

        for p in parents:
            try:
                doc = parent_docs.get(p.name)
                if not doc:
                    continue

                plan_name = type_map.get(p.type, p.type)

                is_urgent = False
                days_remaining = None
                if p.end_date:
                    days_remaining = date_diff(p.end_date, current_date)
                    if days_remaining <= 3:
                        is_urgent = True

                # 遍历子表 (Tasks Store)
                if doc.set_store:
                    for item in doc.set_store:
                        store_link_val = item.store_name
                        if not store_link_val:
                            continue

                        # 从缓存中获取店铺信息
                        shop_info = store_cache.get(store_link_val, {})
                        shop_title = shop_info.get("shop_name", store_link_val)
                        shop_channel = shop_info.get("channel", "未知渠道")

                        # 字段获取
                        in_charge = item.user or "待分配"
                        sub_status = item.status or "未开始"
                        approval_stat = item.approval_status or "待审批"

                        # 应用过滤器
                        # 🔥 新增：店铺筛选
                        if filters.get("store_id") and store_link_val != filters["store_id"]:
                            continue
                        if filters.get("channel") and shop_channel != filters["channel"]:
                            continue
                        if filters.get("status") and sub_status != filters["status"]:
                            continue
                        if filters.get("approval_status") and approval_stat != filters["approval_status"]:
                            continue
                        if filters.get("user") and in_charge != filters["user"]:
                            continue
                        if filters.get("is_urgent") and not is_urgent:
                            continue

                        # 搜索过滤
                        if search_text:
                            search_lower = search_text.lower()
                            if not (search_lower in shop_title.lower() or
                                    search_lower in shop_channel.lower() or
                                    search_lower in in_charge.lower() or
                                    search_lower in plan_name.lower()):
                                continue

                        submit_time_str = " "
                        if item.sub_time:
                            try:
                                submit_time_str = format_datetime(item.sub_time, "MM-dd HH:mm")
                            except Exception:
                                submit_time_str = str(item.sub_time)

                        task_data = {
                            "parent_id": p.name,
                            "row_id": item.name,
                            "store_id": store_link_val,
                            "title": shop_title,
                            "channel": shop_channel,
                            "plan_type": plan_name,
                            "plan_type_code": p.type,
                            "deadline": format_datetime(p.end_date, "yyyy-MM-dd") if p.end_date else "无截止",
                            "start_date": format_datetime(p.start_date, "yyyy-MM-dd") if p.start_date else "",
                            "user": in_charge,
                            "child_status": sub_status,
                            "approval_status": approval_stat,
                            "submit_time": submit_time_str,
                            "is_urgent": is_urgent,
                            "days_remaining": days_remaining if days_remaining is not None else 999
                        }

                        processed_tasks.append(task_data)

                        # 更新统计
                        if is_urgent:
                            stats["urgent_count"] += 1
                        if sub_status == "已提交":
                            stats["submitted_count"] += 1
                        if approval_stat == "已通过":
                            stats["approved_count"] += 1
                        elif approval_stat == "已驳回":
                            stats["rejected_count"] += 1

            except Exception as e:
                frappe.log_error(f"处理任务失败: {p.name}", str(e))
                continue

        # 5. 排序
        if sort_by:
            reverse = (sort_order == "desc")
            if sort_by == "deadline":
                processed_tasks.sort(key=lambda x: x["days_remaining"], reverse=reverse)
            elif sort_by == "title":
                processed_tasks.sort(key=lambda x: x["title"], reverse=reverse)
            elif sort_by == "channel":
                processed_tasks.sort(key=lambda x: x["channel"], reverse=reverse)
            elif sort_by == "status":
                processed_tasks.sort(key=lambda x: x["child_status"], reverse=reverse)
            elif sort_by == "user":
                processed_tasks.sort(key=lambda x: x["user"], reverse=reverse)

        return {
            "stats": stats,
            "tasks": processed_tasks,
            "filter_options": get_filter_options()
        }

    except Exception as e:
        frappe.log_error(title="获取看板数据失败", message=str(e))
        return {
            "stats": {"ongoing": 0, "closed": 0, "types": 0, "urgent_count": 0, "submitted_count": 0, "approved_count": 0, "rejected_count": 0},
            "tasks": [],
            "filter_options": {},
            "error": str(e)
        }


@frappe.whitelist()
def get_filter_options():
    """获取过滤器选项"""
    try:
        # 获取所有渠道
        channels = frappe.db.sql("""
            SELECT DISTINCT channel
            FROM `tabStore List`
            WHERE channel IS NOT NULL AND channel != ''
            ORDER BY channel
        """, as_dict=True)

        # 获取所有负责人
        users = frappe.db.sql("""
            SELECT DISTINCT user1 as user
            FROM `tabStore List`
            WHERE user1 IS NOT NULL AND user1 != ''
            ORDER BY user1
        """, as_dict=True)

        # 🔥 新增：获取所有店铺
        stores = frappe.get_all(
            "Store List",
            fields=["name", "shop_name"],
            order_by="shop_name asc"
        )

        # 🔥 新增：获取所有开启中的任务
        tasks = frappe.get_all(
            "Schedule tasks",
            filters={"status": "开启中"},
            fields=["name", "type", "start_date", "end_date"],
            order_by="creation desc"
        )

        return {
            "channels": [c["channel"] for c in channels],
            "users": [u["user"] for u in users],
            "statuses": ["未开始", "已提交"],
            "approval_statuses": ["待审批", "已通过", "已驳回"],
            "plan_types": [
                {"value": "MON", "label": "月度常规计划"},
                {"value": "PRO", "label": "专项促销活动"}
            ],
            "stores": stores,
            "tasks": tasks
        }
    except Exception as e:
        frappe.log_error(title="获取过滤选项失败", message=str(e))
        return {
            "channels": [],
            "users": [],
            "statuses": [],
            "approval_statuses": [],
            "plan_types": [],
            "stores": [],
            "tasks": []
        }