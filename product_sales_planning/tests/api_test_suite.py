"""
API测试套件
用于测试所有API接口的功能和响应格式
"""

import frappe
import json
from datetime import datetime


class APITestSuite:
	"""API测试套件"""
	
	def __init__(self):
		self.results = []
		self.test_data = {
			"store_id": None,
			"task_id": None,
			"product_code": None
		}
	
	def setup_test_data(self):
		"""准备测试数据"""
		print("📦 准备测试数据...")
		
		# 获取测试店铺
		stores = frappe.get_all("Store List", limit=1)
		if stores:
			self.test_data["store_id"] = stores[0].name
			print(f"✓ 测试店铺: {self.test_data['store_id']}")
		
		# 获取测试任务
		tasks = frappe.get_all("Schedule tasks", filters={"status": "开启中"}, limit=1)
		if tasks:
			self.test_data["task_id"] = tasks[0].name
			print(f"✓ 测试任务: {self.test_data['task_id']}")
		
		# 获取测试产品
		products = frappe.get_all("Product List", limit=1)
		if products:
			self.test_data["product_code"] = products[0].name
			print(f"✓ 测试产品: {self.test_data['product_code']}")
	
	def test_api(self, module, method, params=None, description=""):
		"""测试单个API"""
		api_path = f"{module}.{method}"
		
		try:
			# 调用API
			result = frappe.call(api_path, **params) if params else frappe.call(api_path)
			
			# 记录结果
			test_result = {
				"api": api_path,
				"description": description,
				"status": "✓ 成功",
				"params": params,
				"response": result,
				"error": None
			}
			
			print(f"✓ {api_path} - {description}")
			
		except Exception as e:
			test_result = {
				"api": api_path,
				"description": description,
				"status": "✗ 失败",
				"params": params,
				"response": None,
				"error": str(e)
			}
			print(f"✗ {api_path} - {description}: {str(e)}")
		
		self.results.append(test_result)
		return test_result

	def record_internal_test(self, name, passed, description="", details=None):
		"""记录不依赖 HTTP/Frappe Call 的内部测试结果。"""
		test_result = {
			"api": name,
			"description": description,
			"status": "✓ 成功" if passed else "✗ 失败",
			"params": None,
			"response": details,
			"error": None if passed else (details.get("error") if isinstance(details, dict) else str(details)),
		}
		self.results.append(test_result)
		print(f"{'✓' if passed else '✗'} {name} - {description}")
		return test_result
	
	def run_dashboard_tests(self):
		"""测试Dashboard API"""
		print("\n📊 测试Dashboard API...")
		
		module = "product_sales_planning.api.v1.dashboard"
		
		# 测试获取看板数据
		self.test_api(
			module, "get_dashboard_data",
			params={},
			description="获取看板数据（无过滤）"
		)
		
		self.test_api(
			module, "get_dashboard_data",
			params={"filters": json.dumps({"tab": "pending"})},
			description="获取待审批看板数据"
		)
		
		# 测试获取过滤选项
		self.test_api(
			module, "get_filter_options",
			description="获取过滤器选项"
		)
	
	def run_store_tests(self):
		"""测试Store API"""
		print("\n🏪 测试Store API...")
		
		module = "product_sales_planning.api.v1.store"
		
		# 测试获取过滤选项
		self.test_api(
			module, "get_filter_options",
			description="获取店铺过滤选项"
		)
		
		# 测试获取任务店铺状态
		if self.test_data["store_id"] and self.test_data["task_id"]:
			self.test_api(
				module, "get_tasks_store_status",
				params={
					"task_id": self.test_data["task_id"],
					"store_id": self.test_data["store_id"]
				},
				description="获取任务店铺状态"
			)

	def run_commodity_tests(self):
		"""测试Commodity API"""
		print("\n📦 测试Commodity API...")

		module = "product_sales_planning.api.v1.commodity"

		# 测试获取商品数据
		if self.test_data["store_id"]:
			res = self.test_api(
				module,
				"get_store_commodity_data",
				params={
					"store_id": self.test_data["store_id"],
					"task_id": self.test_data["task_id"],
					"start": 0,
					"page_length": 10,
				},
				description="获取商品计划数据",
			)
			# 关键字段检查：前端依赖 `status` 来判断渲染与错误处理（兼容旧版本）
			if res.get("response") and isinstance(res["response"], dict) and "status" not in res["response"]:
				res["status"] = "✗ 失败"
				res["error"] = "响应缺少 status 字段"
				print(f"✗ {module}.get_store_commodity_data - 响应缺少 status 字段")

		# 测试获取商品列表
		self.test_api(
			module,
			"get_product_list_for_dialog",
			params={"page": 1, "page_size": 10},
			description="获取商品选择列表",
		)

		# 内部兼容性测试
		self._test_task_months_from_task_id()
		self._test_multi_month_view_handles_empty_schedule_list()
		self._test_multi_month_view_respects_default_months()

	def _test_multi_month_view_handles_empty_schedule_list(self):
		"""覆盖：无任何计划记录时，多月视图仍应返回 default_months 作为表头且不报错。"""
		from product_sales_planning.services.commodity_service import CommodityScheduleService

		default_months = ["2025-12", "2026-01", "2026-02", "2026-03"]

		try:
			result = CommodityScheduleService._get_multi_month_view(
				[],
				brand=None,
				category=None,
				search_term=None,
				default_months=default_months,
			)
			passed = (
				(result.get("data") or []) == []
				and (result.get("months") or []) == default_months
				and int(result.get("total_count") or 0) == 0
				and result.get("view_mode") == "multi"
			)
			details = {"result": result, "expected_months": default_months}
			if not passed:
				details["error"] = "期望 data 为空且 months 等于 default_months，并返回 view_mode=multi"
			self.record_internal_test(
				"CommodityScheduleService._get_multi_month_view_empty",
				passed,
				description="空计划记录时仍返回月份表头且不报错",
				details=details,
			)
		except Exception as e:
			self.record_internal_test(
				"CommodityScheduleService._get_multi_month_view_empty",
				False,
				description="空计划记录时仍返回月份表头且不报错",
				details={"error": str(e)},
			)

	def _test_task_months_from_task_id(self):
		"""覆盖：任务编号 `YYYY-MM-...` 应生成从该月起未来4个月"""
		from product_sales_planning.services.commodity_service import CommodityScheduleService

		task_id = "2025-12-MON-745"
		expected = ["2025-12", "2026-01", "2026-02", "2026-03"]

		try:
			months = CommodityScheduleService.get_task_months(task_id, fallback_months=4)
			passed = months == expected
			details = {"task_id": task_id, "months": months, "expected": expected}
			if not passed:
				details["error"] = "get_task_months 返回月份不符合预期"
			self.record_internal_test(
				"CommodityScheduleService.get_task_months",
				passed,
				description="从任务编号解析月份并生成未来4个月",
				details=details,
			)
		except Exception as e:
			self.record_internal_test(
				"CommodityScheduleService.get_task_months",
				False,
				description="从任务编号解析月份并生成未来4个月",
				details={"error": str(e)},
			)

	def _test_multi_month_view_respects_default_months(self):
		"""覆盖：多月视图应严格按 default_months 过滤数据，但仍返回 default_months 作为表头"""
		from product_sales_planning.services.commodity_service import CommodityScheduleService

		# 构造一条 2025-12 的计划记录
		schedules = [
			frappe._dict(
				{
					"name": "TEST-CS-1",
					"code": "TEST-PROD-1",
					"quantity": 10,
					"sub_date": datetime(2025, 12, 1),
					"creation": datetime(2025, 12, 1, 12, 0, 0),
				}
			)
		]

		# 默认月份故意设置为不相关月份，数据应被过滤，但表头仍返回 default_months
		default_months = ["2026-01", "2026-02", "2026-03", "2026-04"]

		original_get_all = frappe.get_all

		def patched_get_all(doctype, *args, **kwargs):
			if doctype == "Product List":
				return []
			return original_get_all(doctype, *args, **kwargs)

		try:
			frappe.get_all = patched_get_all
			result = CommodityScheduleService._get_multi_month_view(
				schedules,
				brand=None,
				category=None,
				search_term=None,
				default_months=default_months,
			)

			passed = not (result.get("data") or []) and (result.get("months") or []) == default_months
			details = {"result": result}
			if not passed:
				details["error"] = "期望 data 为空且 months 等于 default_months"
			self.record_internal_test(
				"CommodityScheduleService._get_multi_month_view",
				passed,
				description="default_months 过滤数据但仍返回表头月份",
				details=details,
			)
		except Exception as e:
			self.record_internal_test(
				"CommodityScheduleService._get_multi_month_view",
				False,
				description="default_months 过滤数据但仍返回表头月份",
				details={"error": str(e)},
			)
		finally:
			frappe.get_all = original_get_all
	
	def run_approval_tests(self):
		"""测试Approval API"""
		print("\n✅ 测试Approval API...")
		
		module = "product_sales_planning.api.v1.approval"
		
		# 测试获取审批状态
		if self.test_data["store_id"] and self.test_data["task_id"]:
			self.test_api(
				module, "get_approval_status",
				params={
					"task_id": self.test_data["task_id"],
					"store_id": self.test_data["store_id"]
				},
				description="获取审批状态"
			)
			
			self.test_api(
				module, "check_can_edit",
				params={
					"task_id": self.test_data["task_id"],
					"store_id": self.test_data["store_id"]
				},
				description="检查是否可编辑"
			)
	
	def run_import_export_tests(self):
		"""测试Import/Export API"""
		print("\n📥 测试Import/Export API...")
		
		module = "product_sales_planning.api.v1.import_export"
		
		# 测试下载模板
		self.test_api(
			module, "download_import_template",
			params={"task_id": self.test_data["task_id"]},
			description="下载导入模板"
		)
		
		# 测试导出数据
		if self.test_data["store_id"]:
			self.test_api(
				module, "export_commodity_data",
				params={
					"store_id": self.test_data["store_id"],
					"task_id": self.test_data["task_id"]
				},
				description="导出商品数据"
			)
	
	def run_mechanism_tests(self):
		"""测试Mechanism API"""
		print("\n⚙️ 测试Mechanism API...")
		
		module = "product_sales_planning.api.v1.mechanism"
		
		# 获取测试机制
		mechanisms = frappe.get_all("Product Mechanism", limit=1)
		if mechanisms and self.test_data["store_id"]:
			self.test_api(
				module, "apply_mechanisms",
				params={
					"store_id": self.test_data["store_id"],
					"mechanism_names": json.dumps([mechanisms[0].name]),
					"task_id": self.test_data["task_id"]
				},
				description="应用产品机制"
			)
	
	def run_all_tests(self):
		"""运行所有测试"""
		print("=" * 60)
		print("🚀 开始API测试")
		print("=" * 60)
		
		# 准备测试数据
		self.setup_test_data()
		
		# 运行各模块测试
		self.run_dashboard_tests()
		self.run_store_tests()
		self.run_commodity_tests()
		self.run_approval_tests()
		self.run_import_export_tests()
		self.run_mechanism_tests()
		
		# 生成测试报告
		return self.generate_report()
	
	def generate_report(self):
		"""生成测试报告"""
		print("\n" + "=" * 60)
		print("📊 测试报告")
		print("=" * 60)
		
		total = len(self.results)
		success = sum(1 for r in self.results if "成功" in r["status"])
		failed = total - success
		
		print(f"\n总测试数: {total}")
		print(f"成功: {success} ✓")
		print(f"失败: {failed} ✗")
		print(f"成功率: {(success/total*100):.1f}%" if total > 0 else "成功率: 0%")
		
		if failed > 0:
			print("\n失败的测试:")
			for r in self.results:
				if "失败" in r["status"]:
					print(f"  ✗ {r['api']}: {r['error']}")
		
		return {
			"total": total,
			"success": success,
			"failed": failed,
			"success_rate": success/total*100 if total > 0 else 0,
			"results": self.results
		}


def run_api_tests():
	"""运行API测试的入口函数"""
	suite = APITestSuite()
	return suite.run_all_tests()
