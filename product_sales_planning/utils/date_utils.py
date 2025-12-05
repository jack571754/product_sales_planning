"""
日期处理工具类
统一管理所有日期相关的操作
"""

from datetime import datetime
from dateutil.relativedelta import relativedelta
import frappe


def get_next_n_months(n=4, include_current=False):
	"""
	获取未来N个月的日期列表

	Args:
		n: 月份数量
		include_current: 是否包含当前月

	Returns:
		list: 月份字符串列表，格式为 YYYY-MM
	"""
	current_date = datetime.now()
	months = []
	start_offset = 0 if include_current else 1

	for i in range(start_offset, start_offset + n):
		month_date = current_date + relativedelta(months=i)
		months.append(month_date.strftime('%Y-%m'))

	return months


def get_month_first_day(month_str):
	"""
	获取月份的第一天

	Args:
		month_str: 月份字符串，格式为 YYYY-MM

	Returns:
		str: 日期字符串，格式为 YYYY-MM-01
	"""
	if not month_str:
		return None

	# 支持多种格式
	month_str = month_str.replace('/', '-').strip()

	# 处理 202501 格式
	if len(month_str) == 6 and month_str.isdigit():
		month_str = f"{month_str[:4]}-{month_str[4:]}"

	return f"{month_str}-01"


def get_date_range_filter(months_ahead=4, include_current=False):
	"""
	获取日期范围筛选条件

	Args:
		months_ahead: 未来月份数
		include_current: 是否包含当前月

	Returns:
		tuple: (start_date, end_date)
	"""
	current_date = datetime.now()

	if include_current:
		start_month = current_date.replace(day=1)
	else:
		start_month = current_date.replace(day=1) + relativedelta(months=1)

	end_month = start_month + relativedelta(months=months_ahead)

	return (
		start_month.strftime('%Y-%m-%d'),
		end_month.strftime('%Y-%m-%d')
	)


def parse_month_string(month_str):
	"""
	解析月份字符串为标准格式

	Args:
		month_str: 月份字符串，支持 2025-01, 202501, 2025/01

	Returns:
		str: 标准格式 YYYY-MM，解析失败返回 None
	"""
	if not month_str:
		return None

	try:
		# 清理字符串
		month_str = str(month_str).replace('/', '-').strip()

		# 处理 202501 格式
		if len(month_str) == 6 and month_str.isdigit():
			month_str = f"{month_str[:4]}-{month_str[4:]}"

		# 验证格式
		if '-' in month_str and len(month_str.split('-')) == 2:
			year, month = month_str.split('-')
			if len(year) == 4 and len(month) == 2:
				return month_str

		return None
	except Exception:
		return None
