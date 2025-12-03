# Copyright (c) 2025, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


class ApproverStoreAssignment(Document):
	def validate(self):
		"""验证审批人店铺分配"""
		# 验证审批人是否拥有指定的审批角色
		if self.approver and self.approver_role:
			user_roles = frappe.get_roles(self.approver)
			if self.approver_role not in user_roles:
				frappe.throw(
					_("用户 {0} 没有角色 {1}").format(self.approver, self.approver_role)
				)

		# 自动填充店铺名称
		for item in self.stores:
			if item.store_id:
				store = frappe.get_doc("Store List", item.store_id)
				item.store_name = store.shop_name

		# 检查店铺是否重复分配（同一审批步骤）
		self.check_duplicate_assignment()

	def check_duplicate_assignment(self):
		"""检查店铺是否已被其他审批人分配"""
		for item in self.stores:
			existing = frappe.db.sql(
				"""
				SELECT parent, approver
				FROM `tabApprover Store Assignment Item`
				WHERE store_id = %s
				AND parent != %s
				AND parenttype = 'Approver Store Assignment'
				AND EXISTS (
					SELECT 1 FROM `tabApprover Store Assignment`
					WHERE name = parent
					AND approver_role = %s
					AND is_active = 1
				)
			""",
				(item.store_id, self.name, self.approver_role),
			)

			if existing:
				frappe.msgprint(
					_("警告：店铺 {0} 已被审批人 {1} 分配").format(
						item.store_id, existing[0][1]
					),
					indicator="orange",
				)
