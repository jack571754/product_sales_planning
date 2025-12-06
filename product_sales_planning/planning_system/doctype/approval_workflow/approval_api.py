"""
审批流API接口
基于Tasks Store子表的审批流程管理
"""

import frappe
from frappe import _
from frappe.utils import now_datetime


@frappe.whitelist()
def submit_for_approval(task_id, store_id, comment=None):
	"""
	提交审批申请

	Args:
		task_id: 任务ID (Schedule tasks)
		store_id: 店铺ID (Store List)
		comment: 提交说明

	Returns:
		dict: 包含状态和消息的字典
	"""
	try:
		# 获取Tasks Store记录
		tasks_store = get_tasks_store_record(task_id, store_id)
		if not tasks_store:
			return {
				"status": "error",
				"message": _("未找到对应的任务店铺记录")
			}

		# 检查是否已提交（但允许退回后重新提交）
		if tasks_store.status == "已提交" and tasks_store.approval_status != "已驳回":
			return {
				"status": "error",
				"message": _("该任务已提交，无需重复提交")
			}

		# 检查是否有商品计划数据
		commodity_count = frappe.db.count("Commodity Schedule", {
			"task_id": task_id,
			"store_id": store_id
		})

		if commodity_count == 0:
			return {
				"status": "error",
				"message": _("请先添加商品计划数据再提交审批")
			}

		# 获取适用的审批流程
		workflow = get_applicable_workflow(task_id, store_id)
		if not workflow:
			return {
				"status": "error",
				"message": _("未找到适用的审批流程配置，请联系管理员")
			}

		# 检查是否是重新提交（退回后）
		is_resubmit = tasks_store.approval_status == "已驳回" and tasks_store.current_approval_step > 0

		# 更新Tasks Store状态
		parent_doc = frappe.get_doc("Schedule tasks", task_id)
		for item in parent_doc.set_store:
			if item.store_name == store_id:
				if is_resubmit:
					# 重新提交：保持当前审批步骤，只更新状态
					item.approval_status = "待审批"
					item.can_edit = 0
					item.rejection_reason = None
					# 保持 current_approval_step 不变
					# 获取当前步骤的审批人
					current_step_obj = workflow.approval_steps[item.current_approval_step - 1]
					item.current_approver = get_approver_for_role(
						current_step_obj.approver_role,
						store_id=store_id,
						workflow_step=current_step_obj
					)
				else:
					# 首次提交：从第一级开始
					item.status = "已提交"
					item.approval_status = "待审批"
					item.current_approval_step = 1
					item.workflow_id = workflow.name
					item.submitted_by = frappe.session.user
					item.sub_time = now_datetime()
					item.can_edit = 0
					item.rejection_reason = None
					# 获取第一级审批人
					first_step = workflow.approval_steps[0]
					item.current_approver = get_approver_for_role(
						first_step.approver_role,
						store_id=store_id,
						workflow_step=first_step
					)
				break

		parent_doc.save(ignore_permissions=True)
		frappe.db.commit()

		# 创建审批历史记录
		create_approval_history(
			task_id=task_id,
			store_id=store_id,
			approval_step=0,
			action="提交",
			comments=comment or "提交审批"
		)

		return {
			"status": "success",
			"message": _("审批申请已提交"),
			"workflow_id": workflow.name,
			"next_approver_role": first_step.approver_role
		}

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(title="提交审批失败", message=str(e))
		return {
			"status": "error",
			"message": str(e)
		}


