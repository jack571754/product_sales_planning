"""
参数验证工具类
提供统一的参数验证功能
"""

import frappe
from frappe import _
import json
from datetime import datetime
from product_sales_planning.constants import (
	MAX_PAGE_SIZE, MIN_PAGE_SIZE, DEFAULT_PAGE_SIZE,
	COMMODITY_EDITABLE_FIELDS, ALLOWED_SORT_ORDERS,
	MAX_BATCH_SIZE, DocType
)


def parse_json_param(param, param_name="参数"):
	"""
	解析JSON参数
	
	Args:
		param: 参数值（可能是字符串或已解析的对象）
		param_name: 参数名称（用于错误消息）
	
	Returns:
		解析后的对象
	
	Raises:
		frappe.ValidationError: 如果解析失败
	"""
	if isinstance(param, str):
		try:
			return json.loads(param)
		except json.JSONDecodeError:
			frappe.throw(_(f"{param_name}格式错误，必须是有效的JSON"))
	return param


def validate_required_params(params, required_fields):
	"""
	验证必需参数
	
	Args:
		params: 参数字典
		required_fields: 必需字段列表
	
	Raises:
		frappe.ValidationError: 如果缺少必需参数
	"""
	missing = []
	for field in required_fields:
		if field not in params or params[field] is None or params[field] == "":
			missing.append(field)
	
	if missing:
		frappe.throw(_(f"缺少必需参数: {', '.join(missing)}"))


def validate_positive_integer(value, field_name="数值"):
	"""
	验证正整数
	
	Args:
		value: 要验证的值
		field_name: 字段名称（用于错误消息）
	
	Returns:
		int: 验证后的整数值
	
	Raises:
		frappe.ValidationError: 如果不是有效的正整数
	"""
	try:
		int_value = int(value)
		if int_value < 0:
			frappe.throw(_(f"{field_name}必须是非负整数"))
		return int_value
	except (ValueError, TypeError):
		frappe.throw(_(f"{field_name}格式错误，必须是整数"))


def validate_month_format(month_str):
	"""
	验证月份格式
	
	Args:
		month_str: 月份字符串（支持 YYYY-MM, YYYYMM, YYYY/MM 格式）
	
	Returns:
		str: 标准化的月份字符串 (YYYY-MM)
	
	Raises:
		frappe.ValidationError: 如果格式无效
	"""
	if not month_str:
		frappe.throw(_("月份不能为空"))
	
	month_str = str(month_str).strip()
	
	# 尝试不同的格式
	formats = [
		("%Y-%m", "-"),
		("%Y%m", ""),
		("%Y/%m", "/")
	]
	
	for fmt, sep in formats:
		try:
			date_obj = datetime.strptime(month_str, fmt)
			return date_obj.strftime("%Y-%m")
		except ValueError:
			continue
	
	frappe.throw(_(f"月份格式错误: {month_str}，支持格式: YYYY-MM, YYYYMM, YYYY/MM"))


def validate_date(date_value, field_name="日期"):
	"""
	验证日期格式
	
	Args:
		date_value: 日期值
		field_name: 字段名称
	
	Returns:
		datetime.date: 验证后的日期对象
	
	Raises:
		frappe.ValidationError: 如果日期无效
	"""
	from frappe.utils import getdate
	
	try:
		return getdate(date_value)
	except Exception:
		frappe.throw(_(f"{field_name}格式错误"))


def validate_doctype_exists(doctype, name, label=None):
	"""
	验证DocType记录是否存在
	
	Args:
		doctype: DocType名称
		name: 记录名称
		label: 显示标签（用于错误消息）
	
	Raises:
		frappe.ValidationError: 如果记录不存在
	"""
	if not frappe.db.exists(doctype, name):
		label = label or doctype
		frappe.throw(_(f"{label} {name} 不存在"))


def validate_page_params(page, page_size, max_size=None):
	"""
	验证分页参数
	
	Args:
		page: 页码
		page_size: 每页大小
		max_size: 最大页面大小（可选）
	
	Returns:
		tuple: (page, page_size) 验证后的值
	"""
	max_size = max_size or MAX_PAGE_SIZE
	
	try:
		page = int(page) if page else 1
		page_size = int(page_size) if page_size else DEFAULT_PAGE_SIZE
		
		if page < 1:
			page = 1
		if page_size < MIN_PAGE_SIZE:
			page_size = MIN_PAGE_SIZE
		if page_size > max_size:
			page_size = max_size
			
		return page, page_size
	except (ValueError, TypeError):
		return 1, DEFAULT_PAGE_SIZE


