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


def _ensure_store_access(store_id):
	"""
	店铺数据访问控制：
	- System Manager 直接放行
	- 其他用户仅允许查看自己负责的店铺（Store List.user1）
	"""
	current_user = frappe.session.user
	if not current_user or current_user == "Guest":
		raise frappe.PermissionError("请先登录")

	if "System Manager" in frappe.get_roles(current_user):
		return

	store_owner = frappe.db.get_value("Store List", store_id, "user1")
	if store_owner != current_user:
		raise frappe.PermissionError("无权限查看该店铺数据")


@frappe.whitelist()
def get_store_commodity_data(store_id=None, task_id=None, brand=None, category=None,
	                              start=0, page_length=20, search_term=None, view_mode="multi"):
	"""
	查询商品规划数据
	从 store_detail.py 迁移
	
	Args:
		store_id: 店铺ID（必需）
		task_id: 任务ID（必需）
		brand: 品牌筛选
		category: 类别筛选
		start: 起始位置
		page_length: 每页条数
		search_term: 搜索关键词
		view_mode: 视图模式 ("single" | "multi")
	"""
	try:
		# 验证必需参数
		validate_required_params(
			{"store_id": store_id, "task_id": task_id},
			["store_id", "task_id"]
		)

		# 访问控制（避免开启 ignore_permissions 后的数据泄露）
		_ensure_store_access(store_id)
		
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

		# 添加店铺信息（字段以 DocType 定义为准，避免未知列导致接口报错）
		store_info = frappe.db.get_value(
			"Store List",
			store_id,
			["name", "id", "shop_name", "channel", "shop_type", "user1"],
			as_dict=True,
		)
		result["store_info"] = store_info or {}

		# 添加任务信息
		task_info = frappe.db.get_value(
			"Schedule tasks",
			task_id,
			["name", "type", "start_date", "end_date", "status"],
			as_dict=True,
		) or {}

		# 前端兼容字段
		if task_info.get("type") and "task_type" not in task_info:
			task_info["task_type"] = task_info["type"]
		if task_info.get("name") and "task_name" not in task_info:
			task_info["task_name"] = task_info["name"]

		result["task_info"] = task_info

		# 获取审批状态和编辑权限
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

		# 兼容：补充统一的 status/message 字段，避免前端或第三方调用方因缺少 status 而不渲染数据
		return {"status": "success", "message": "操作成功", **result}

	except Exception as e:
		# 权限错误：抛出以便前端进入 error 分支，而不是误显示“暂无数据”
		if isinstance(e, frappe.PermissionError):
			raise
		frappe.log_error(title="查询商品规划数据失败", message=str(e))
		# 返回结构尽量保持一致，避免前端因字段缺失导致空白页/渲染异常
		payload = error_response(message=str(e))
		payload.update(
			{
				"data": [],
				"months": [],
				"total_count": 0,
				"view_mode": (view_mode or "multi").lower(),
				"store_info": {},
				"task_info": {},
				"can_edit": False,
				"edit_reason": "",
				"approval_status": {},
			}
		)
		return payload


@frappe.whitelist()
def bulk_insert_commodity_schedule(store_id, task_id, codes):
	"""
	批量插入商品计划
	
	Args:
		store_id: 店铺ID（必需）
		task_id: 任务ID（必需）
		codes: 商品代码列表（JSON字符串）
	"""
	try:
		# 验证必需参数
		validate_required_params(
			{"store_id": store_id, "task_id": task_id},
			["store_id", "task_id"]
		)
		
		codes = parse_json_param(codes, "商品代码列表")

		result = CommodityScheduleService.bulk_insert(
			store_id=store_id,
			task_id=task_id,
			codes=codes
		)
		# 兼容：统一 message 字段（部分旧接口使用 msg）
		if isinstance(result, dict) and result.get("status") == "success" and "message" not in result:
			if result.get("msg"):
				result["message"] = result["msg"]
		return result

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(title="批量添加商品失败", message=str(e))
		return error_response(message=str(e))


