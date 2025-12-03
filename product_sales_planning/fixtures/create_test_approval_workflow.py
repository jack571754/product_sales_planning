"""
创建测试审批流程配置

使用方法:
bench --site mysite.local execute product_sales_planning.fixtures.create_test_approval_workflow.create_test_workflows
"""

import frappe


def create_test_workflows():
	"""创建测试审批流程"""

	# 1. 创建月度计划审批流程 (MON类型)
	create_monthly_workflow()

	# 2. 创建促销活动审批流程 (PRO类型)
	create_promotion_workflow()

	frappe.db.commit()
	print("✅ 测试审批流程创建成功!")


def create_monthly_workflow():
	"""创建月度计划审批流程: 店铺负责人 → 区域经理 → 总监"""

	# 检查是否已存在
	if frappe.db.exists("Approval Workflow", {"workflow_name": "月度计划审批流程"}):
		print("⚠️  月度计划审批流程已存在，跳过创建")
		return

	workflow = frappe.get_doc({
		"doctype": "Approval Workflow",
		"workflow_name": "月度计划审批流程",
		"task_type": "MON",
		"is_active": 1,
		"is_default": 1,
		"approval_steps": [
			{
				"step_order": 1,
				"step_name": "区域经理审批",
				"approver_role": "Regional Manager",
				"approver_type": "基于角色",
				"is_final": 0,
				"can_reject_to_submitter": 1
			},
			{
				"step_order": 2,
				"step_name": "总监审批",
				"approver_role": "Director",
				"approver_type": "基于角色",
				"is_final": 1,
				"can_reject_to_submitter": 1
			}
		]
	})

	workflow.insert(ignore_permissions=True)
	print(f"✅ 创建月度计划审批流程: {workflow.name}")


def create_promotion_workflow():
	"""创建促销活动审批流程: 店铺负责人 → 总监"""

	# 检查是否已存在
	if frappe.db.exists("Approval Workflow", {"workflow_name": "促销活动审批流程"}):
		print("⚠️  促销活动审批流程已存在，跳过创建")
		return

	workflow = frappe.get_doc({
		"doctype": "Approval Workflow",
		"workflow_name": "促销活动审批流程",
		"task_type": "PRO",
		"is_active": 1,
		"is_default": 1,
		"approval_steps": [
			{
				"step_order": 1,
				"step_name": "总监审批",
				"approver_role": "Director",
				"approver_type": "基于角色",
				"is_final": 1,
				"can_reject_to_submitter": 1
			}
		]
	})

	workflow.insert(ignore_permissions=True)
	print(f"✅ 创建促销活动审批流程: {workflow.name}")


def create_test_roles():
	"""创建测试角色（如果不存在）"""

	roles = [
		{
			"role_name": "Store Manager",
			"desk_access": 1
		},
		{
			"role_name": "Regional Manager",
			"desk_access": 1
		},
		{
			"role_name": "Director",
			"desk_access": 1
		},
		{
			"role_name": "Planning Admin",
			"desk_access": 1
		}
	]

	for role_data in roles:
		if not frappe.db.exists("Role", role_data["role_name"]):
			role = frappe.get_doc({
				"doctype": "Role",
				"role_name": role_data["role_name"],
				"desk_access": role_data["desk_access"]
			})
			role.insert(ignore_permissions=True)
			print(f"✅ 创建角色: {role.role_name}")
		else:
			print(f"⚠️  角色已存在: {role_data['role_name']}")

	frappe.db.commit()


def create_test_users():
	"""创建测试用户"""

	users = [
		{
			"email": "store.manager@test.com",
			"first_name": "Store",
			"last_name": "Manager",
			"roles": ["Store Manager"]
		},
		{
			"email": "regional.manager@test.com",
			"first_name": "Regional",
			"last_name": "Manager",
			"roles": ["Regional Manager"]
		},
		{
			"email": "director@test.com",
			"first_name": "Director",
			"last_name": "User",
			"roles": ["Director"]
		}
	]

	for user_data in users:
		if not frappe.db.exists("User", user_data["email"]):
			user = frappe.get_doc({
				"doctype": "User",
				"email": user_data["email"],
				"first_name": user_data["first_name"],
				"last_name": user_data["last_name"],
				"send_welcome_email": 0,
				"roles": [{"role": role} for role in user_data["roles"]]
			})
			user.insert(ignore_permissions=True)
			print(f"✅ 创建用户: {user.email}")
		else:
			print(f"⚠️  用户已存在: {user_data['email']}")

	frappe.db.commit()


if __name__ == "__main__":
	# 如果直接运行此脚本
	create_test_roles()
	create_test_users()
	create_test_workflows()