@frappe.whitelist()
def approve_task_store(task_id, store_id, action, comments=None):
	"""
	审批操作

	Args:
		task_id: 任务ID
		store_id: 店铺ID
		action: 操作类型 ("approve" | "reject_to_previous" | "reject_to_submitter")
		comments: 审批意见/退回原因

	Returns:
		dict: 包含状态和消息的字典
	"""
	try:
		# 获取Tasks Store记录
		tasks_store = get_tasks_store_record(task_id, store_id)
		if not tasks_store:
			return {
				"status": "error",
				"message": _("未找到对应的任务店铺记录")
			}

		# 检查审批状态
		if tasks_store.approval_status != "待审批":
			return {
				"status": "error",
				"message": _("该任务当前状态不允许审批操作")
			}

		# 获取审批流程
		workflow = frappe.get_doc("Approval Workflow", tasks_store.workflow_id)

		# 验证审批权限
		if not can_approve(tasks_store, workflow):
			return {
				"status": "error",
				"message": _("您没有权限审批此任务")
			}

		current_step = tasks_store.current_approval_step
		parent_doc = frappe.get_doc("Schedule tasks", task_id)

		# 找到对应的Tasks Store记录
		target_item = None
		for item in parent_doc.set_store:
			if item.store_name == store_id:
				target_item = item
				break

		if not target_item:
			return {"status": "error", "message": _("未找到对应记录")}

		# 根据操作类型处理
		if action == "approve":
			# 通过审批
			max_step = len(workflow.approval_steps)

			if current_step < max_step:
				# 进入下一级审批
				target_item.current_approval_step = current_step + 1
				next_step = workflow.approval_steps[current_step]  # 索引从0开始
				target_item.current_approver = get_approver_for_role(
					next_step.approver_role,
					store_id=store_id,
					workflow_step=next_step
				)
				message = _("审批通过，已转至下一级审批")
			else:
				# 最后一级审批，完成审批
				target_item.approval_status = "已通过"
				target_item.approval_time = now_datetime()
				target_item.current_approver = None
				message = _("审批流程已全部通过")

			action_text = "通过"

		elif action == "reject_to_previous":
			# 退回上一级
			if current_step <= 1:
				return {
					"status": "error",
					"message": _("已是第一级，无法退回上一级")
				}

			target_item.current_approval_step = current_step - 1
			prev_step = workflow.approval_steps[current_step - 2]  # 索引从0开始
			target_item.current_approver = get_approver_for_role(
				prev_step.approver_role,
				store_id=store_id,
				workflow_step=prev_step
			)
			target_item.approval_status = "已驳回"
			target_item.can_edit = 1
			target_item.rejection_reason = comments or "退回上一级"
			action_text = "退回上级"
			message = _("已退回上一级审批")

		elif action == "reject_to_submitter":
			# 退回提交人
			target_item.current_approval_step = 0
			target_item.approval_status = "已驳回"
			target_item.can_edit = 1
			target_item.rejection_reason = comments or "退回提交人"
			target_item.current_approver = None
			action_text = "退回提交人"
			message = _("已退回提交人")

		else:
			return {
				"status": "error",
				"message": _("无效的操作类型")
			}

		parent_doc.save(ignore_permissions=True)
		frappe.db.commit()

		# 创建审批历史记录
		create_approval_history(
			task_id=task_id,
			store_id=store_id,
			approval_step=current_step,
			action=action_text,
			comments=comments or ""
		)

		return {
			"status": "success",
			"message": message
		}

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(title="审批操作失败", message=str(e))
		return {
			"status": "error",
			"message": str(e)
		}


@frappe.whitelist()
def withdraw_approval(task_id, store_id, comment=None):
	"""
	撤回审批申请

	Args:
		task_id: 任务ID
		store_id: 店铺ID
		comment: 撤回说明

	Returns:
		dict: 包含状态和消息的字典
	"""
	try:
		# 获取Tasks Store记录
		tasks_store = get_tasks_store_record(task_id, store_id)
		if not tasks_store:
			return {
				"status": "error",
				"message": _("未找到对应的任务店铺记录")
			}

		# 检查是否已提交
		if tasks_store.status != "已提交":
			return {
				"status": "error",
				"message": _("该任务未提交，无法撤回")
			}

		# 检查是否已完成审批
		if tasks_store.approval_status == "已通过":
			return {
				"status": "error",
				"message": _("审批已完成，无法撤回")
			}

		# 检查是否是提交人
		current_user = frappe.session.user
		if tasks_store.submitted_by != current_user and "System Manager" not in frappe.get_roles(current_user):
			return {
				"status": "error",
				"message": _("只有提交人可以撤回审批")
			}

		# 更新Tasks Store状态
		parent_doc = frappe.get_doc("Schedule tasks", task_id)
		for item in parent_doc.set_store:
			if item.store_name == store_id:
				item.status = "未开始"
				item.approval_status = None
				item.current_approval_step = 0
				item.can_edit = 1
				item.rejection_reason = None
				item.current_approver = None
				item.workflow_id = None
				item.submitted_by = None
				item.sub_time = None
				break

		parent_doc.save(ignore_permissions=True)
		frappe.db.commit()

		# 创建审批历史记录
		create_approval_history(
			task_id=task_id,
			store_id=store_id,
			approval_step=tasks_store.current_approval_step,
			action="撤回",
			comments=comment or "撤回审批"
		)

		return {
			"status": "success",
			"message": _("审批已撤回")
		}

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(title="撤回审批失败", message=str(e))
		return {
			"status": "error",
			"message": str(e)
		}


