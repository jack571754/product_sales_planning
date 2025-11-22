import frappe
from frappe.utils import getdate, today, date_diff, format_datetime

@frappe.whitelist()
def get_dashboard_data():
    # 1. 基础统计 (保持不变)
    stats = {
        "ongoing": frappe.db.count("Schedule tasks", {"status": "开启中"}),
        "closed": frappe.db.count("Schedule tasks", {"status": "已结束"}),
        "types": len(frappe.db.sql("SELECT DISTINCT type FROM `tabSchedule tasks`"))
    }

    # 2. 获取父任务
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
        doc = frappe.get_doc("Schedule tasks", p.name)
        
        type_map = {"MON": "月度常规计划", "PRO": "专项促销活动"}
        plan_name = type_map.get(p.type, p.type)
        
        is_urgent = False
        if p.end_date:
            if date_diff(p.end_date, current_date) <= 3:
                is_urgent = True

        # 4. 遍历子表 set_store
        if doc.set_store:
            for item in doc.set_store:
                # 获取基础信息
                store_link_val = item.store_name 
                if not store_link_val: continue
                
                # 获取店铺中文名和渠道
                shop_info = frappe.db.get_value("Store List", store_link_val, ["shop_name", "channel"], as_dict=True)
                shop_title = shop_info.shop_name if shop_info else store_link_val
                shop_channel = shop_info.channel if shop_info else ""

                # --- 获取新字段 ---
                # 1. 负责人
                in_charge = item.user or "未分配"
                
                # 2. 子表状态 (提交状态 & 审批状态)
                # 如果子表没有状态，显示“未开始”
                sub_status = item.status or "未开始"
                approval_stat = item.approval_status or ""

                # 3. 提交时间 (处理中文变量名)
                # 使用 getattr 安全获取中文命名的字段值
                submit_time_raw = getattr(item, "提交日期时间", None)
                submit_time_str = format_datetime(submit_time_raw, "MM-dd HH:mm") if submit_time_raw else ""

                processed_tasks.append({
                    "id": p.name,
                    "task_code": p.name,
                    "store_id": store_link_val,
                    "title": shop_title,
                    "channel": shop_channel,
                    "plan_type": plan_name,
                    "deadline": p.end_date,
                    
                    # 新增字段传给前端
                    "user": in_charge,
                    "child_status": sub_status,       # 店铺维度的提交状态
                    "approval_status": approval_stat, # 店铺维度的审批状态
                    "submit_time": submit_time_str,   # 提交时间
                    
                    "is_urgent": is_urgent
                })

    return {
        "stats": stats,
        "tasks": processed_tasks
    }