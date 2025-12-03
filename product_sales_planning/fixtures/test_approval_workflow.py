"""
审批流程功能测试脚本

使用方法:
bench --site mysite.local execute product_sales_planning.fixtures.test_approval_workflow.run_all_tests
"""

import frappe
from frappe.utils import now_datetime


def run_all_tests():
	"""运行所有测试"""
	print("\n" + "="*60)
	print("开始审批流程功能测试")
	print("="*60 + "\n")

	try:
		# 1. 测试审批流程配置
		test_workflow_configuration()

		# 2. 测试提交审批
		test_submit_approval()

		# 3. 测试审批通过
		test_approve()

		# 4. 测试退回上一级
		test_reject_to_previous()

		# 5. 测试退回提交人
		test_reject_to_submitter()

		# 6. 测试审批历史
		test_approval_history()

		print("\n" + "="*60)
		print("✅ 所有测试通过!")
		print("="*60 + "\n")

	except Exception as e:
		print(f"\n❌ 测试失败: {str(e)}")
		import traceback
		traceback.print_exc()


def test_workflow_configuration():
	"""测试审批流程配置"""
	print("📋 测试1: 审批流程配置")

	# 检查月度计划审批流程
	workflow = frappe.get_doc("Approval Workflow", {"workflow_name": "月度计划审批流程"})
	assert workflow.task_type == "MON", "任务类型应为MON"
	assert workflow.is_active == 1, "流程应为激活状态"
	assert len(workflow.approval_steps) == 2, "应有2个审批步骤"

	# 检查第一步
	step1 = workflow.approval_steps[0]
	assert step1.step_order == 1, "第一步顺序应为1"
	assert step1.approver_role == "Regional Manager", "第一步审批角色应为Regional Manager"

	# 检查第二步
	step2 = workflow.approval_steps[1]
	assert step2.step_order == 2, "第二步顺序应为2"
	assert step2.approver_role == "Director", "第二步审批角色应为Director"
	assert step2.is_final == 1, "第二步应为最终审批"

	print("✅ 审批流程配置正确\n")


def test_submit_approval():
	"""测试提交审批"""
	print("📋 测试2: 提交审批")

	# 创建测试数据
	task_id, store_id = create_test_data()

	# 提交审批
	from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import submit_for_approval

	result = submit_for_approval(task_id, store_id, "测试提交")

	assert result["status"] == "success", f"提交应成功: {result.get('message')}"
	assert "workflow_id" in result, "应返回workflow_id"

	# 验证Tasks Store状态
	tasks_store = get_tasks_store_record(task_id, store_id)
	assert tasks_store.status == "已提交", "状态应为已提交"
	assert tasks_store.approval_status == "待审批", "审批状态应为待审批"
	assert tasks_store.current_approval_step == 1, "当前步骤应为1"
	assert tasks_store.can_edit == 0, "不应允许编辑"

	print(f"✅ 提交审批成功 (任务: {task_id}, 店铺: {store_id})\n")

	return task_id, store_id


def test_approve():
	"""测试审批通过"""
	print("📋 测试3: 审批通过")

	# 创建新的测试数据
	task_id, store_id = create_test_data()

	# 提交审批
	from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import (
		submit_for_approval,
		approve_task_store
	)

	submit_for_approval(task_id, store_id, "测试提交")

	# 第一级审批通过
	frappe.set_user("regional.manager@test.com")
	result = approve_task_store(task_id, store_id, "approve", "第一级审批通过")
	frappe.set_user("Administrator")

	assert result["status"] == "success", f"第一级审批应成功: {result.get('message')}"

	# 验证状态
	tasks_store = get_tasks_store_record(task_id, store_id)
	assert tasks_store.current_approval_step == 2, "应进入第二级审批"
	assert tasks_store.approval_status == "待审批", "审批状态应仍为待审批"

	# 第二级审批通过
	frappe.set_user("director@test.com")
	result = approve_task_store(task_id, store_id, "approve", "第二级审批通过")
	frappe.set_user("Administrator")

	assert result["status"] == "success", f"第二级审批应成功: {result.get('message')}"

	# 验证最终状态
	tasks_store = get_tasks_store_record(task_id, store_id)
	assert tasks_store.approval_status == "已通过", "审批状态应为已通过"
	assert tasks_store.approval_time is not None, "应有审批完成时间"

	print(f"✅ 审批通过测试成功\n")