@frappe.whitelist()
def batch_update_quantity(store_id, task_id, names, quantity):
	"""
	批量修改数量 - 必须绑定店铺和任务
	
	Args:
		store_id: 店铺ID（必需）
		task_id: 任务ID（必需）
		names: 记录名称列表（JSON字符串）
		quantity: 新数量
	"""
	try:
		# 验证必需参数
		validate_required_params(
			{"store_id": store_id, "task_id": task_id},
			["store_id", "task_id"]
		)
		
		names = parse_json_param(names, "记录名称列表")
		
		# 验证所有记录都属于指定的店铺和任务
		for name in names:
			record = frappe.db.get_value(
				"Commodity Schedule",
				name,
				["store_id", "task_id"],
				as_dict=True
			)
			if not record:
				return error_response(message=f"记录 {name} 不存在")
			if record.store_id != store_id or record.task_id != task_id:
				return error_response(message=f"记录 {name} 不属于指定的店铺和任务")
		
		result = CommodityScheduleService.batch_update_quantity(names, quantity)
		if isinstance(result, dict) and result.get("status") == "success" and "message" not in result:
			if result.get("msg"):
				result["message"] = result["msg"]
		return result

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(title="批量修改失败", message=str(e))
		return error_response(message=str(e))


@frappe.whitelist()
def batch_delete_items(store_id, task_id, names):
	"""
	批量删除记录 - 必须绑定店铺和任务
	
	Args:
		store_id: 店铺ID（必需）
		task_id: 任务ID（必需）
		names: 记录名称列表（JSON字符串）
	"""
	try:
		# 验证必需参数
		validate_required_params(
			{"store_id": store_id, "task_id": task_id},
			["store_id", "task_id"]
		)
		
		names = parse_json_param(names, "记录名称列表")
		
		# 验证所有记录都属于指定的店铺和任务
		for name in names:
			record = frappe.db.get_value(
				"Commodity Schedule",
				name,
				["store_id", "task_id"],
				as_dict=True
			)
			if not record:
				return error_response(message=f"记录 {name} 不存在")
			if record.store_id != store_id or record.task_id != task_id:
				return error_response(message=f"记录 {name} 不属于指定的店铺和任务")
		
		result = CommodityScheduleService.batch_delete(names)
		if isinstance(result, dict) and result.get("status") == "success" and "message" not in result:
			if result.get("msg"):
				result["message"] = result["msg"]
		return result

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(title="批量删除失败", message=str(e))
		return error_response(message=str(e))


@frappe.whitelist()
def batch_delete_by_codes(store_id, task_id, codes):
	"""
	根据产品编码批量删除记录（用于多月视图）
	
	Args:
		store_id: 店铺ID（必需）
		task_id: 任务ID（必需）
		codes: 商品代码列表（JSON字符串）
	"""
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
def update_line_item(store_id, task_id, name, field, value):
	"""
	更新单个字段 - 必须绑定店铺和任务
	
	Args:
		store_id: 店铺ID（必需）
		task_id: 任务ID（必需）
		name: 记录名称
		field: 字段名
		value: 新值
	"""
	try:
		# 验证必需参数
		validate_required_params(
			{"store_id": store_id, "task_id": task_id, "name": name},
			["store_id", "task_id", "name"]
		)
		
		# 验证记录属于指定的店铺和任务
		record = frappe.db.get_value(
			"Commodity Schedule",
			name,
			["store_id", "task_id"],
			as_dict=True
		)
		if not record:
			return error_response(message=f"记录 {name} 不存在")
		if record.store_id != store_id or record.task_id != task_id:
			return error_response(message=f"记录 {name} 不属于指定的店铺和任务")
		
		frappe.db.set_value("Commodity Schedule", name, field, value)
		frappe.db.commit()
		return success_response(message="已保存")

	except Exception as e:
		frappe.log_error(title="更新字段失败", message=str(e))
		return error_response(message=str(e))


