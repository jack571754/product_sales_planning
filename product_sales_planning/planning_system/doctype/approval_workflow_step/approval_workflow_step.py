# Copyright (c) 2025, lj and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ApprovalWorkflowStep(Document):
	def validate(self):
		"""验证审批步骤配置"""
		# 如果是基于角色，必须指定角色
		if self.approver_type == "基于角色" and not self.approver_role:
			frappe.throw("基于角色的审批步骤必须指定审批人角色")

		# 如果是基于店铺属性，必须指定店铺字段
		if self.approver_type == "基于店铺属性" and not self.store_field:
			frappe.throw("基于店铺属性的审批步骤必须指定店铺字段")
