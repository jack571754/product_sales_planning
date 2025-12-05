"""
参数验证工具类
统一管理所有参数验证逻辑
"""

import json
import frappe
from frappe import _


def parse_json_param(param, param_name="参数"):
	"""
	解析 JSON 字符串参数

	Args:
		param: 参数值（可能是字符串或已解析的对象）
		param_name: 参数名称（用于错误提示）

	Returns:
		解析后的对象

	Raises:
		frappe.ValidationError: 解析失败时抛出
	"""
	if isinstance(param, str):
		try:
			return json.loads(param)
		except json.JSONDecodeError:
			frappe.throw(_(f"{param_name}格式错误"))
	return param


def validate_required_params(params_dict, required_fields):
	"""
	验证必填参数

	Args:
		params_dict: 参数字典
		required_fields: 必填字段列表

	Raises:
		frappe.ValidationError: 缺少必填参数时抛出
	"""
	missing_fields = []
	for field in required_fields:
		if not params_dict.get(field):
			missing_fields.append(field)

	if missing_fields:
		frappe.throw(_(f"缺少必填参数: {', '.join(missing_fields)}"))


def validate_positive_integer(value, field_name="数量"):
	"""
	验证正整数

	Args:
		value: 待验证的值
		field_name: 字段名称（用于错误提示）

	Returns:
		int: 验证后的整数值

	Raises:
		frappe.ValidationError: 验证失败时抛出
	"""
	try:
		int_value = int(value)
		if int_value < 0:
			frappe.throw(_(f"{field_name}不能为负数"))
		return int_value
	except (ValueError, TypeError):
		frappe.throw(_(f"{field_name}必须是有效的整数"))


def validate_doctype_exists(doctype, name, field_name=None):
	"""
	验证 DocType 记录是否存在

	Args:
		doctype: DocType 名称
		name: 记录名称
		field_name: 字段名称（用于错误提示）

	Raises:
		frappe.ValidationError: 记录不存在时抛出
	"""
	if not frappe.db.exists(doctype, name):
		field_display = field_name or doctype
		frappe.throw(_(f"{field_display} {name} 不存在"))


def validate_month_format(month_str):
	"""
	验证月份格式

	Args:
		month_str: 月份字符串

	Returns:
		str: 标准格式的月份字符串 (YYYY-MM)

	Raises:
		frappe.ValidationError: 格式错误时抛出
	"""
	if not month_str or len(month_str) != 7 or month_str[4] != '-':
		frappe.throw(_("月份格式错误，应为 YYYY-MM"))
	return month_str
