"""
测试审批人店铺范围分配功能

使用方法:
bench --site [site_name] execute product_sales_planning.fixtures.test_store_assignment.run_all_tests
"""

import frappe
from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import (
	get_approver_by_store_assignment,
	get_approver_for_role
)


def run_all_tests():
	"""运行所有测试"""
	print("\n" + "="*60)
	print("开始测试审批人店铺范围分配功能")
	print("="*60 + "\n")

	try:
		test_get_approver_by_store()
		test_get_approver_for_role_with_store_assignment()
		test_store_assignment_validation()

		print("\n" + "="*60)
		print("✅ 所有测试完成!")
		print("="*60 + "\n")
	except Exception as e:
		print("\n" + "="*60)
		print(f"❌ 测试失败: {str(e)}")
		print("="*60 + "\n")
		frappe.log_error(title="测试失败", message=str(e))


def test_get_approver_by_store():
	"""测试根据店铺获取审批人"""
	print("测试1: 根据店铺获取审批人")
	print("-" * 60)

	# 获取实际存在的店铺分配
	assignments = frappe.get_all(
		"Approver Store Assignment",
		filters={"is_active": 1},
		fields=["name", "approver", "approver_role"],
		limit=2
	)

	if not assignments:
		print("⚠️  未找到审批人店铺分配记录,跳过测试")
		return

	for assignment in assignments:
		# 获取该分配的第一个店铺
		store_items = frappe.get_all(
			"Approver Store Assignment Item",
			filters={"parent": assignment.name},
			fields=["store_id"],
			limit=1
		)

		if store_items:
			store_id = store_items[0].store_id
			approver = get_approver_by_store_assignment(assignment.approver_role, store_id)
			print(f"店铺 {store_id} 的审批人: {approver}")

			if approver == assignment.approver:
				print(f"✅ 测试通过: 店铺 {store_id} 正确分配给 {approver}")
			else:
				print(f"❌ 测试失败: 期望 {assignment.approver}, 实际 {approver}")
		else:
			print(f"⚠️  分配 {assignment.name} 没有店铺")

	print()


def test_get_approver_for_role_with_store_assignment():
	"""测试带店铺范围分配的审批人查找"""
	print("测试2: 带店铺范围分配的审批人查找")
	print("-" * 60)

	# 获取一个启用的审批流程
	workflows = frappe.get_all(
		"Approval Workflow",
		filters={"is_active": 1},
		fields=["name"],
		limit=1
	)

	if not workflows:
		print("⚠️  未找到启用的审批流程,跳过测试")
		return

	workflow = frappe.get_doc("Approval Workflow", workflows[0].name)

	# 测试每个审批步骤
	for step in workflow.approval_steps:
		print(f"\n测试步骤: {step.step_name} (类型: {step.approver_type})")

		if step.approver_type == "基于店铺范围分配":
			# 获取一个有分配的店铺
			store_items = frappe.get_all(
				"Approver Store Assignment Item",
				filters={
					"parenttype": "Approver Store Assignment"
				},
				fields=["store_id", "parent"],
				limit=1
			)

			if store_items:
				store_id = store_items[0].store_id
				assignment = frappe.get_doc("Approver Store Assignment", store_items[0].parent)

				approver = get_approver_for_role(
					step.approver_role,
					store_id=store_id,
					workflow_step=step
				)

				print(f"  店铺: {store_id}")
				print(f"  审批角色: {step.approver_role}")
				print(f"  找到的审批人: {approver}")

				if approver:
					print(f"  ✅ 成功找到审批人")
				else:
					print(f"  ❌ 未找到审批人")
			else:
				print("  ⚠️  未找到店铺分配")
		else:
			print(f"  ⏭️  跳过非店铺范围分配类型")

	print()


def test_store_assignment_validation():
	"""测试店铺分配验证逻辑"""
	print("测试3: 店铺分配验证逻辑")
	print("-" * 60)

	# 获取所有启用的分配
	assignments = frappe.get_all(
		"Approver Store Assignment",
		filters={"is_active": 1},
		fields=["name", "approver", "approver_role"]
	)

	print(f"找到 {len(assignments)} 个启用的审批人分配")

	for assignment in assignments:
		# 验证审批人是否有对应角色
		user_roles = frappe.get_roles(assignment.approver)

		if assignment.approver_role in user_roles:
			print(f"✅ {assignment.approver} 拥有角色 {assignment.approver_role}")
		else:
			print(f"❌ {assignment.approver} 缺少角色 {assignment.approver_role}")

		# 统计负责的店铺数量
		store_count = frappe.db.count(
			"Approver Store Assignment Item",
			{"parent": assignment.name}
		)
		print(f"   负责店铺数量: {store_count}")

	print()


def test_duplicate_assignment_check():
	"""测试重复分配检查"""
	print("测试4: 重复分配检查")
	print("-" * 60)

	# 检查是否有店铺被多个审批人分配
	duplicates = frappe.db.sql("""
		SELECT
			asai.store_id,
			GROUP_CONCAT(asa.approver) as approvers,
			COUNT(*) as count
		FROM `tabApprover Store Assignment Item` asai
		INNER JOIN `tabApprover Store Assignment` asa
			ON asai.parent = asa.name
		WHERE asa.is_active = 1
		GROUP BY asai.store_id
		HAVING count > 1
	""", as_dict=True)

	if duplicates:
		print(f"⚠️  发现 {len(duplicates)} 个店铺被多个审批人分配:")
		for dup in duplicates:
			print(f"   店铺 {dup.store_id}: {dup.approvers}")
	else:
		print("✅ 没有发现重复分配")

	print()


if __name__ == "__main__":
	run_all_tests()
