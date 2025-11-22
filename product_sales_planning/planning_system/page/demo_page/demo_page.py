import frappe
from frappe.utils import getdate, today, date_diff, format_datetime

@frappe.whitelist()
def get_dashboard_data():
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

    processed_tasks = []
    current_date = getdate(today())

    # 3. 遍历并拆箱
    for p in parents:
        # 这是一个性能敏感点，如果数据量大，建议改用 SQL Join，但目前保持 ORM 逻辑以通过测试
        doc = frappe.get_doc("Schedule tasks", p.name)
        
        type_map = {"MON": "月度常规计划", "PRO": "专项促销活动"}
        plan_name = type_map.get(p.type, p.type)
        
        is_urgent = False
        if p.end_date:
            # 剩余天数小于等于3天视为紧急
            if date_diff(p.end_date, current_date) <= 3:
                is_urgent = True

        # 4. 遍历子表 (Tasks Store)
        if doc.set_store:
            for item in doc.set_store:
                # store_name 是 Link 字段，存储的是 ID (Store List 的 name)
                store_link_val = item.store_name 
                if not store_link_val: continue
                
                # 获取店铺详细信息 (中文名, 渠道)
                # 优化: 可以在循环外批量获取，但目前先保持逻辑清晰
                shop_info = frappe.db.get_value("Store List", store_link_val, ["shop_name", "channel"], as_dict=True)
                shop_title = shop_info.shop_name if shop_info else store_link_val
                shop_channel = shop_info.channel if shop_info else "未知渠道"

                # --- 字段获取修正 ---
                
                # 1. 负责人 (字段名: user)
                in_charge = item.user or "待分配"
                
                # 2. 状态字段 (字段名: status, approval_status)
                sub_status = item.status or "未开始"
                approval_stat = item.approval_status or "-"

                # 3. 提交时间 (字段名: sub_time, 修正之前的中文key错误)
                submit_time_str = ""
                if item.sub_time:
                    submit_time_str = format_datetime(item.sub_time, "MM-dd HH:mm")

                processed_tasks.append({
                    "parent_id": p.name,        # 父单号，用于跳转
                    "row_id": item.name,        # 子表行ID (可选)
                    "store_id": store_link_val, 
                    "title": shop_title,
                    "channel": shop_channel,
                    "plan_type": plan_name,
                    "deadline": format_datetime(p.end_date, "yyyy-MM-dd") if p.end_date else "无截止",
                    
                    # 前端展示核心字段
                    "user": in_charge,
                    "child_status": sub_status,       # 提交状态
                    "approval_status": approval_stat, # 审批状态
                    "submit_time": submit_time_str,   # 格式化后的时间
                    
                    "is_urgent": is_urgent
                })

    return {
        "stats": stats,
        "tasks": processed_tasks
    }