@frappe.whitelist()
def get_approval_history(task_id, store_id):
	"""
	获取审批历史记录

	Args:
		task_id: 任务ID
		store_id: 店铺ID

	Returns:
		dict: 审批历史列表
	"""
	try:
		history = frappe.get_all(
			"Approval History",
			filters={
				"task_id": task_id,
				"store_id": store_id
			},
			fields=["*"],
			order_by="action_time asc"
		)

		return {
			"status": "success",
			"data": history
		}

	except Exception as e:
		frappe.log_error(title="获取审批历史失败", message=str(e))
		return {
			"status": "error",
			"message": str(e)
		}


@frappe.whitelist()
def get_workflow_for_task_store(task_id, store_id):
	"""
	获取适用的审批流程

	Args:
		task_id: 任务ID
		store_id: 店铺ID

	Returns:
		dict: 审批流程信息
	"""
	try:
		workflow = get_applicable_workflow(task_id, store_id)

		if not workflow:
			return {
				"status": "success",
				"has_workflow": False
			}

		# 获取Tasks Store当前状态
		tasks_store = get_tasks_store_record(task_id, store_id)

		return {
			"status": "success",
			"has_workflow": True,
			"workflow": {
				"name": workflow.name,
				"workflow_name": workflow.workflow_name,
				"steps": [
					{
						"step_order": step.step_order,
						"step_name": step.step_name,
						"approver_role": step.approver_role,
						"is_final": step.is_final
					}
					for step in workflow.approval_steps
				]
			},
			"current_state": {
				"status": tasks_store.status if tasks_store else "未开始",
				"approval_status": tasks_store.approval_status if tasks_store else None,
				"current_step": tasks_store.current_approval_step if tasks_store else 0,
				"can_edit": tasks_store.can_edit if tasks_store else 1,
				"rejection_reason": tasks_store.rejection_reason if tasks_store else None
			}
		}

	except Exception as e:
		frappe.log_error(title="获取审批流程失败", message=str(e))
		return {
			"status": "error",
			"message": str(e)
		}


@frappe.whitelist()
def check_can_edit(task_id, store_id):
	"""
	检查是否可以编辑

	Args:
		task_id: 任务ID
		store_id: 店铺ID

	Returns:
		dict: 是否可编辑
	"""
	try:
		tasks_store = get_tasks_store_record(task_id, store_id)

		if not tasks_store:
			return {
				"status": "success",
				"can_edit": True,
				"reason": "新建任务"
			}

		# 检查用户权限
		current_user = frappe.session.user
		store_doc = frappe.get_doc("Store List", store_id)

		# 只有店铺负责人可以编辑
		if store_doc.user1 != current_user and "System Manager" not in frappe.get_roles(current_user):
			return {
				"status": "success",
				"can_edit": False,
				"reason": "只有店铺负责人可以编辑"
			}

		# 检查审批状态
		if tasks_store.status == "已提交" and not tasks_store.can_edit:
			return {
				"status": "success",
				"can_edit": False,
				"reason": "任务正在审批中，无法编辑"
			}

		return {
			"status": "success",
			"can_edit": True,
			"reason": ""
		}

	except Exception as e:
		frappe.log_error(title="检查编辑权限失败", message=str(e))
		return {
			"status": "error",
			"message": str(e)
		}


# ========== 辅助函数 ==========

def get_tasks_store_record(task_id, store_id):
	"""
	获取Tasks Store记录

	Args:
		task_id: 任务ID
		store_id: 店铺ID

	Returns:
		Tasks Store记录对象或None
	"""
	try:
		parent_doc = frappe.get_doc("Schedule tasks", task_id)
		for item in parent_doc.set_store:
			if item.store_name == store_id:
				return item
		return None
	except Exception:
		return None


def get_applicable_workflow(task_id, store_id):
	"""
	获取适用的审批流程

	Args:
		task_id: 任务ID
		store_id: 店铺ID

	Returns:
		Approval Workflow文档或None
	"""
	try:
		# 获取任务类型
		task = frappe.get_doc("Schedule tasks", task_id)
		task_type = task.type

		# 获取店铺类型
		store = frappe.get_doc("Store List", store_id)
		store_type = store.shop_type if hasattr(store, 'shop_type') else None

		# 优先匹配具体类型的流程
		if store_type:
			workflow_name = frappe.db.get_value(
				"Approval Workflow",
				{
					"task_type": task_type,
					"store_type": store_type,
					"is_active": 1
				},
				"name"
			)
			if workflow_name:
				return frappe.get_doc("Approval Workflow", workflow_name)

		# 匹配默认流程
		workflow_name = frappe.db.get_value(
			"Approval Workflow",
			{
				"task_type": task_type,
				"is_default": 1,
				"is_active": 1
			},
			"name"
		)

		if workflow_name:
			return frappe.get_doc("Approval Workflow", workflow_name)

		return None

	except Exception as e:
		frappe.log_error(title="获取审批流程失败", message=str(e))
		return None


