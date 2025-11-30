import frappe
from frappe.utils import getdate, today, date_diff, format_datetime

@frappe.whitelist()
def get_dashboard_data():
    """
    获取看板数据

    优化点：
    1. 批量查询店铺信息，避免 N+1 问题
    2. 添加错误处理
    3. 使用 SQL 优化统计查询
    """
    try:
        # 1. 基础统计
        stats = {
            "ongoing": frappe.db.count("Schedule tasks", {"status": "开启中"}),
            "closed": frappe.db.count("Schedule tasks", {"status": "已结束"}),
            "types": len(frappe.db.sql("SELECT DISTINCT type FROM `tabSchedule tasks`"))
        }

        # 2. 获取父任务 (只获取开启中的)
        parents = frappe.get_all(
            "Schedule tasks",
            filters={"status": "开启中"},
            fields=["name", "type", "end_date", "status"],
            order_by="end_date asc"
        )

        if not parents:
            return {
                "stats": stats,
                "tasks": []
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
                if p.end_date:
                    # 剩余天数小于等于3天视为紧急
                    if date_diff(p.end_date, current_date) <= 3:
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
                        sub_status = item.status or "未提交"
                        approval_stat = item.approval_status or "待发起审批"

                        submit_time_str = " "
                        if item.sub_time:
                            try:
                                submit_time_str = format_datetime(item.sub_time, "MM-dd HH:mm")
                            except Exception:
                                submit_time_str = str(item.sub_time)

                        processed_tasks.append({
                            "parent_id": p.name,
                            "row_id": item.name,
                            "store_id": store_link_val,
                            "title": shop_title,
                            "channel": shop_channel,
                            "plan_type": plan_name,
                            "deadline": format_datetime(p.end_date, "yyyy-MM-dd") if p.end_date else "无截止",
                            "user": in_charge,
                            "child_status": sub_status,
                            "approval_status": approval_stat,
                            "submit_time": submit_time_str,
                            "is_urgent": is_urgent
                        })

            except Exception as e:
                frappe.log_error(f"处理任务失败: {p.name}", str(e))
                continue

        return {
            "stats": stats,
            "tasks": processed_tasks
        }

    except Exception as e:
        frappe.log_error(title="获取看板数据失败", message=str(e))
        return {
            "stats": {"ongoing": 0, "closed": 0, "types": 0},
            "tasks": [],
            "error": str(e)
        }