"""
创建审批人店铺范围分配测试数据

使用方法:
bench --site [site_name] execute product_sales_planning.fixtures.create_store_assignment.create_test_assignments
"""

import frappe


def create_test_assignments():
	"""创建测试审批人店铺分配"""

	print("\n" + "="*60)
	print("开始创建审批人店铺分配测试数据")
	print("="*60 + "\n")

	# 1. 确保测试用户存在
	ensure_test_users()

	# 2. 创建A角色负责1-10号店铺
	stores_a = get_stores_by_range(1, 10)
	if stores_a:
		create_assignment(
			approver="regional.manager.a@test.com",
			approver_role="Regional Manager",
			stores=stores_a
		)
	else:
		print("⚠️  未找到1-10号店铺,跳过创建A角色分配")

	# 3. 创建B角色负责11-13号店铺
	stores_b = get_stores_by_range(11, 13)
	if stores_b:
		create_assignment(
			approver="regional.manager.b@test.com",
			approver_role="Regional Manager",
			stores=stores_b
		)
	else:
		print("⚠️  未找到11-13号店铺,跳过创建B角色分配")

	frappe.db.commit()

	print("\n" + "="*60)
	print("✅ 审批人店铺分配创建完成!")
	print("="*60 + "\n")


def ensure_test_users():
	"""确保测试用户存在"""
	test_users = [
		{
			"email": "regional.manager.a@test.com",
			"first_name": "Regional Manager",
			"last_name": "A",
			"role": "Regional Manager"
		},
		{
			"email": "regional.manager.b@test.com",
			"first_name": "Regional Manager",
			"last_name": "B",
			"role": "Regional Manager"
		}
	]

	for user_data in test_users:
		if not frappe.db.exists("User", user_data["email"]):
			try:
				user = frappe.get_doc({
					"doctype": "User",
					"email": user_data["email"],
					"first_name": user_data["first_name"],
					"last_name": user_data["last_name"],
					"enabled": 1,
					"send_welcome_email": 0
				})
				user.insert(ignore_permissions=True)
				print(f"✅ 创建测试用户: {user_data['email']}")
			except Exception as e:
				print(f"⚠️  创建用户 {user_data['email']} 失败: {str(e)}")

		# 确保用户有Regional Manager角色
		if not frappe.db.exists("Has Role", {
			"parent": user_data["email"],
			"role": user_data["role"]
		}):
			try:
				user = frappe.get_doc("User", user_data["email"])
				user.append("roles", {"role": user_data["role"]})
				user.save(ignore_permissions=True)
				print(f"✅ 为用户 {user_data['email']} 添加角色 {user_data['role']}")
			except Exception as e:
				print(f"⚠️  添加角色失败: {str(e)}")


def get_stores_by_range(start, end):
	"""获取指定范围的店铺ID列表"""
	try:
		# 尝试多种店铺命名模式
		patterns = [
			f"STORE-{i:03d}" for i in range(start, end + 1)  # STORE-001, STORE-002
		]

		stores = []
		for pattern in patterns:
			if frappe.db.exists("Store List", pattern):
				stores.append(pattern)

		# 如果没有找到,尝试直接查询前N个店铺
		if not stores:
			all_stores = frappe.get_all(
				"Store List",
				fields=["name"],
				order_by="name",
				limit_page_length=end
			)
			if len(all_stores) >= start:
				stores = [s.name for s in all_stores[start-1:end]]

		return stores
	except Exception as e:
		frappe.log_error(title="获取店铺列表失败", message=str(e))
		return []


def create_assignment(approver, approver_role, stores):
	"""创建单个审批人店铺分配"""

	if not stores:
		print(f"⚠️  没有店铺可分配给 {approver}")
		return

	# 检查是否已存在
	existing = frappe.db.exists("Approver Store Assignment", {
		"approver": approver,
		"approver_role": approver_role
	})

	if existing:
		print(f"⚠️  审批人 {approver} 的分配已存在,跳过创建")
		return

	try:
		assignment = frappe.get_doc({
			"doctype": "Approver Store Assignment",
			"approver": approver,
			"approver_role": approver_role,
			"is_active": 1,
			"stores": [
				{"store_id": store_id}
				for store_id in stores
			]
		})

		assignment.insert(ignore_permissions=True)
		print(f"✅ 创建审批人分配: {approver} 负责 {len(stores)} 个店铺")
		print(f"   店铺列表: {', '.join(stores[:5])}{'...' if len(stores) > 5 else ''}")
	except Exception as e:
		frappe.log_error(title="创建审批人分配失败", message=str(e))
		print(f"❌ 创建审批人分配失败: {str(e)}")


if __name__ == "__main__":
	create_test_assignments()
