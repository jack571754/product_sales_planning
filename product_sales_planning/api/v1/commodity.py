"""
Commodity API
商品计划相关API接口
"""

import frappe
from product_sales_planning.utils.response_utils import success_response, error_response
from product_sales_planning.utils.validation_utils import (
	parse_json_param,
	validate_required_params,
	validate_positive_integer,
	validate_month_format
)
from product_sales_planning.services.commodity_service import CommodityScheduleService


@frappe.whitelist()
def get_store_commodity_data(store_id=None, task_id=None, brand=None, category=None,
                              start=0, page_length=20, search_term=None, view_mode="multi"):
	"""
	查询商品规划数据
	从 store_detail.py 迁移
	"""
	try:
		result = CommodityScheduleService.get_commodity_data(
			store_id=store_id,
			task_id=task_id,
			brand=brand,
			category=category,
			start=start,
			page_length=page_length,
			search_term=search_term,
			view_mode=view_mode
		)

		# 添加店铺和任务信息
		if store_id:
			store_info = frappe.get_value(
				"Store List",
				store_id,
				["name", "shop_name", "store_type", "region"],
				as_dict=True
			)
			result["store_info"] = store_info or {}
		else:
			result["store_info"] = {}

		if task_id:
			task_info = frappe.get_value(
				"Schedule tasks",
				task_id,
				["name", "task_name", "task_type", "start_date", "end_date", "status"],
				as_dict=True
			)
			result["task_info"] = task_info or {}
		else:
			result["task_info"] = {}

		# 获取审批状态和编辑权限
		if store_id and task_id:
			from product_sales_planning.api.v1.approval import check_can_edit

			can_edit_result = check_can_edit(task_id, store_id)
			result["can_edit"] = can_edit_result.get("can_edit", True)
			result["edit_reason"] = can_edit_result.get("reason", "")

			# 获取审批状态
			tasks_store = frappe.db.get_value(
				"Tasks Store",
				{"parent": task_id, "store_name": store_id},
				["approval_status", "status"],
				as_dict=True
			)
			result["approval_status"] = tasks_store or {}
		else:
			result["can_edit"] = True
			result["edit_reason"] = ""
			result["approval_status"] = {}

		return result

	except Exception as e:
		frappe.log_error(title="查询商品规划数据失败", message=str(e))
		return error_response(message=str(e))


@frappe.whitelist()
def bulk_insert_commodity_schedule(store_id, codes, task_id=None):
	"""批量插入商品计划"""
	try:
		codes = parse_json_param(codes, "商品代码列表")

		result = CommodityScheduleService.bulk_insert(
			store_id=store_id,
			task_id=task_id,
			codes=codes
		)
		return result

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(title="批量添加商品失败", message=str(e))
		return error_response(message=str(e))


@frappe.whitelist()
def batch_update_quantity(names, quantity):
	"""批量修改数量"""
	try:
		names = parse_json_param(names, "记录名称列表")
		result = CommodityScheduleService.batch_update_quantity(names, quantity)
		return result

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(title="批量修改失败", message=str(e))
		return error_response(message=str(e))


@frappe.whitelist()
def batch_delete_items(names):
	"""批量删除记录"""
	try:
		names = parse_json_param(names, "记录名称列表")
		result = CommodityScheduleService.batch_delete(names)
		return result

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(title="批量删除失败", message=str(e))
		return error_response(message=str(e))


@frappe.whitelist()
def batch_delete_by_codes(store_id, task_id, codes):
	"""根据产品编码批量删除记录（用于多月视图）"""
	try:
		codes = parse_json_param(codes, "商品代码列表")
		validate_required_params(
			{"store_id": store_id, "task_id": task_id},
			["store_id", "task_id"]
		)

		deleted_count = 0
		errors = []

		for code in codes:
			try:
				filters = {
					"code": code,
					"store_id": store_id,
					"task_id": task_id
				}

				records = frappe.get_all("Commodity Schedule", filters=filters, fields=["name"])

				for record in records:
					try:
						frappe.delete_doc("Commodity Schedule", record.name)
						deleted_count += 1
					except frappe.PermissionError:
						errors.append(f"产品 {code} 记录 {record.name}: 无权限删除")
					except Exception as inner_e:
						errors.append(f"产品 {code} 记录 {record.name}: {str(inner_e)}")

			except Exception as e:
				errors.append(f"产品 {code}: {str(e)}")
				frappe.log_error(f"删除产品记录失败: {code}", str(e))

		frappe.db.commit()

		msg = f"成功删除 {deleted_count} 条记录"
		if errors:
			msg += f"，{len(errors)} 条失败"

		return success_response(
			message=msg,
			count=deleted_count,
			errors=errors[:10]
		)

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(title="批量删除失败", message=str(e))
		return error_response(message=str(e))


