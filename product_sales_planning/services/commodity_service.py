"""
商品计划服务层
将业务逻辑从 API 层分离，提高代码复用性和可测试性
"""

import frappe
import re
from frappe import _
from frappe.utils import getdate
from datetime import timedelta
from product_sales_planning.utils.date_utils import get_date_range_filter, get_month_first_day
from product_sales_planning.utils.validation_utils import (
	validate_required_params,
	validate_positive_integer,
	validate_doctype_exists
)


class CommodityScheduleService:
	"""商品计划服务类"""

	@staticmethod
	def _get_task_dates(task_id):
		task_dates = None
		if task_id:
			task_dates = frappe.db.get_value(
				"Schedule tasks",
				task_id,
				["start_date", "end_date"],
				as_dict=True,
			)
		start_date = task_dates.get("start_date") if task_dates else None
		end_date = task_dates.get("end_date") if task_dates else None
		return start_date, end_date

	@staticmethod
	def get_task_months(task_id, fallback_months=4):
		"""
		根据任务编号的规划月份生成月份列表（YYYY-MM，包含起始月）。

		规则：
		- Schedule tasks 的命名规则为 `{YYYY}-{MM}-{type}-{##}`，优先从 task_id 中解析 YYYY-MM
		- 返回从规划月开始的未来 N 个月（默认 4 个月）
		- 若无法从 task_id 解析，则回退到任务起止日期或当前时间窗口
		"""
		from product_sales_planning.utils.date_utils import get_next_n_months, get_months_from

		task_id_str = str(task_id or "")
		month_str = None

		# 优先匹配 YYYY-MM / YYYY/MM
		m = re.search(r"(20\d{2}[-/](?:0[1-9]|1[0-2]))", task_id_str)
		if m:
			month_str = m.group(1)
		else:
			# 其次匹配 YYYYMM
			m = re.search(r"(20\d{2}(?:0[1-9]|1[0-2]))", task_id_str)
			if m:
				month_str = m.group(1)

		if month_str:
			months = get_months_from(month_str, n=fallback_months)
			if months:
				return months

		start_date, _end_date = CommodityScheduleService._get_task_dates(task_id)
		if start_date:
			start_month = getdate(start_date).strftime("%Y-%m")
			months = get_months_from(start_month, n=fallback_months)
			if months:
				return months
		return get_next_n_months(n=fallback_months, include_current=False)

	@staticmethod
	def validate_month_in_task(task_id, month):
		"""校验月份是否落在任务周期内（按月份粒度）。"""
		from product_sales_planning.utils.validation_utils import validate_month_format

		month = validate_month_format(month)
		allowed = set(CommodityScheduleService.get_task_months(task_id, fallback_months=4))
		if allowed and month not in allowed:
			frappe.throw(_(f"月份 {month} 不在任务周期内"))
		return month

	@staticmethod
	def get_commodity_data(store_id, task_id, brand=None, category=None,
	                       start=0, page_length=20, search_term=None, view_mode="multi"):
		"""
		获取商品计划数据 - store_id 和 task_id 都是必需参数

		Args:
			store_id: 店铺ID（必需）
			task_id: 任务ID（必需）
			brand: 品牌
			category: 类别
			start: 起始位置
			page_length: 每页条数
			search_term: 搜索关键词
			view_mode: 视图模式 ("single" | "multi")

		Returns:
			dict: 包含数据、总数、视图模式等信息
		"""
		# 验证必需参数
		validate_required_params(
			{"store_id": store_id, "task_id": task_id},
			["store_id", "task_id"]
		)
		
		# 标准化视图模式，默认使用多月视图以便展示完整报表
		view_mode = (view_mode or "multi").lower()
		if view_mode not in {"multi", "single"}:
			view_mode = "multi"

		# 构造筛选条件 - 必须同时过滤店铺和任务
		filters = {
			"store_id": store_id,
			"task_id": task_id
		}

		# 优先使用任务的时间范围；若缺失则退回默认的未来4个月区间
		start_date, end_date = CommodityScheduleService._get_task_dates(task_id)

		if not start_date and not end_date:
			# 保持向后兼容：没有任务时间范围时退回未来4个月窗口
			start_date, end_date = get_date_range_filter(months_ahead=4, include_current=False)

		# 多月视图按月份展示：不在查询层按日期过滤，避免任务起止在月中时月初记录被误过滤。
		# 月份范围控制在 _get_multi_month_view 内（基于 default_months）。
		if view_mode != "multi":
			if start_date and end_date:
				filters["sub_date"] = ["between", [start_date, end_date]]
			elif start_date:
				filters["sub_date"] = [">=", start_date]
			elif end_date:
				filters["sub_date"] = ["<=", end_date]

		# 获取数据（报表页读取不依赖 DocType 权限，由 API 自行做访问控制）
		commodity_schedules = frappe.get_all(
			"Commodity Schedule",
			filters=filters,
			fields=["name", "store_id", "task_id", "code", "quantity", "sub_date", "creation"],
			order_by="code asc, sub_date asc",
			ignore_permissions=True,
		)

		if view_mode == "multi":
			default_months = CommodityScheduleService.get_task_months(task_id, fallback_months=4)
			return CommodityScheduleService._get_multi_month_view(
				commodity_schedules, brand, category, search_term, default_months=default_months
			)
		else:
			return CommodityScheduleService._get_single_month_view(
				commodity_schedules, brand, category, search_term, start, page_length
			)

	@staticmethod
	def _get_multi_month_view(commodity_schedules, brand=None, category=None, search_term=None, default_months=None):
		"""多月视图数据处理"""
		# 默认月份：优先使用任务范围月份
		default_months = default_months or []
		month_set = set(default_months)

		# 按产品聚合数据（先聚合，再一次性查询产品信息；避免无数据时报错）
		product_data = {}
		for item in commodity_schedules:
			code = item.code
			sub_date = item.sub_date

			if not code or not sub_date:
				continue

			month_key = sub_date.strftime("%Y-%m") if hasattr(sub_date, "strftime") else str(sub_date)[:7]
			if default_months and month_key not in month_set:
				continue

			if code not in product_data:
				product_data[code] = {"code": code, "months": {}, "records": {}}

			product_data[code]["records"].setdefault(month_key, []).append(
				{"name": item.name, "quantity": item.quantity, "creation": item.creation}
			)
			if not default_months:
				month_set.add(month_key)

		all_codes = list(product_data.keys())
		if not all_codes:
			return {
				"data": [],
				"months": sorted(list(month_set)),
				"total_count": 0,
				"view_mode": "multi",
			}

		product_infos = frappe.get_all(
			"Product List",
			filters={"name": ["in", all_codes]},
			fields=["name", "name1", "specifications", "brand", "category"],
			ignore_permissions=True,
		)

		product_info_dict = {p.name: p for p in product_infos}

		# 处理重复记录（同商品同月取最新 creation）
		for code, data in product_data.items():
			for month_key, records in data["records"].items():
				latest_record = max(records, key=lambda x: x["creation"])
				data["months"][month_key] = {
					"quantity": latest_record["quantity"],
					"record_name": latest_record["name"],
				}

		# 应用筛选
		filtered_product_data = {}
		for code, data in product_data.items():
			product_info = product_info_dict.get(code)
			if not product_info:
				continue

			# 品牌筛选
			if brand and brand.lower() not in (product_info.brand or "").lower():
				continue

			# 类别筛选
			if category and category.lower() not in (product_info.category or "").lower():
				continue

			# 搜索关键词
			if search_term:
				search_lower = search_term.lower()
				if not any(
					[
						search_lower in (product_info.name1 or "").lower(),
						search_lower in (code or "").lower(),
						search_lower in (product_info.brand or "").lower(),
					]
				):
					continue

			filtered_product_data[code] = {
				"code": code,
				"name1": product_info.name1,
				"specifications": product_info.specifications,
				"brand": product_info.brand,
				"category": product_info.category,
				"months": data["months"],
			}

		result_data = list(filtered_product_data.values())
		sorted_months = sorted(list(month_set))

		return {
			"data": result_data,
			"months": sorted_months,
			"total_count": len(result_data),
			"view_mode": "multi",
		}

	@staticmethod
	def _get_single_month_view(commodity_schedules, brand=None, category=None, search_term=None, start=0, page_length=20):
		"""单月视图数据处理"""
		filtered_items = []

		for item in commodity_schedules:
			product_info = frappe.db.get_value(
				"Product List",
				item.code,
				["name1", "specifications", "brand", "category"],
				as_dict=True,
			)

			if not product_info:
				continue

			item.update(product_info)

			# 品牌筛选
			if brand and brand.lower() not in (item.get("brand") or "").lower():
				continue

			# 类别筛选
			if category and category.lower() not in (item.get("category") or "").lower():
				continue

			# 搜索关键词
			if search_term:
				search_lower = search_term.lower()
				if not any(
					[
						search_lower in (item.get("name1") or "").lower(),
						search_lower in (item.get("code") or "").lower(),
						search_lower in (item.get("brand") or "").lower(),
					]
				):
					continue

			filtered_items.append(item)

		total_count = len(filtered_items)
		start_idx = int(start)
		end_idx = start_idx + int(page_length)
		paged_items = filtered_items[start_idx:end_idx]

		return {"data": paged_items, "total_count": total_count, "view_mode": "single"}

	@staticmethod
	def bulk_insert(store_id, task_id, codes):
		"""
		批量插入商品计划

		Args:
			store_id: 店铺ID（必需）
			task_id: 任务ID（必需）
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

		# 开始事务
		frappe.db.begin()
		
		try:
			inserted_count = 0
			skipped_count = 0
			inserted_records = 0
			skipped_records = 0
			errors = []

			# 新增商品：按任务月份初始化（quantity=0），保证"店铺+任务+月份"维度齐全
			task_months = CommodityScheduleService.get_task_months(task_id, fallback_months=4)

			for code in codes:
				try:
					if not code:
						errors.append("无效的商品代码")
						continue

					inserted_any = False
					for month in task_months:
						# 仍按日期落库：月份列统一写入该月第一天
						sub_date = get_month_first_day(month)

						filters = {
							"code": code,
							"store_id": store_id,
							"task_id": task_id,
							"sub_date": sub_date,
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
							inserted_any = True
							inserted_records += 1
						else:
							skipped_records += 1

					if inserted_any:
						inserted_count += 1
					else:
						skipped_count += 1

				except frappe.ValidationError as ve:
					errors.append(f"商品 {code}: {str(ve)}")
				except Exception as e:
					errors.append(f"商品 {code}: {str(e)}")

			# 全部成功才提交
			frappe.db.commit()

			if errors:
				frappe.log_error("批量添加部分失败", "\n".join(errors))

			msg = f"成功添加 {inserted_count} 个商品"
			if skipped_count > 0:
				msg += f"，跳过 {skipped_count} 个已存在商品"

			return {
				"status": "success",
				"count": inserted_count,
				"skipped": skipped_count,
				"records_inserted": inserted_records,
				"records_skipped": skipped_records,
				"errors": errors[:10],
				"msg": msg
			}
			
		except Exception as e:
			# 发生错误时回滚
			frappe.db.rollback()
			frappe.log_error("批量添加失败", str(e))
			frappe.throw(_("批量添加失败: {0}").format(str(e)))

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

		# 开始事务
		frappe.db.begin()
		
		try:
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

			# 全部成功才提交
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
			
		except Exception as e:
			# 发生错误时回滚
			frappe.db.rollback()
			frappe.log_error("批量更新失败", str(e))
			frappe.throw(_("批量更新失败: {0}").format(str(e)))

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

		# 开始事务
		frappe.db.begin()
		
		try:
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

			# 全部成功才提交
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
			
		except Exception as e:
			# 发生错误时回滚
			frappe.db.rollback()
			frappe.log_error("批量删除失败", str(e))
			frappe.throw(_("批量删除失败: {0}").format(str(e)))
