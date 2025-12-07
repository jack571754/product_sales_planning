import frappe
from frappe.utils import getdate, today, date_diff, format_datetime
import json

@frappe.whitelist()
def get_dashboard_data(filters=None, search_text=None, sort_by=None, sort_order="asc"):
    """
    获取计划看板数据（支持过滤、搜索、排序）

    ==================== 前端调用方式 ====================

    方式一：使用 frappe-ui 的 createResource（推荐）
    ```javascript
    import { createResource } from 'frappe-ui'

    const dashboardData = createResource({
      url: 'product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_dashboard_data',
      params: () => ({
        filters: JSON.stringify({
          tab: 'pending',              // Tab 筛选：'pending' | 'completed'
          plan_type: 'MON',             // 计划类型：'MON' | 'PRO'（可选）
          task_ids: ['TASK-001'],       // 任务ID列表（可选，支持多选）
          store_ids: ['STORE-001'],     // 店铺ID列表（可选，支持多选）
          channel: '天猫',               // 渠道筛选（可选）
          status: '已提交',              // 提交状态：'未开始' | '已提交'（可选）
          approval_status: '待审批',     // 审批状态：'待审批' | '已通过' | '已驳回'（可选）
          user: '张三',                  // 负责人筛选（可选）
          is_urgent: true               // 是否紧急（可选）
        }),
        search_text: '搜索关键词',       // 全文搜索（可选）
        sort_by: 'deadline',            // 排序字段：'deadline' | 'title' | 'channel' | 'status' | 'user'（可选）
        sort_order: 'asc'               // 排序方向：'asc' | 'desc'（可选，默认 'asc'）
      }),
      auto: true  // 自动加载
    })

    // 访问数据
    dashboardData.data      // 返回的数据对象
    dashboardData.loading   // 加载状态
    dashboardData.error     // 错误信息
    dashboardData.reload()  // 重新加载
    ```

    方式二：使用 frappe-ui 的 call 函数
    ```javascript
    import { call } from 'frappe-ui'

    const { data, error } = await call(
      'product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_dashboard_data',
      {
        filters: JSON.stringify({ tab: 'pending', plan_type: 'MON' }),
        search_text: '天猫',
        sort_by: 'deadline',
        sort_order: 'desc'
      }
    )
    ```

    ==================== 请求参数说明 ====================

    @param filters: JSON 字符串或字典，支持以下过滤条件：
        - tab: string - Tab 筛选（必填）
            * 'pending': 待完成（显示待审批和已驳回的任务）
            * 'completed': 已完成（显示已通过的任务）
        - plan_type: string - 计划类型（可选）
            * 'MON': 月度常规计划
            * 'PRO': 专项促销活动
        - task_ids: list[string] - 任务ID列表（可选，支持多选）
            * 示例：['TASK-001', 'TASK-002']
        - task_id: string - 单个任务ID（可选，与 task_ids 二选一）
        - store_ids: list[string] - 店铺ID列表（可选，支持多选）
            * 示例：['STORE-001', 'STORE-002']
        - store_id: string - 单个店铺ID（可选，与 store_ids 二选一）
        - channel: string - 渠道筛选（可选）
            * 示例：'天猫'、'京东'
        - status: string - 提交状态（可选）
            * '未开始': 未提交
            * '已提交': 已提交审批
        - approval_status: string - 审批状态（可选）
            * '待审批': 等待审批
            * '已通过': 审批通过
            * '已驳回': 审批退回
        - user: string - 负责人筛选（可选）
            * 示例：'张三'
        - is_urgent: boolean - 是否紧急（可选）
            * true: 只显示紧急任务（截止日期 <= 3天）

    @param search_text: string - 全文搜索关键词（可选）
        - 搜索范围：店铺名称、渠道、负责人、计划类型
        - 不区分大小写

    @param sort_by: string - 排序字段（可选）
        - 'deadline': 按截止日期排序
        - 'title': 按店铺名称排序
        - 'channel': 按渠道排序
        - 'status': 按提交状态排序
        - 'user': 按负责人排序

    @param sort_order: string - 排序方向（可选，默认 'asc'）
        - 'asc': 升序
        - 'desc': 降序

    ==================== 返回值说明 ====================

    @return: dict - 返回数据对象，包含以下字段：

    {
        "stats": {
            // 全局统计数据（不受过滤器影响，始终显示全部数据的统计）
            "ongoing": int,           // 开启中的计划数量
            "closed": int,            // 已结束的计划数量
            "types": int,             // 计划类型数量
            "urgent_count": int,      // 紧急任务数量（截止日期 <= 3天）
            "submitted_count": int,   // 已提交任务数量
            "approved_count": int,    // 已通过任务数量
            "rejected_count": int,    // 已驳回任务数量
            "pending_count": int,     // 待审批任务数量（包括待审批和已驳回）
            "completed_count": int    // 已完成任务数量（等于 approved_count）
        },

        "tasks": [
            // 任务列表（受过滤器和 tab 影响）
            {
                "parent_id": string,        // 父任务ID（Schedule tasks 的 name）
                "row_id": string,           // 子表行ID（Tasks Store 的 name）
                "store_id": string,         // 店铺ID（Store List 的 name）
                "title": string,            // 店铺名称（显示用）
                "channel": string,          // 渠道名称（如：'天猫'、'京东'）
                "plan_type": string,        // 计划类型名称（'月度常规计划' | '专项促销活动'）
                "plan_type_code": string,   // 计划类型代码（'MON' | 'PRO'）
                "deadline": string,         // 截止日期（格式：'yyyy-MM-dd'，如：'2024-12-31'）
                "start_date": string,       // 开始日期（格式：'yyyy-MM-dd'）
                "user": string,             // 负责人（如：'张三'，未分配时为 '待分配'）
                "child_status": string,     // 提交状态（'未开始' | '已提交'）
                "approval_status": string,  // 审批状态（'待审批' | '已通过' | '已驳回'）
                "submit_time": string,      // 提交时间（格式：'MM-dd HH:mm'，如：'12-25 14:30'）
                "is_urgent": boolean,       // 是否紧急（截止日期 <= 3天）
                "days_remaining": int       // 剩余天数（用于排序，无截止日期时为 999）
            }
        ],

        "filter_options": {
            // 过滤器选项（用于前端下拉框）
            "channels": list[string],           // 所有渠道列表
            "users": list[string],              // 所有负责人列表
            "statuses": list[string],           // 所有提交状态列表
            "approval_statuses": list[string],  // 所有审批状态列表
            "plan_types": [                     // 所有计划类型列表
                {"value": "MON", "label": "月度常规计划"},
                {"value": "PRO", "label": "专项促销活动"}
            ],
            "stores": [                         // 所有店铺列表
                {"name": string, "shop_name": string}
            ],
            "tasks": [                          // 所有开启中的任务列表
                {"name": string, "type": string, "start_date": date, "end_date": date}
            ]
        },

        "error": string  // 错误信息（仅在发生错误时返回）
    }

    ==================== 使用示例 ====================

    示例1：获取待完成的月度计划
    ```javascript
    const data = await call('...get_dashboard_data', {
      filters: JSON.stringify({ tab: 'pending', plan_type: 'MON' })
    })
    ```

    示例2：搜索天猫渠道的紧急任务
    ```javascript
    const data = await call('...get_dashboard_data', {
      filters: JSON.stringify({ tab: 'pending', channel: '天猫', is_urgent: true }),
      search_text: '旗舰店'
    })
    ```

    示例3：按截止日期降序排序
    ```javascript
    const data = await call('...get_dashboard_data', {
      filters: JSON.stringify({ tab: 'pending' }),
      sort_by: 'deadline',
      sort_order: 'desc'
    })
    ```

    示例4：筛选多个任务和店铺
    ```javascript
    const data = await call('...get_dashboard_data', {
      filters: JSON.stringify({
        tab: 'pending',
        task_ids: ['TASK-001', 'TASK-002'],
        store_ids: ['STORE-001', 'STORE-002']
      })
    })
    ```

    ==================== 注意事项 ====================

    1. filters 参数必须是 JSON 字符串（使用 JSON.stringify 转换）
    2. tab 参数是必填的，决定显示待完成还是已完成的任务
    3. stats 统计数据不受过滤器影响，始终显示全部数据的统计
    4. tasks 列表受过滤器和 tab 参数影响
    5. 紧急任务定义：截止日期距离今天 <= 3天
    6. 搜索功能不区分大小写，支持模糊匹配
    7. 排序功能只影响 tasks 列表，不影响 stats 统计

    ==================== 优化点 ====================

    1. 批量查询店铺信息，避免 N+1 问题
    2. 添加错误处理和日志记录
    3. 使用 SQL 优化统计查询
    4. 支持多维度过滤、搜索和排序
    5. 支持多选筛选（任务、店铺）
    """
    try:
        # 解析过滤器参数
        if isinstance(filters, str):
            filters = json.loads(filters) if filters else {}
        elif filters is None:
            filters = {}

        # 提取 tab 参数
        current_tab = filters.pop('tab', 'pending') if isinstance(filters, dict) else 'pending'

        # 日志记录（仅在调试模式下）
        if frappe.conf.get("developer_mode"):
            frappe.logger().debug(f"get_dashboard_data called: filters={filters}, tab={current_tab}")

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
        stats["pending_count"] = 0
        stats["completed_count"] = 0

        # 2. 构建父任务过滤条件
        parent_filters = {"status": "开启中"}
        if filters.get("plan_type"):
            parent_filters["type"] = filters["plan_type"]

        # 任务筛选（支持多选）
        if filters.get("task_ids"):
            task_ids = filters["task_ids"]
            if isinstance(task_ids, str):
                task_ids = json.loads(task_ids)
            if task_ids and len(task_ids) > 0:
                parent_filters["name"] = ["in", task_ids]
        elif filters.get("task_id"):
            parent_filters["name"] = filters["task_id"]

        parents = frappe.get_all(
            "Schedule tasks",
            filters=parent_filters,
            fields=["name", "type", "end_date", "status", "start_date"],
            order_by="end_date asc"
        )

        frappe.logger().info(f"🔍 [Parent Tasks] Found {len(parents)} parent tasks: {[p.name for p in parents]}")

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

                        # 🔥 调试：打印原始审批状态
                        frappe.logger().info(f"🔍 [Debug] store={shop_title}, raw_approval_status={repr(item.approval_status)}, final_approval_stat={approval_stat}")

                        # 🔥 先进行全局统计（在应用任何过滤器之前）
                        # 统计审批状态
                        if approval_stat == "已通过":
                            stats["approved_count"] += 1
                            stats["completed_count"] += 1
                        elif approval_stat == "已驳回":
                            stats["rejected_count"] += 1
                            stats["pending_count"] += 1
                        else:
                            # 待审批
                            stats["pending_count"] += 1

                        # 统计提交状态
                        if sub_status == "已提交":
                            stats["submitted_count"] += 1

                        # 统计紧急任务
                        if is_urgent:
                            stats["urgent_count"] += 1

                        # 🔥 第一步：应用 Tab 筛选（最优先，决定显示哪些任务）
                        frappe.logger().info(f"🔍 [Tab Filter] current_tab={current_tab}, approval_stat={approval_stat}, shop_title={shop_title}")
                        if current_tab == 'completed':
                            # 已完成 tab：只显示已通过的任务
                            if approval_stat != '已通过':
                                frappe.logger().info(f"⏭️  [Tab Filter] Skipping (completed tab, not approved): {shop_title}")
                                continue
                        elif current_tab == 'pending':
                            # 待完成 tab：显示待审批和已驳回的任务
                            if approval_stat == '已通过':
                                frappe.logger().info(f"⏭️  [Tab Filter] Skipping (pending tab, already approved): {shop_title}")
                                continue

                        frappe.logger().info(f"✅ [Tab Filter] Passed: {shop_title}")

                        # 🔥 第二步：应用其他过滤器（在 Tab 筛选之后再过滤）
                        # 店铺筛选（支持多选）
                        if "store_ids" in filters:
                            store_ids = filters["store_ids"]
                            if isinstance(store_ids, str):
                                store_ids = json.loads(store_ids)
                            # 只有当 store_ids 不为空且当前店铺不在列表中时才跳过
                            if store_ids and len(store_ids) > 0 and store_link_val not in store_ids:
                                frappe.logger().info(f"⏭️  [Filter] Skipping (store not in filter): {shop_title}")
                                continue
                        elif filters.get("store_id") and store_link_val != filters["store_id"]:
                            frappe.logger().info(f"⏭️  [Filter] Skipping (store mismatch): {shop_title}")
                            continue

                        # 渠道筛选
                        if filters.get("channel") and shop_channel != filters["channel"]:
                            frappe.logger().info(f"⏭️  [Filter] Skipping (channel mismatch): {shop_title}")
                            continue

                        # 提交状态筛选
                        if filters.get("status") and sub_status != filters["status"]:
                            frappe.logger().info(f"⏭️  [Filter] Skipping (status mismatch): {shop_title}")
                            continue

                        # 审批状态筛选（只在 pending tab 下生效，用于进一步细化）
                        if current_tab == 'pending' and filters.get("approval_status") and approval_stat != filters["approval_status"]:
                            frappe.logger().info(f"⏭️  [Filter] Skipping (approval_status mismatch): {shop_title}, expected={filters.get('approval_status')}, actual={approval_stat}")
                            continue

                        # 负责人筛选
                        if filters.get("user") and in_charge != filters["user"]:
                            frappe.logger().info(f"⏭️  [Filter] Skipping (user mismatch): {shop_title}")
                            continue

                        # 紧急任务筛选
                        if filters.get("is_urgent") and not is_urgent:
                            frappe.logger().info(f"⏭️  [Filter] Skipping (not urgent): {shop_title}")
                            continue

                        # 搜索过滤
                        if search_text:
                            search_lower = search_text.lower()
                            if not (search_lower in shop_title.lower() or
                                    search_lower in shop_channel.lower() or
                                    search_lower in in_charge.lower() or
                                    search_lower in plan_name.lower()):
                                frappe.logger().info(f"⏭️  [Filter] Skipping (search mismatch): {shop_title}")
                                continue

                        frappe.logger().info(f"✅ [All Filters] Including task: {shop_title}")

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

        # 🔥 添加返回数据日志
        frappe.logger().info(f"📤 [Backend] Returning data:")
        frappe.logger().info(f"📤 [Backend] stats: {stats}")
        frappe.logger().info(f"📤 [Backend] tasks count: {len(processed_tasks)}")
        frappe.logger().info(f"📤 [Backend] current_tab: {current_tab}")

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