import frappe
import json

def get_context(context):
	"""
	为 Planning SPA 提供上下文数据
	注入 CSRF Token 和用户会话信息
	"""
	# 注入 CSRF Token，这对 POST 请求至关重要
	csrf_token = frappe.sessions.get_csrf_token()
	frappe.db.commit()  # 确保 session 写入
	context.csrf_token = csrf_token

	# 注入用户会话信息（只包含可序列化的数据）
	boot_info = {
		"user": frappe.session.user,
		"user_id": frappe.session.user,
		"user_image": frappe.session.data.user_image if hasattr(frappe.session.data, 'user_image') else None,
		"user_fullname": frappe.utils.get_fullname(frappe.session.user),
		"csrf_token": csrf_token,
	}
	context.boot = boot_info

	# 设置页面标题
	context.title = "Planning System"

	# 可以在这里添加其他初始化数据
	# context.custom_data = get_custom_data()