@frappe.whitelist()
def update_line_item(name, field, value):
	"""更新单个字段"""
	try:
		frappe.db.set_value("Commodity Schedule", name, field, value)
		frappe.db.commit()
		return success_response(message="已保存")

	except Exception as e:
		frappe.log_error(title="更新字段失败", message=str(e))
		return error_response(message=str(e))


@frappe.whitelist()
def update_month_quantity(store_id, task_id, code, month, quantity):
	"""更新指定产品的某个月份的计划数量"""
	try:
		from product_sales_planning.utils.date_utils import get_month_first_day

		# 参数验证
		validate_required_params(
			{"store_id": store_id, "task_id": task_id, "code": code, "month": month},
			["store_id", "task_id", "code", "month"]
		)
		quantity = validate_positive_integer(quantity, "数量")
		validate_month_format(month)

		# 构造日期
		sub_date = get_month_first_day(month)

		# 查找记录
		filters = {
			"store_id": store_id,
			"task_id": task_id,
			"code": code,
			"sub_date": sub_date
		}

		existing = frappe.db.get_value("Commodity Schedule", filters, "name")

		if existing:
			doc = frappe.get_doc("Commodity Schedule", existing)
			doc.quantity = quantity
			doc.save()
		else:
			new_doc = frappe.new_doc("Commodity Schedule")
			new_doc.store_id = store_id
			new_doc.task_id = task_id
			new_doc.code = code
			new_doc.quantity = quantity
			new_doc.sub_date = sub_date
			new_doc.insert()

		frappe.db.commit()
		return success_response(message="已保存")

	except frappe.ValidationError as ve:
		frappe.db.rollback()
		return error_response(message=str(ve))
	except frappe.PermissionError:
		frappe.db.rollback()
		return error_response(message="无权限操作")
	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(title="更新月份数量失败", message=str(e))
		return error_response(message=str(e))


@frappe.whitelist()
def batch_update_month_quantities(store_id, task_id, updates):
	"""批量更新多个商品的月份数量"""
	try:
		from product_sales_planning.utils.date_utils import get_month_first_day

		validate_required_params(
			{"store_id": store_id, "task_id": task_id, "updates": updates},
			["store_id", "task_id", "updates"]
		)

		updates_list = parse_json_param(updates, "更新数据列表")
		if not isinstance(updates_list, list):
			return error_response(message="更新数据格式错误")

		success_count = 0
		errors = []

		for idx, upd in enumerate(updates_list):
			try:
				code = upd.get("code")
				month = upd.get("month")
				quantity = upd.get("quantity")

				validate_required_params(
					{"code": code, "month": month},
					["code", "month"]
				)
				quantity = validate_positive_integer(quantity, "数量")
				validate_month_format(month)

				sub_date = get_month_first_day(month)

				filters = {
					"store_id": store_id,
					"task_id": task_id,
					"code": code,
					"sub_date": sub_date
				}

				existing = frappe.db.get_value("Commodity Schedule", filters, "name")

				if existing:
					doc = frappe.get_doc("Commodity Schedule", existing)
					doc.quantity = quantity
					doc.save()
				else:
					new_doc = frappe.new_doc("Commodity Schedule")
					new_doc.store_id = store_id
					new_doc.task_id = task_id
					new_doc.code = code
					new_doc.quantity = quantity
					new_doc.sub_date = sub_date
					new_doc.insert()

				success_count += 1
			except Exception as inner_e:
				errors.append(f"第 {idx + 1} 项失败: {str(inner_e)}")

		frappe.db.commit()
		return success_response(
			message=f"批量保存完成，成功 {success_count} 条",
			count=success_count,
			errors=errors[:20]
		)

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(title="批量更新月份数量失败", message=str(e))
		return error_response(message=str(e))


@frappe.whitelist()
def get_product_list_for_dialog(store_id=None, task_id=None, search_term=None, brand=None, category=None, limit=500):
	"""获取商品选择列表（供前端弹窗使用）"""
	try:
		filters = {}
		or_filters = []

		if brand:
			filters["brand"] = ("like", f"%{brand}%")
		if category:
			filters["category"] = ("like", f"%{category}%")
		if search_term:
			search_term = search_term.strip()
			or_filters = [
				["Product List", "name", "like", f"%{search_term}%"],
				["Product List", "name1", "like", f"%{search_term}%"]
			]

		products = frappe.get_all(
			"Product List",
			filters=filters,
			or_filters=or_filters,
			fields=["name as code", "name1", "specifications", "brand", "category"],
			limit_page_length=limit or 500,
			order_by="name1 asc"
		)

		return success_response(data=products)
	except Exception as e:
		frappe.log_error(title="获取商品列表失败", message=str(e))
		return error_response(message=str(e))