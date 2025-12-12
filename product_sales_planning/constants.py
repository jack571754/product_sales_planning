"""
系统常量定义
统一管理所有魔法数字和字符串常量
"""


class ApprovalStatus:
	"""审批状态常量"""
	PENDING = "待审批"
	APPROVED = "已通过"
	REJECTED = "已驳回"


class SubmissionStatus:
	"""提交状态常量"""
	NOT_STARTED = "未开始"
	SUBMITTED = "已提交"


class TaskStatus:
	"""任务状态常量"""
	NOT_STARTED = "未开始"
	IN_PROGRESS = "开启中"
	COMPLETED = "已完成"
	CLOSED = "已关闭"


class ViewMode:
	"""视图模式常量"""
	SINGLE = "single"
	MULTI = "multi"


class ErrorCode:
	"""错误代码常量"""
	VALIDATION_ERROR = "VALIDATION_ERROR"
	PERMISSION_DENIED = "PERMISSION_DENIED"
	NOT_FOUND = "NOT_FOUND"
	DUPLICATE = "DUPLICATE"
	INTERNAL_ERROR = "INTERNAL_ERROR"
	INVALID_PARAMETER = "INVALID_PARAMETER"
	TRANSACTION_FAILED = "TRANSACTION_FAILED"


class Permission:
	"""权限类型常量"""
	READ = "read"
	WRITE = "write"
	CREATE = "create"
	DELETE = "delete"
	SUBMIT = "submit"
	CANCEL = "cancel"
	AMEND = "amend"


class DocType:
	"""DocType名称常量"""
	COMMODITY_SCHEDULE = "Commodity Schedule"
	STORE_LIST = "Store List"
	PRODUCT_LIST = "Product List"
	SCHEDULE_TASKS = "Schedule tasks"
	TASKS_STORE = "Tasks Store"
	APPROVAL_WORKFLOW = "Approval Workflow"


# 允许修改的字段白名单
COMMODITY_EDITABLE_FIELDS = ["quantity", "sub_date"]

# 分页限制
MAX_PAGE_SIZE = 1000
DEFAULT_PAGE_SIZE = 20
MIN_PAGE_SIZE = 1

# 导入导出限制
MAX_IMPORT_ROWS = 10000
MAX_EXPORT_ROWS = 50000

# 批量操作限制
MAX_BATCH_SIZE = 1000

# 允许的排序方向
ALLOWED_SORT_ORDERS = ["ASC", "DESC", "asc", "desc"]

# 允许的文件类型
ALLOWED_FILE_EXTENSIONS = [".xlsx", ".xls"]
MAX_FILE_SIZE_MB = 10