def can_approve(tasks_store, workflow, store_id=None):
	"""
	检查当前用户是否可以审批

	Args:
		tasks_store: Tasks Store记录
		workflow: Approval Workflow文档
		store_id: 店铺ID（可选）

	Returns:
		bool: 是否可以审批
	"""
	current_user = frappe.session.user

	# 系统管理员可以审批所有流程
	if "System Manager" in frappe.get_roles(current_user):
		return True

	# 获取当前步骤的审批角色
	current_step_index = tasks_store.current_approval_step - 1
	if current_step_index < 0 or current_step_index >= len(workflow.approval_steps):
		return False

	current_step = workflow.approval_steps[current_step_index]
	required_role = current_step.approver_role

	# 检查用户是否有该角色
	user_roles = frappe.get_roles(current_user)
	if required_role not in user_roles:
		return False

	# 如果使用店铺范围分配，需要验证用户是否负责该店铺
	if current_step.approver_type == "基于店铺范围分配" and store_id:
		assigned_approver = get_approver_by_store_assignment(required_role, store_id)
		if assigned_approver and assigned_approver != current_user:
			return False

	return True


def get_approver_for_role(role, store_id=None, workflow_step=None):
	"""
	获取指定角色的审批人

	Args:
		role: 角色名称
		store_id: 店铺ID（可选）
		workflow_step: 审批步骤对象（可选）

	Returns:
		用户名或None
	"""
	try:
		# 1. 优先使用店铺范围分配
		if store_id and workflow_step and workflow_step.approver_type == "基于店铺范围分配":
			approver = get_approver_by_store_assignment(role, store_id)
			if approver:
				return approver

		# 2. 基于店铺属性
		if store_id and workflow_step and workflow_step.approver_type == "基于店铺属性":
			store_field = workflow_step.store_field
			if store_field:
				store = frappe.get_doc("Store List", store_id)
				if hasattr(store, store_field) and getattr(store, store_field):
					return getattr(store, store_field)

		# 3. 基于角色（默认）
		users = frappe.get_all(
			"Has Role",
			filters={"role": role, "parenttype": "User"},
			fields=["parent"],
			limit=1
		)
		if users:
			return users[0].parent

		return None

	except Exception as e:
		frappe.log_error(title="获取审批人失败", message=str(e))
		return None


def get_approver_by_store_assignment(role, store_id):
	"""
	根据店铺范围分配获取审批人

	Args:
		role: 审批角色
		store_id: 店铺ID

	Returns:
		用户名或None
	"""
	try:
		# 查找负责该店铺的审批人
		result = frappe.db.sql(
			"""
			SELECT asa.approver
			FROM `tabApprover Store Assignment` asa
			INNER JOIN `tabApprover Store Assignment Item` asai
				ON asai.parent = asa.name
			WHERE asa.approver_role = %s
			AND asa.is_active = 1
			AND asai.store_id = %s
			LIMIT 1
		""",
			(role, store_id),
			as_dict=True,
		)

		if result:
			return result[0].approver

		return None

	except Exception as e:
		frappe.log_error(title="查找店铺审批人失败", message=str(e))
		return None


def create_approval_history(task_id, store_id, approval_step, action, comments):
	"""
	创建审批历史记录

	Args:
		task_id: 任务ID
		store_id: 店铺ID
		approval_step: 审批步骤
		action: 操作类型
		comments: 审批意见
	"""
	try:
		# 获取Tasks Store的name
		tasks_store = get_tasks_store_record(task_id, store_id)
		reference_name = tasks_store.name if tasks_store else ""

		history = frappe.get_doc({
			"doctype": "Approval History",
			"reference_doctype": "Tasks Store",
			"reference_name": reference_name,
			"store_id": store_id,
			"task_id": task_id,
			"approval_step": approval_step,
			"approver": frappe.session.user,
			"action": action,
			"comments": comments,
			"action_time": now_datetime()
		})

		history.insert(ignore_permissions=True)
		frappe.db.commit()

	except Exception as e:
		frappe.log_error(title="创建审批历史失败", message=str(e))