def validate_field_update(doctype, field, value):
	"""
	验证字段更新
	
	Args:
		doctype: DocType名称
		field: 字段名
		value: 字段值
	
	Returns:
		验证后的值
	
	Raises:
		frappe.ValidationError: 如果字段不允许更新或值无效
	"""
	if doctype == DocType.COMMODITY_SCHEDULE:
		if field not in COMMODITY_EDITABLE_FIELDS:
			frappe.throw(_(f"不允许修改字段: {field}"))
		
		# 根据字段类型验证值
		if field == "quantity":
			return validate_positive_integer(value, "数量")
		elif field == "sub_date":
			return validate_date(value, "提交日期")
	
	return value


def validate_sort_params(sort_by, sort_order, allowed_fields):
	"""
	验证排序参数
	
	Args:
		sort_by: 排序字段
		sort_order: 排序方向
		allowed_fields: 允许的排序字段列表
	
	Returns:
		tuple: (sort_by, sort_order) 验证后的值
	
	Raises:
		frappe.ValidationError: 如果参数无效
	"""
	# 验证排序字段
	if sort_by and sort_by not in allowed_fields:
		frappe.throw(_(f"不支持的排序字段: {sort_by}"))
	
	# 验证排序方向
	if sort_order:
		sort_order_upper = sort_order.upper()
		if sort_order_upper not in ALLOWED_SORT_ORDERS:
			frappe.throw(_(f"不支持的排序方向: {sort_order}，仅支持 ASC 或 DESC"))
		sort_order = sort_order_upper
	else:
		sort_order = "ASC"
	
	return sort_by, sort_order


def validate_batch_size(items, max_size=None):
	"""
	验证批量操作的数据量
	
	Args:
		items: 数据列表
		max_size: 最大批量大小（可选）
	
	Raises:
		frappe.ValidationError: 如果超过限制
	"""
	max_size = max_size or MAX_BATCH_SIZE
	
	if not items or not isinstance(items, list):
		frappe.throw(_("数据格式错误，必须是列表"))
	
	if len(items) > max_size:
		frappe.throw(_(f"批量操作数量超过限制，最多 {max_size} 条"))
	
	if len(items) == 0:
		frappe.throw(_("没有要处理的数据"))


def validate_file_extension(filename, allowed_extensions=None):
	"""
	验证文件扩展名
	
	Args:
		filename: 文件名
		allowed_extensions: 允许的扩展名列表
	
	Raises:
		frappe.ValidationError: 如果扩展名不允许
	"""
	from product_sales_planning.constants import ALLOWED_FILE_EXTENSIONS
	
	allowed_extensions = allowed_extensions or ALLOWED_FILE_EXTENSIONS
	
	import os
	_, ext = os.path.splitext(filename)
	
	if ext.lower() not in allowed_extensions:
		frappe.throw(_(f"不支持的文件类型: {ext}，仅支持: {', '.join(allowed_extensions)}"))


def validate_enum_value(value, allowed_values, field_name="值"):
	"""
	验证枚举值
	
	Args:
		value: 要验证的值
		allowed_values: 允许的值列表
		field_name: 字段名称
	
	Raises:
		frappe.ValidationError: 如果值不在允许列表中
	"""
	if value not in allowed_values:
		frappe.throw(_(f"{field_name}无效: {value}，允许的值: {', '.join(map(str, allowed_values))}"))


def sanitize_search_term(search_term):
	"""
	清理搜索关键词，防止SQL注入
	
	Args:
		search_term: 搜索关键词
	
	Returns:
		str: 清理后的搜索关键词
	"""
	if not search_term:
		return ""
	
	# 移除特殊字符，只保留字母、数字、中文和常见符号
	import re
	search_term = str(search_term).strip()
	# 移除SQL特殊字符
	search_term = re.sub(r'[;\'\"\\]', '', search_term)
	
	return search_term[:100]  # 限制长度


def validate_id_list(id_list, field_name="ID列表"):
	"""
	验证ID列表
	
	Args:
		id_list: ID列表（可能是字符串或列表）
		field_name: 字段名称
	
	Returns:
		list: 验证后的ID列表
	
	Raises:
		frappe.ValidationError: 如果格式无效
	"""
	if isinstance(id_list, str):
		try:
			id_list = json.loads(id_list)
		except json.JSONDecodeError:
			# 尝试按逗号分割
			id_list = [x.strip() for x in id_list.split(',') if x.strip()]
	
	if not isinstance(id_list, list):
		id_list = [id_list]
	
	if not id_list:
		frappe.throw(_(f"{field_name}不能为空"))
	
	return id_list
