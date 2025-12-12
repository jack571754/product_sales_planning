"""
Approval API
审批流程相关API接口
从 approval_workflow/approval_api.py 迁移并整合
"""

import frappe
from product_sales_planning.utils.response_utils import success_response, error_response


@frappe.whitelist()
def submit_for_approval(task_id, store_id):
	"""提交审批"""
	from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import submit_for_approval as _submit
	return _submit(task_id, store_id)


@frappe.whitelist()
def approve_task_store(task_id, store_id, action, comment=None):
	"""审批任务店铺"""
	from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import approve_task_store as _approve
	return _approve(task_id, store_id, action, comment)


@frappe.whitelist()
def withdraw_approval(task_id, store_id):
	"""撤回审批"""
	from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import withdraw_approval as _withdraw
	return _withdraw(task_id, store_id)


@frappe.whitelist()
def get_approval_history(task_id, store_id):
	"""获取审批历史"""
	from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import get_approval_history as _get_history
	return _get_history(task_id, store_id)


@frappe.whitelist()
def get_workflow_for_task_store(task_id, store_id):
	"""获取任务店铺的工作流信息"""
	from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import get_workflow_for_task_store as _get_workflow
	return _get_workflow(task_id, store_id)


@frappe.whitelist()
def check_can_edit(task_id, store_id):
	"""检查是否可以编辑"""
	from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import check_can_edit as _check
	return _check(task_id, store_id)


@frappe.whitelist()
def get_approval_status(task_id, store_id):
	"""获取审批状态和流程信息"""
	try:
		from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import (
			get_workflow_for_task_store,
			get_approval_history,
			check_can_edit
		)

		workflow_info = get_workflow_for_task_store(task_id, store_id)
		history_info = get_approval_history(task_id, store_id)
		edit_info = check_can_edit(task_id, store_id)

		current_user = frappe.session.user
		user_roles = frappe.get_roles(current_user)

		can_approve = False
		if workflow_info.get("has_workflow") and workflow_info.get("current_state"):
			current_state = workflow_info["current_state"]
			if current_state.get("approval_status") == "待审批":
				current_step = current_state.get("current_step", 0)
				if current_step > 0 and workflow_info.get("workflow"):
					steps = workflow_info["workflow"].get("steps", [])
					if current_step <= len(steps):
						required_role = steps[current_step - 1].get("approver_role")
						can_approve = required_role in user_roles or "System Manager" in user_roles

		return success_response(data={
			"workflow": workflow_info,
			"history": history_info.get("data", []),
			"can_edit": edit_info.get("can_edit", True),
			"edit_reason": edit_info.get("reason", ""),
			"can_approve": can_approve,
			"user_roles": user_roles
		})

	except Exception as e:
		frappe.log_error(title="获取审批状态失败", message=str(e))
		return error_response(message=str(e))