app_name = "product_sales_planning"
app_title = "planning system"
app_publisher = "lj"
app_description = "product sales planning system"
app_email = "571754723@qq.com"
app_license = "mit"

# Apps
# ------------------


api_methods = [
    "product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_dashboard_data",
    "product_sales_planning.planning_system.page.store_detail.store_detail.get_store_commodity_data",
    "product_sales_planning.planning_system.page.store_detail.store_detail.update_line_item",
    "product_sales_planning.planning_system.page.store_detail.store_detail.insert_commodity_schedule",
    "product_sales_planning.planning_system.page.store_detail.store_detail.bulk_insert_commodity_schedule",
    "product_sales_planning.planning_system.page.store_detail.store_detail.batch_update_quantity",
    "product_sales_planning.planning_system.page.store_detail.store_detail.batch_delete_items",
    "product_sales_planning.planning_system.page.store_detail.store_detail.batch_delete_by_codes",
    "product_sales_planning.planning_system.page.store_detail.store_detail.get_filter_options",
    "product_sales_planning.planning_system.page.store_detail.store_detail.apply_mechanisms",
    "product_sales_planning.planning_system.page.store_detail.store_detail.import_commodity_data",
    "product_sales_planning.planning_system.page.store_detail.store_detail.download_import_template",
    "product_sales_planning.planning_system.page.store_detail.store_detail.update_month_quantity",
    "product_sales_planning.planning_system.page.store_detail.store_detail.import_mechanism_excel",
    "product_sales_planning.planning_system.page.store_detail.store_detail.download_mechanism_template",
    "product_sales_planning.planning_system.page.store_detail.store_detail.batch_update_month_quantities",
    # Approval workflow APIs
    "product_sales_planning.planning_system.doctype.approval_workflow.approval_api.submit_for_approval",
    "product_sales_planning.planning_system.doctype.approval_workflow.approval_api.approve_task_store",
    "product_sales_planning.planning_system.doctype.approval_workflow.approval_api.withdraw_approval",
    "product_sales_planning.planning_system.doctype.approval_workflow.approval_api.get_approval_history",
    "product_sales_planning.planning_system.doctype.approval_workflow.approval_api.get_workflow_for_task_store",
    "product_sales_planning.planning_system.doctype.approval_workflow.approval_api.check_can_edit",
    "product_sales_planning.planning_system.page.store_detail.store_detail.get_approval_status",
    # Data view APIs
    "product_sales_planning.planning_system.page.data_view.data_view.get_data_view",
    "product_sales_planning.planning_system.page.data_view.data_view.get_data_view_filter_options",
    "product_sales_planning.planning_system.page.data_view.data_view.export_data_view"
]


# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "product_sales_planning",
# 		"logo": "/assets/product_sales_planning/logo.png",
# 		"title": "planning system",
# 		"route": "/product_sales_planning",
# 		"has_permission": "product_sales_planning.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/product_sales_planning/css/common-styles.css"
app_include_js = "/assets/product_sales_planning/js/product_sales_planning.js"

# include js, css files in header of web template
# web_include_css = "/assets/product_sales_planning/css/product_sales_planning.css"
# web_include_js = "/assets/product_sales_planning/js/product_sales_planning.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "product_sales_planning/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "product_sales_planning/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Page Routes
# ----------

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "product_sales_planning.utils.jinja_methods",
# 	"filters": "product_sales_planning.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "product_sales_planning.install.before_install"
# after_install = "product_sales_planning.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "product_sales_planning.uninstall.before_uninstall"
# after_uninstall = "product_sales_planning.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "product_sales_planning.utils.before_app_install"
# after_app_install = "product_sales_planning.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "product_sales_planning.utils.before_app_uninstall"
# after_app_uninstall = "product_sales_planning.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "product_sales_planning.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"product_sales_planning.tasks.all"
# 	],
# 	"daily": [
# 		"product_sales_planning.tasks.daily"
# 	],
# 	"hourly": [
# 		"product_sales_planning.tasks.hourly"
# 	],
# 	"weekly": [
# 		"product_sales_planning.tasks.weekly"
# 	],
# 	"monthly": [
# 		"product_sales_planning.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "product_sales_planning.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "product_sales_planning.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "product_sales_planning.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["product_sales_planning.utils.before_request"]
# after_request = ["product_sales_planning.utils.after_request"]

# Job Events
# ----------
# before_job = ["product_sales_planning.utils.before_job"]
# after_job = ["product_sales_planning.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"product_sales_planning.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Page Routes
# ----------
page_routes = [
    {"path": "planning-dashboard", "page": "planning_dashboard"},
    {"path": "store-detail", "page": "store_detail"},
    {"path": "data-view", "page": "data_view"}
]

