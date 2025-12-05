"""
API 响应工具类
统一管理所有 API 响应格式
"""

import frappe


def success_response(data=None, message="操作成功", **kwargs):
	"""
	成功响应

	Args:
		data: 返回的数据
		message: 成功消息
		**kwargs: 其他额外字段

	Returns:
		dict: 统一格式的成功响应
	"""
	response = {
		"status": "success",
		"message": message
	}

	if data is not None:
		response["data"] = data

	response.update(kwargs)
	return response


def error_response(message="操作失败", error_code=None, **kwargs):
	"""
	错误响应

	Args:
		message: 错误消息
		error_code: 错误代码
		**kwargs: 其他额外字段

	Returns:
		dict: 统一格式的错误响应
	"""
	response = {
		"status": "error",
		"message": message
	}

	if error_code:
		response["error_code"] = error_code

	response.update(kwargs)
	return response


def paginated_response(data, total, page=1, page_size=20, **kwargs):
	"""
	分页响应

	Args:
		data: 数据列表
		total: 总记录数
		page: 当前页码
		page_size: 每页大小
		**kwargs: 其他额外字段

	Returns:
		dict: 统一格式的分页响应
	"""
	response = {
		"status": "success",
		"data": data,
		"total": total,
		"page": int(page),
		"page_size": int(page_size),
		"total_pages": (total + page_size - 1) // page_size if page_size > 0 else 0
	}

	response.update(kwargs)
	return response
