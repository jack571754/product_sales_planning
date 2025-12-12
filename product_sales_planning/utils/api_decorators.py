"""
API装饰器工具
提供统一的权限检查、异常处理、事务管理等功能
"""

import frappe
from functools import wraps
from product_sales_planning.utils.response_utils import error_response
from product_sales_planning.constants import ErrorCode


def require_permission(doctype, perm_type="read"):
	"""
	权限检查装饰器
	
	Args:
		doctype: DocType名称
		perm_type: 权限类型 (read/write/create/delete等)
	
	Usage:
		@frappe.whitelist()
		@require_permission("Commodity Schedule", "delete")
		def delete_item(name):
			...
	"""
	def decorator(fn):
		@wraps(fn)
		def wrapper(*args, **kwargs):
			if not frappe.has_permission(doctype, perm_type):
				return error_response(
					message=f"无{perm_type}权限",
					error_code=ErrorCode.PERMISSION_DENIED
				)
			return fn(*args, **kwargs)
		return wrapper
	return decorator


def handle_exceptions(fn):
	"""
	统一异常处理装饰器
	捕获并记录所有异常，返回统一格式的错误响应
	
	Usage:
		@frappe.whitelist()
		@handle_exceptions
		def my_api():
			...
	"""
	@wraps(fn)
	def wrapper(*args, **kwargs):
		try:
			return fn(*args, **kwargs)
		except frappe.ValidationError as e:
			frappe.log_error(
				title=f"{fn.__name__} 验证失败",
				message=f"参数: {kwargs}\n错误: {str(e)}"
			)
			return error_response(
				message=str(e),
				error_code=ErrorCode.VALIDATION_ERROR
			)
		except frappe.PermissionError as e:
			frappe.log_error(
				title=f"{fn.__name__} 权限错误",
				message=f"用户: {frappe.session.user}\n错误: {str(e)}"
			)
			return error_response(
				message="无权限操作",
				error_code=ErrorCode.PERMISSION_DENIED
			)
		except frappe.DoesNotExistError as e:
			return error_response(
				message="记录不存在",
				error_code=ErrorCode.NOT_FOUND
			)
		except Exception as e:
			import traceback
			error_details = traceback.format_exc()
			frappe.log_error(
				title=f"{fn.__name__} 执行失败",
				message=f"用户: {frappe.session.user}\n参数: {kwargs}\n错误: {error_details}"
			)
			return error_response(
				message="操作失败，请联系管理员",
				error_code=ErrorCode.INTERNAL_ERROR
			)
	return wrapper


def with_transaction(fn):
	"""
	事务管理装饰器
	自动处理事务的开始、提交和回滚
	
	Usage:
		@frappe.whitelist()
		@with_transaction
		def batch_update():
			...
	"""
	@wraps(fn)
	def wrapper(*args, **kwargs):
		# 开始事务
		frappe.db.begin()
		
		try:
			result = fn(*args, **kwargs)
			# 成功则提交
			frappe.db.commit()
			return result
		except Exception as e:
			# 失败则回滚
			frappe.db.rollback()
			import traceback
			error_details = traceback.format_exc()
			frappe.log_error(
				title=f"{fn.__name__} 事务失败",
				message=f"用户: {frappe.session.user}\n参数: {kwargs}\n错误: {error_details}"
			)
			return error_response(
				message=f"操作失败: {str(e)}",
				error_code=ErrorCode.TRANSACTION_FAILED
			)
	return wrapper


def validate_params(*required_params):
	"""
	参数验证装饰器
	检查必需参数是否存在
	
	Args:
		*required_params: 必需参数名称列表
	
	Usage:
		@frappe.whitelist()
		@validate_params("store_id", "task_id")
		def my_api(store_id, task_id, optional_param=None):
			...
	"""
	def decorator(fn):
		@wraps(fn)
		def wrapper(*args, **kwargs):
			missing_params = []
			for param in required_params:
				if param not in kwargs or kwargs[param] is None or kwargs[param] == "":
					missing_params.append(param)
			
			if missing_params:
				return error_response(
					message=f"缺少必需参数: {', '.join(missing_params)}",
					error_code=ErrorCode.INVALID_PARAMETER
				)
			
			return fn(*args, **kwargs)
		return wrapper
	return decorator


def log_api_call(fn):
	"""
	API调用日志装饰器
	记录API调用的用户、参数和结果
	
	Usage:
		@frappe.whitelist()
		@log_api_call
		def sensitive_api():
			...
	"""
	@wraps(fn)
	def wrapper(*args, **kwargs):
		user = frappe.session.user
		
		# 记录调用开始
		frappe.logger().info(f"API调用: {fn.__name__} | 用户: {user} | 参数: {kwargs}")
		
		try:
			result = fn(*args, **kwargs)
			
			# 记录调用成功
			frappe.logger().info(f"API成功: {fn.__name__} | 用户: {user}")
			
			return result
		except Exception as e:
			# 记录调用失败
			frappe.logger().error(f"API失败: {fn.__name__} | 用户: {user} | 错误: {str(e)}")
			raise
	return wrapper


# 组合装饰器：常用的装饰器组合
def api_endpoint(doctype=None, perm_type="read", require_transaction=False):
	"""
	组合装饰器：提供完整的API端点保护
	包括异常处理、权限检查、可选的事务管理
	
	Args:
		doctype: 需要检查权限的DocType
		perm_type: 权限类型
		require_transaction: 是否需要事务管理
	
	Usage:
		@frappe.whitelist()
		@api_endpoint(doctype="Commodity Schedule", perm_type="write", require_transaction=True)
		def update_items():
			...
	"""
	def decorator(fn):
		# 应用装饰器链
		wrapped = fn
		
		# 1. 最外层：异常处理
		wrapped = handle_exceptions(wrapped)
		
		# 2. 权限检查（如果指定了doctype）
		if doctype:
			wrapped = require_permission(doctype, perm_type)(wrapped)
		
		# 3. 事务管理（如果需要）
		if require_transaction:
			wrapped = with_transaction(wrapped)
		
		return wrapped
	return decorator