def test_reject_to_previous():
	"""测试退回上一级"""
	print("📋 测试4: 退回上一级")

	# 创建新的测试数据
	task_id, store_id = create_test_data()

	# 提交审批
	from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import (
		submit_for_approval,
		approve_task_store
	)

	submit_for_approval(task_id, store_id, "测试提交")

	# 第一级审批通过
	frappe.set_user("regional.manager@test.com")
	approve_task_store(task_id, store_id, "approve", "第一级审批通过")
	frappe.set_user("Administrator")

	# 第二级退回上一级
	frappe.set_user("director@test.com")
	result = approve_task_store(task_id, store_id, "reject_to_previous", "需要修改数据")
	frappe.set_user("Administrator")

	assert result["status"] == "success", f"退回应成功: {result.get('message')}"

	# 验证状态
	tasks_store = get_tasks_store_record(task_id, store_id)
	assert tasks_store.current_approval_step == 1, "应退回到第一级"
	assert tasks_store.approval_status == "已驳回", "审批状态应为已驳回"
	assert tasks_store.can_edit == 1, "应允许编辑"
	assert tasks_store.rejection_reason == "需要修改数据", "应记录退回原因"

	print(f"✅ 退回上一级测试成功\n")


def test_reject_to_submitter():
	"""测试退回提交人"""
	print("📋 测试5: 退回提交人")

	# 创建新的测试数据
	task_id, store_id = create_test_data()

	# 提交审批
	from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import (
		submit_for_approval,
		approve_task_store
	)

	submit_for_approval(task_id, store_id, "测试提交")

	# 第一级直接退回提交人
	frappe.set_user("regional.manager@test.com")
	result = approve_task_store(task_id, store_id, "reject_to_submitter", "数据有误，请重新填写")
	frappe.set_user("Administrator")

	assert result["status"] == "success", f"退回应成功: {result.get('message')}"

	# 验证状态
	tasks_store = get_tasks_store_record(task_id, store_id)
	assert tasks_store.current_approval_step == 0, "应退回到提交人"
	assert tasks_store.approval_status == "已驳回", "审批状态应为已驳回"
	assert tasks_store.can_edit == 1, "应允许编辑"
	assert tasks_store.rejection_reason == "数据有误，请重新填写", "应记录退回原因"

	print(f"✅ 退回提交人测试成功\n")


def test_approval_history():
	"""测试审批历史"""
	print("📋 测试6: 审批历史")

	# 创建新的测试数据
	task_id, store_id = create_test_data()

	# 提交审批
	from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import (
		submit_for_approval,
		approve_task_store,
		get_approval_history
	)

	submit_for_approval(task_id, store_id, "测试提交")

	# 第一级审批通过
	frappe.set_user("regional.manager@test.com")
	approve_task_store(task_id, store_id, "approve", "第一级审批通过")
	frappe.set_user("Administrator")

	# 获取审批历史
	result = get_approval_history(task_id, store_id)

	assert result["status"] == "success", "获取审批历史应成功"
	assert len(result["data"]) >= 2, "应至少有2条历史记录（提交+审批）"

	# 验证历史记录内容
	history = result["data"]
	submit_record = history[0]
	assert submit_record["action"] == "提交", "第一条应为提交记录"

	approve_record = history[1]
	assert approve_record["action"] == "通过", "第二条应为通过记录"
	assert approve_record["approval_step"] == 1, "审批步骤应为1"

	print(f"✅ 审批历史测试成功 (共{len(history)}条记录)\n")


# ========== 辅助函数 ==========

def create_test_data():
	"""创建测试数据"""

	# 创建测试任务
	task = frappe.get_doc({
		"doctype": "Schedule tasks",
		"type": "MON",
		"start_date": now_datetime(),
		"end_date": now_datetime(),
		"status": "开启中"
	})
	task.insert(ignore_permissions=True)

	# 创建测试店铺（如果不存在）
	store_id = "TEST_STORE_001"
	if not frappe.db.exists("Store List", store_id):
		store = frappe.get_doc({
			"doctype": "Store List",
			"id": store_id,
			"shop_name": "测试店铺001",
			"channel": "线上",
			"shop_type": "直营店",
			"user1": "store.manager@test.com"
		})
		store.insert(ignore_permissions=True)

	# 添加店铺到任务
	task.append("set_store", {
		"store_name": store_id,
		"user": "store.manager@test.com",
		"status": "未开始",
		"approval_status": "待审批"
	})
	task.save(ignore_permissions=True)

	# 创建测试商品（如果不存在）
	product_code = "TEST_PRODUCT_001"
	if not frappe.db.exists("Product List", product_code):
		product = frappe.get_doc({
			"doctype": "Product List",
			"name": product_code,
			"name1": "测试商品001",
			"specifications": "测试规格",
			"brand": "测试品牌",
			"category": "测试类别"
		})
		product.insert(ignore_permissions=True)

	# 创建测试商品计划数据
	commodity = frappe.get_doc({
		"doctype": "Commodity Schedule",
		"store_id": store_id,
		"task_id": task.name,
		"code": product_code,
		"quantity": 100,
		"sub_date": now_datetime()
	})
	commodity.insert(ignore_permissions=True)

	frappe.db.commit()

	return task.name, store_id


def get_tasks_store_record(task_id, store_id):
	"""获取Tasks Store记录"""
	parent_doc = frappe.get_doc("Schedule tasks", task_id)
	for item in parent_doc.set_store:
		if item.store_name == store_id:
			return item
	return None


if __name__ == "__main__":
	run_all_tests()
