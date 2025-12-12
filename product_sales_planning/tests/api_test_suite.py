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
			self.test_api(
				module, "get_store_commodity_data",
				params={
					"store_id": self.test_data["store_id"],
					"task_id": self.test_data["task_id"],
					"start": 0,
					"page_length": 10
				},
				description="获取商品计划数据"
			)
		
		# 测试获取商品列表
		self.test_api(
			module, "get_product_list_for_dialog",
			params={"limit": 10},
			description="获取商品选择列表"
		)
	
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
