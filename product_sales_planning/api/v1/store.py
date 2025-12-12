"""
Store API
店铺相关API接口
"""

import frappe
from product_sales_planning.utils.response_utils import success_response, error_response


@frappe.whitelist()
def get_filter_options():
	"""获取筛选器选项"""
	try:
		tasks = frappe.get_all(
			"Schedule tasks",
			fields=["name"],
			order_by="creation desc"
		)

		stores = frappe.get_all(
			"Store List",
			fields=["name", "shop_name"],
			order_by="shop_name asc"
		)

		return success_response(data={
			"stores": stores,
			"tasks": tasks
		})

	except Exception as e:
		frappe.log_error(title="获取筛选器选项失败", message=str(e))
		return error_response(message=str(e))


@frappe.whitelist()
def get_tasks_store_status(task_id, store_id):
	"""获取任务店铺状态信息"""
	try:
		# 获取Tasks Store记录
		tasks_store = frappe.db.get_value("Tasks Store", {
			"parent": task_id,
			"store_name": store_id
		}, ["name", "status", "approval_status", "current_approval_step", "can_edit", 
			"rejection_reason", "submitted_by", "current_approver", "workflow_id"], as_dict=True)

		if not tasks_store:
			return error_response(message="未找到对应的任务店铺记录")

		# 检查当前用户是否是当前审批人
		current_user = frappe.session.user
		is_current_approver = tasks_store.get("current_approver") == current_user

		# 检查是否可以撤回（仅限提交人且在待审批状态）
		can_withdraw = (
			tasks_store.get("submitted_by") == current_user and 
			tasks_store.get("approval_status") == "待审批"
		)

		# 添加计算字段
		tasks_store["is_current_approver"] = 1 if is_current_approver else 0
		tasks_store["can_withdraw"] = 1 if can_withdraw else 0

		return success_response(data=tasks_store)

	except Exception as e:
		frappe.log_error(title="获取任务店铺状态失败", message=str(e))
		return error_response(message=str(e))