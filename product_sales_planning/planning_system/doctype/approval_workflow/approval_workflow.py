# Copyright (c) 2025, lj and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ApprovalWorkflow(Document):
	def validate(self):
		"""验证审批流程配置"""
		# 验证至少有一个审批步骤
		if not self.approval_steps:
			frappe.throw("审批流程至少需要一个审批步骤")

		# 验证步骤顺序的唯一性
		step_orders = [step.step_order for step in self.approval_steps]
		if len(step_orders) != len(set(step_orders)):
			frappe.throw("审批步骤顺序不能重复")

		# 验证至少有一个最终审批步骤
		final_steps = [step for step in self.approval_steps if step.is_final]
		if not final_steps:
			frappe.throw("至少需要一个最终审批步骤")

		# 验证最终审批步骤应该是最后一个
		max_order = max(step_orders)
		for step in self.approval_steps:
			if step.is_final and step.step_order != max_order:
				frappe.throw(f"最终审批步骤应该是最后一个步骤（步骤{step.step_order}）")
