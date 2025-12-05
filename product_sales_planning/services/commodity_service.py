"""
商品计划服务层
将业务逻辑从 API 层分离，提高代码复用性和可测试性
"""

import frappe
from frappe import _
from product_sales_planning.utils.date_utils import get_date_range_filter, get_month_first_day
from product_sales_planning.utils.validation_utils import (
	validate_required_params,
	validate_positive_integer,
	validate_doctype_exists
)


class CommodityScheduleService:
	"""商品计划服务类"""

	@staticmethod
	def get_commodity_data(store_id=None, task_id=None, brand=None, category=None,
	                       start=0, page_length=20, search_term=None, view_mode="single"):
		"""
		获取商品计划数据

		Args:
			store_id: 店铺ID
			task_id: 任务ID
			brand: 品牌
			category: 类别
			start: 起始位置
			page_length: 每页条数
			search_term: 搜索关键词
			view_mode: 视图模式 ("single" | "multi")

		Returns:
			dict: 包含数据、总数、视图模式等信息
		"""
		# 构造筛选条件
		filters = {}
		if store_id:
			filters["store_id"] = store_id
		if task_id:
			filters["task_id"] = task_id

		# 添加日期范围筛选（未来4个月）
		start_date, end_date = get_date_range_filter(months_ahead=4, include_current=False)
		filters["sub_date"] = [">=", start_date]

		# 获取数据
		commodity_schedules = frappe.get_all(
			"Commodity Schedule",
			filters=filters,
			fields=["name", "store_id", "task_id", "code", "quantity", "sub_date", "creation"],
			order_by="code asc, sub_date asc"
		)

		# 过滤未来4个月内的数据
		from datetime import datetime
		end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
		commodity_schedules = [
			item for item in commodity_schedules
			if item.sub_date and item.sub_date < end_date_obj
		]

		if view_mode == "multi":
			return CommodityScheduleService._get_multi_month_view(
				commodity_schedules, brand, category, search_term
			)
		else:
			return CommodityScheduleService._get_single_month_view(
				commodity_schedules, brand, category, search_term, start, page_length
			)

	@staticmethod
	def _get_multi_month_view(commodity_schedules, brand=None, category=None, search_term=None):
		"""多月视图数据处理"""
		from product_sales_planning.utils.date_utils import get_next_n_months

		# 生成默认月份
		default_months = get_next_n_months(n=4, include_current=False)
		month_set = set(default_months)

		# 按产品聚合数据
		product_data = {}
		for item in commodity_schedules:
			code = item.code
			sub_date = item.sub_date

			if code not in product_data:
				product_data[code] = {
					"code": code,
					"months": {},
					"records": {}
				}

			if sub_date:
				month_key = sub_date.strftime('%Y-%m') if hasattr(sub_date, 'strftime') else str(sub_date)[:7]

				if month_key not in product_data[code]["records"]:
					product_data[code]["records"][month_key] = []

				product_data[code]["records"][month_key].append({
					"name": item.name,
					"quantity": item.quantity,
					"creation": item.creation
				})

				month_set.add(month_key)

		# 批量获取产品信息
		all_codes = list(product_data.keys())
		product_infos = frappe.get_all(
			"Product List",
			filters={"name": ["in", all_codes]},
			fields=["name", "name1", "specifications", "brand", "category"]
		)

		product_info_dict = {p.name: p for p in product_infos}

		# 处理重复记录
		for code, data in product_data.items():
			for month_key, records in data["records"].items():
				if len(records) > 1:
					latest_record = max(records, key=lambda x: x["creation"])
					data["months"][month_key] = {
						"quantity": latest_record["quantity"],
						"record_name": latest_record["name"]
					}
				else:
					data["months"][month_key] = {
						"quantity": records[0]["quantity"],
						"record_name": records[0]["name"]
					}

		# 应用筛选
		filtered_product_data = {}
		for code, data in product_data.items():
			product_info = product_info_dict.get(code)
			if not product_info:
				continue

			# 品牌筛选
			if brand and brand.lower() not in (product_info.brand or '').lower():
				continue

			# 类别筛选
			if category and category.lower() not in (product_info.category or '').lower():
				continue

			# 搜索关键词
			if search_term:
				search_lower = search_term.lower()
				if not any([
					search_lower in (product_info.name1 or '').lower(),
					search_lower in (code or '').lower(),
					search_lower in (product_info.brand or '').lower()
				]):
					continue

			filtered_product_data[code] = {
				"code": code,
				"name1": product_info.name1,
				"specifications": product_info.specifications,
				"brand": product_info.brand,
				"category": product_info.category,
				"months": data["months"]
			}

		result_data = list(filtered_product_data.values())
		sorted_months = sorted(list(month_set))

		return {
			"data": result_data,
			"months": sorted_months,
			"total_count": len(result_data),
			"view_mode": "multi"
		}

	@staticmethod
	def _get_single_month_view(commodity_schedules, brand=None, category=None,
	                            search_term=None, start=0, page_length=20):
		"""单月视图数据处理"""
		filtered_items = []

		for item in commodity_schedules:
			product_info = frappe.get_cached_value(
				"Product List",
				item.code,
				["name1", "specifications", "brand", "category"],
				as_dict=True
			)

			if not product_info:
				continue

			item.update(product_info)

			# 品牌筛选
			if brand and brand.lower() not in (item.get('brand') or '').lower():
				continue

			# 类别筛选
			if category and category.lower() not in (item.get('category') or '').lower():
				continue

			# 搜索关键词
			if search_term:
				search_lower = search_term.lower()
				if not any([
					search_lower in (item.get('name1') or '').lower(),
					search_lower in (item.get('code') or '').lower(),
					search_lower in (item.get('brand') or '').lower()
				]):
					continue

			filtered_items.append(item)

		total_count = len(filtered_items)
		start_idx = int(start)
		end_idx = start_idx + int(page_length)
		paged_items = filtered_items[start_idx:end_idx]

		return {
			"data": paged_items,
			"total_count": total_count,
			"view_mode": "single"
		}

	@staticmethod
	def bulk_insert(store_id, task_id, codes):
		"""
		批量插入商品计划

		Args:
			store_id: 店铺ID
			task_id: 任务ID
			codes: 商品代码列表

		Returns:
			dict: 包含插入数量、跳过数量、错误信息
		"""
		# 参数验证
		validate_required_params(
			{"store_id": store_id, "task_id": task_id},
			["store_id", "task_id"]
		)
		validate_doctype_exists("Store List", store_id, "店铺")
		validate_doctype_exists("Schedule tasks", task_id, "计划任务")

		if not codes or not isinstance(codes, list):
			frappe.throw(_("未选择任何商品"))

		inserted_count = 0
		skipped_count = 0
		errors = []

		# 获取下个月第一天
		from product_sales_planning.utils.date_utils import get_next_n_months
		next_month = get_next_n_months(n=1, include_current=False)[0]
		sub_date = get_month_first_day(next_month)

		for code in codes:
			try:
				if not code:
					errors.append("无效的商品代码")
					continue

				# 检查是否存在
				filters = {
					"code": code,
					"store_id": store_id,
					"task_id": task_id,
					"sub_date": sub_date
				}

				exists = frappe.db.exists("Commodity Schedule", filters)

				if not exists:
					doc = frappe.new_doc("Commodity Schedule")
					doc.store_id = store_id
					doc.code = code
					doc.task_id = task_id
					doc.quantity = 0
					doc.sub_date = sub_date
					doc.insert()
					inserted_count += 1
				else:
					skipped_count += 1

			except frappe.ValidationError as ve:
				errors.append(f"商品 {code}: {str(ve)}")
			except Exception as e:
				errors.append(f"商品 {code}: {str(e)}")

		frappe.db.commit()

		if errors:
			frappe.log_error("批量添加部分失败", "\n".join(errors))

		msg = f"成功添加 {inserted_count} 条"
		if skipped_count > 0:
			msg += f"，跳过 {skipped_count} 条已存在记录"

		return {
			"status": "success",
			"count": inserted_count,
			"skipped": skipped_count,
			"errors": errors[:10],
			"msg": msg
		}

	@staticmethod
	def batch_update_quantity(names, quantity):
		"""
		批量更新数量

		Args:
			names: 记录名称列表
			quantity: 新数量

		Returns:
			dict: 包含更新数量、错误信息
		"""
		if not names or not isinstance(names, list):
			frappe.throw(_("未选择任何记录"))

		quantity = validate_positive_integer(quantity, "数量")

		updated_count = 0
		errors = []

		for name in names:
			try:
				doc = frappe.get_doc("Commodity Schedule", name)
				doc.quantity = quantity
				doc.save()
				updated_count += 1
			except frappe.PermissionError:
				errors.append(f"记录 {name}: 无权限修改")
			except Exception as e:
				errors.append(f"记录 {name}: {str(e)}")
				frappe.log_error(f"更新记录失败: {name}", str(e))

		frappe.db.commit()

		msg = f"成功修改 {updated_count} 条记录"
		if errors:
			msg += f"，{len(errors)} 条失败"

		return {
			"status": "success",
			"count": updated_count,
			"errors": errors[:10],
			"msg": msg
		}

	@staticmethod
	def batch_delete(names):
		"""
		批量删除记录

		Args:
			names: 记录名称列表

		Returns:
			dict: 包含删除数量、错误信息
		"""
		if not names or not isinstance(names, list):
			frappe.throw(_("未选择任何记录"))

		deleted_count = 0
		errors = []

		for name in names:
			try:
				frappe.delete_doc("Commodity Schedule", name)
				deleted_count += 1
			except frappe.PermissionError:
				errors.append(f"记录 {name}: 无权限删除")
			except Exception as e:
				errors.append(f"记录 {name}: {str(e)}")
				frappe.log_error(f"删除记录失败: {name}", str(e))

		frappe.db.commit()

		msg = f"成功删除 {deleted_count} 条记录"
		if errors:
			msg += f"，{len(errors)} 条失败"

		return {
			"status": "success",
			"count": deleted_count,
			"errors": errors[:10],
			"msg": msg
		}
