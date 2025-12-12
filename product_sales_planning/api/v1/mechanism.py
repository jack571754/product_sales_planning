"""
Mechanism API
机制相关API接口
从 store_detail.py 迁移
"""

import frappe
from product_sales_planning.utils.response_utils import success_response, error_response
from product_sales_planning.utils.validation_utils import (
	parse_json_param,
	validate_required_params,
	validate_doctype_exists
)


@frappe.whitelist()
def apply_mechanisms(store_id, mechanism_names, task_id=None):
	"""应用产品机制（批量添加机制中的所有产品）"""
	try:
		from product_sales_planning.utils.date_utils import get_next_n_months, get_month_first_day

		# 解析参数
		mechanism_names = parse_json_param(mechanism_names, "机制名称列表")
		validate_required_params({"store_id": store_id}, ["store_id"])
		validate_doctype_exists("Store List", store_id, "店铺")

		if task_id:
			validate_doctype_exists("Schedule tasks", task_id, "计划任务")

		inserted_count = 0
		skipped_count = 0
		errors = []

		# 获取下个月第一天
		next_month = get_next_n_months(n=1, include_current=False)[0]
		sub_date = get_month_first_day(next_month)

		for mech_name in mechanism_names:
			if not frappe.db.exists("Product Mechanism", mech_name):
				errors.append(f"机制 {mech_name} 不存在")
				continue

			try:
				mech_doc = frappe.get_doc("Product Mechanism", mech_name)

				if mech_doc.product_list:
					for item in mech_doc.product_list:
						product_code = item.name1
						default_qty = item.quantity or 1

						try:
							filters = {
								"store_id": store_id,
								"code": product_code,
								"sub_date": sub_date
							}
							if task_id:
								filters["task_id"] = task_id

							exists = frappe.db.exists("Commodity Schedule", filters)

							if not exists:
								new_doc = frappe.new_doc("Commodity Schedule")
								new_doc.store_id = store_id
								new_doc.code = product_code
								new_doc.task_id = task_id
								new_doc.quantity = default_qty
								new_doc.sub_date = sub_date
								new_doc.insert()
								inserted_count += 1
							else:
								skipped_count += 1

						except frappe.ValidationError as ve:
							errors.append(f"机制[{mech_name}]-产品[{product_code}]: {str(ve)}")
						except frappe.PermissionError:
							errors.append(f"机制[{mech_name}]-产品[{product_code}]: 无权限创建")
						except Exception as inner_e:
							errors.append(f"机制[{mech_name}]-产品[{product_code}]: {str(inner_e)}")

			except Exception as mech_e:
				errors.append(f"机制 {mech_name}: {str(mech_e)}")

		frappe.db.commit()

		msg = f"成功添加 {inserted_count} 条"
		if skipped_count > 0:
			msg += f"，跳过 {skipped_count} 条已存在记录"

		return success_response(
			message=msg,
			count=inserted_count,
			skipped=skipped_count,
			errors=errors[:10]
		)

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(title="应用机制失败", message=str(e))
		return error_response(message=str(e))