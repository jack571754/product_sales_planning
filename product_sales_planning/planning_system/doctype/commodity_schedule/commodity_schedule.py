# Copyright (c) 2025, lj and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _


class CommoditySchedule(Document):
	def validate(self):
		"""数据验证：在保存前执行"""
		self.validate_quantity()
		self.validate_product_exists()
		self.validate_store_exists()
		self.validate_task_exists()
		self.validate_duplicate()

	def validate_quantity(self):
		"""验证数量字段"""
		if self.quantity is None:
			self.quantity = 0

		if not isinstance(self.quantity, (int, float)):
			frappe.throw(_("数量必须是数字"))

		if self.quantity < 0:
			frappe.throw(_("数量不能为负数"))

		# 转换为整数
		self.quantity = int(self.quantity)

	def validate_product_exists(self):
		"""验证产品编码是否存在"""
		if not self.code:
			frappe.throw(_("产品编码不能为空"))

		if not frappe.db.exists("Product List", self.code):
			frappe.throw(_("产品编码 {0} 不存在于产品列表中").format(self.code))

	def validate_store_exists(self):
		"""验证店铺是否存在"""
		if not self.store_id:
			frappe.throw(_("店铺ID不能为空"))

		if not frappe.db.exists("Store List", self.store_id):
			frappe.throw(_("店铺 {0} 不存在").format(self.store_id))

	def validate_task_exists(self):
		"""验证任务是否存在"""
		if self.task_id and not frappe.db.exists("Schedule tasks", self.task_id):
			frappe.throw(_("计划任务 {0} 不存在").format(self.task_id))

	def validate_duplicate(self):
		"""验证是否存在重复记录（同一店铺+任务+产品+日期）"""
		if not self.sub_date:
			return

		filters = {
			"store_id": self.store_id,
			"code": self.code,
			"sub_date": self.sub_date
		}

		if self.task_id:
			filters["task_id"] = self.task_id

		# 如果是更新操作，排除自己
		if not self.is_new():
			filters["name"] = ["!=", self.name]

		existing = frappe.db.exists("Commodity Schedule", filters)

		if existing:
			frappe.throw(
				_("该商品计划已存在：店铺={0}, 任务={1}, 产品={2}, 日期={3}").format(
					self.store_id, self.task_id or "无", self.code, self.sub_date
				)
			)

	def before_save(self):
		"""保存前处理"""
		# 如果没有提交日期，使用今天
		if not self.sub_date:
			self.sub_date = frappe.utils.today()