@frappe.whitelist()
def update_month_quantity(store_id, task_id, code, month, quantity):
	"""
	更新指定产品的某个月份的计划数量
	
	Args:
		store_id: 店铺ID（必需）
		task_id: 任务ID（必需）
		code: 商品代码
		month: 月份（YYYY-MM格式）
		quantity: 数量
	"""
	try:
		from product_sales_planning.utils.date_utils import get_month_first_day

		# 参数验证
		validate_required_params(
			{"store_id": store_id, "task_id": task_id, "code": code, "month": month},
			["store_id", "task_id", "code", "month"]
		)
		quantity = validate_positive_integer(quantity, "数量")
		month = CommodityScheduleService.validate_month_in_task(task_id, month)

		# 按日期落库，月份列统一写入该月第一天
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
	"""
	批量更新多个商品的月份数量
	
	Args:
		store_id: 店铺ID（必需）
		task_id: 任务ID（必需）
		updates: 更新数据列表（JSON字符串），格式：[{code, month, quantity}, ...]
	"""
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
				month = CommodityScheduleService.validate_month_in_task(task_id, month)

				# 按日期落库，月份列统一写入该月第一天
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
def get_product_list_for_dialog(
	store_id=None,
	task_id=None,
	search_term=None,
	brand=None,
	category=None,
	page=1,
	page_size=20,
):
	"""
	获取商品选择列表（供前端弹窗使用，支持筛选与分页）
	
	注意：此接口返回全局产品列表，不受 store_id/task_id 限制
	但会标记哪些产品已添加到指定店铺和任务中
	
	Args:
		store_id: 店铺ID（可选，用于标记已添加产品）
		task_id: 任务ID（可选，用于标记已添加产品）
		search_term: 搜索关键词
		brand: 品牌筛选
		category: 类别筛选
		page: 页码
		page_size: 每页条数
	"""
	try:
		page = int(page or 1)
		page_size = int(page_size or 20)
		if page < 1:
			page = 1
		if page_size < 1:
			page_size = 20

		search_term = (search_term or "").strip()
		brand = (brand or "").strip()
		category = (category or "").strip()

		conditions = ["1=1"]
		values = {}

		if brand:
			conditions.append("pl.brand = %(brand)s")
			values["brand"] = brand
		if category:
			conditions.append("pl.category = %(category)s")
			values["category"] = category

		search_condition = ""
		if search_term:
			search_condition = "(pl.name LIKE %(search)s OR pl.name1 LIKE %(search)s)"
			conditions.append(search_condition)
			values["search"] = f"%{search_term}%"

		where_clause = " AND ".join(conditions)
		offset = (page - 1) * page_size

		data = frappe.db.sql(
			f"""
			SELECT
				pl.name as code,
				pl.name1,
				pl.specifications,
				pl.brand,
				pl.category
			FROM `tabProduct List` pl
			WHERE {where_clause}
			ORDER BY pl.name1 ASC
			LIMIT %(limit)s OFFSET %(offset)s
			""",
			{**values, "limit": page_size, "offset": offset},
			as_dict=True,
		)

		total_res = frappe.db.sql(
			f"""
			SELECT COUNT(*) as total
			FROM `tabProduct List` pl
			WHERE {where_clause}
			""",
			values,
			as_dict=True,
		)
		total = int(total_res[0]["total"]) if total_res else 0

		# 如果提供了 store_id 和 task_id，标记已添加的产品
		added_codes = set()
		if store_id and task_id:
			added_records = frappe.get_all(
				"Commodity Schedule",
				filters={"store_id": store_id, "task_id": task_id},
				fields=["code"],
				distinct=True
			)
			added_codes = {r.code for r in added_records}
		
		# 为每个产品添加 is_added 标记
		for item in data:
			item["is_added"] = item["code"] in added_codes

		# facets：仅受 search_term 影响，避免选中 brand/category 后选项"收缩"
		facet_values = {}
		facet_where = "1=1"
		if search_term:
			facet_where = "(pl.name LIKE %(search)s OR pl.name1 LIKE %(search)s)"
			facet_values["search"] = f"%{search_term}%"

		brand_rows = frappe.db.sql(
			f"""
			SELECT DISTINCT pl.brand as value
			FROM `tabProduct List` pl
			WHERE {facet_where} AND pl.brand IS NOT NULL AND pl.brand != ''
			ORDER BY pl.brand ASC
			""",
			facet_values,
			as_dict=True,
		)
		category_rows = frappe.db.sql(
			f"""
			SELECT DISTINCT pl.category as value
			FROM `tabProduct List` pl
			WHERE {facet_where} AND pl.category IS NOT NULL AND pl.category != ''
			ORDER BY pl.category ASC
			""",
			facet_values,
			as_dict=True,
		)

		return success_response(
			data=data,
			total=total,
			page=page,
			page_size=page_size,
			facets={
				"brands": [r["value"] for r in brand_rows if r.get("value")],
				"categories": [r["value"] for r in category_rows if r.get("value")],
			},
		)
	except Exception as e:
		frappe.log_error(title="获取商品列表失败", message=str(e))
		return error_response(message=str(e))
