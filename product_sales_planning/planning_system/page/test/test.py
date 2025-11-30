import frappe
from frappe import _

def get_context(context):
    # 为页面设置上下文
    context.title = _("测试页面")