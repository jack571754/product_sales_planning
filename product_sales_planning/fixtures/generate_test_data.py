#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试数据生成脚本

用法:
    bench --site site1.local execute product_sales_planning.fixtures.generate_test_data.generate_all_test_data
"""

import frappe
from frappe.utils import today, add_months, add_days
import random
from datetime import datetime, timedelta


def generate_all_test_data():
    """生成所有测试数据"""
    print("=" * 80)
    print("开始生成测试数据...")
    print("=" * 80)

    # 1. 生成产品列表
    print("\n[1/5] 生成产品列表...")
    products = generate_products(count=200)
    print(f"✅ 成功创建 {len(products)} 个产品")

    # 2. 生成店铺列表
    print("\n[2/5] 生成店铺列表...")
    stores = generate_stores(count=50)
    print(f"✅ 成功创建 {len(stores)} 个店铺")

    # 3. 生成计划任务
    print("\n[3/5] 生成计划任务...")
    tasks = generate_schedule_tasks(stores=stores, count=10)
    print(f"✅ 成功创建 {len(tasks)} 个计划任务")

    # 4. 生成产品机制
    print("\n[4/5] 生成产品机制...")
    mechanisms = generate_product_mechanisms(products=products, count=20)
    print(f"✅ 成功创建 {len(mechanisms)} 个产品机制")

    # 5. 生成商品计划数据
    print("\n[5/5] 生成商品计划数据...")
    schedules = generate_commodity_schedules(
        stores=stores,
        tasks=tasks,
        products=products,
        records_per_store=30
    )
    print(f"✅ 成功创建 {len(schedules)} 条商品计划记录")

    print("\n" + "=" * 80)
    print("测试数据生成完成！")
    print("=" * 80)
    print(f"\n📊 数据统计:")
    print(f"  - 产品: {len(products)}")
    print(f"  - 店铺: {len(stores)}")
    print(f"  - 计划任务: {len(tasks)}")
    print(f"  - 产品机制: {len(mechanisms)}")
    print(f"  - 商品计划: {len(schedules)}")
    print(f"\n🎉 总计: {len(products) + len(stores) + len(tasks) + len(mechanisms) + len(schedules)} 条记录")

    frappe.db.commit()


def generate_products(count=200):
    """生成产品列表"""
    products = []

    categories = ["食品", "饮料", "日用品", "个护", "家居", "文具", "玩具", "电子产品"]
    brands = ["品牌A", "品牌B", "品牌C", "品牌D", "品牌E", "品牌F", "品牌G", "品牌H"]
    specs = ["500g", "1kg", "250ml", "500ml", "1L", "小号", "中号", "大号", "标准装"]

    for i in range(1, count + 1):
        code = f"PROD{i:04d}"

        # 检查是否已存在
        if frappe.db.exists("Product List", code):
            products.append(code)
            continue

        category = random.choice(categories)
        brand = random.choice(brands)
        spec = random.choice(specs)

        doc = frappe.get_doc({
            "doctype": "Product List",
            "name": code,
            "name1": f"测试商品{i:04d}",
            "specifications": spec,
            "brand": brand,
            "category": category
        })

        doc.insert(ignore_permissions=True)
        products.append(code)

        if i % 50 == 0:
            print(f"  已创建 {i}/{count} 个产品...")
            frappe.db.commit()

    frappe.db.commit()
    return products


def generate_stores(count=50):
    """生成店铺列表"""
    stores = []

    channels = ["线上", "线下", "批发", "零售"]
    cities = ["北京", "上海", "广州", "深圳", "杭州", "成都", "武汉", "西安"]

    for i in range(1, count + 1):
        store_id = f"STORE{i:03d}"

        # 检查是否已存在
        if frappe.db.exists("Store List", store_id):
            stores.append(store_id)
            continue

        city = random.choice(cities)
        channel = random.choice(channels)

        doc = frappe.get_doc({
            "doctype": "Store List",
            "name": store_id,
            "shop_name": f"{city}{channel}店{i:03d}",
            "channel": channel
        })

        doc.insert(ignore_permissions=True)
        stores.append(store_id)

        if i % 20 == 0:
            print(f"  已创建 {i}/{count} 个店铺...")
            frappe.db.commit()

    frappe.db.commit()
    return stores


def generate_schedule_tasks(stores, count=10):
    """生成计划任务"""
    tasks = []

    task_types = ["MON", "PRO"]
    statuses = ["开启中", "已结束"]

    for i in range(1, count + 1):
        task_id = f"TASK{i:03d}"

        # 检查是否已存在
        if frappe.db.exists("Schedule tasks", task_id):
            tasks.append(task_id)
            continue

        task_type = random.choice(task_types)
        status = "开启中" if i <= count * 0.7 else "已结束"  # 70% 开启中

        # 随机选择开始和结束日期
        start_date = add_days(today(), random.randint(-30, 0))
        end_date = add_days(start_date, random.randint(30, 90))

        doc = frappe.get_doc({
            "doctype": "Schedule tasks",
            "name": task_id,
            "type": task_type,
            "status": status,
            "start_date": start_date,
            "end_date": end_date
        })

        # 添加店铺子表
        selected_stores = random.sample(stores, min(random.randint(5, 15), len(stores)))
        for store_id in selected_stores:
            doc.append("set_store", {
                "store_name": store_id,
                "user": f"user{random.randint(1, 10)}@example.com",
                "status": random.choice(["未提交", "已提交", "草稿"]),
                "approval_status": random.choice(["待发起审批", "审核中", "已通过", "已驳回"]),
                "sub_time": datetime.now() - timedelta(days=random.randint(0, 10))
            })

        doc.insert(ignore_permissions=True)
        tasks.append(task_id)

        if i % 5 == 0:
            print(f"  已创建 {i}/{count} 个计划任务...")
            frappe.db.commit()

    frappe.db.commit()
    return tasks


def generate_product_mechanisms(products, count=20):
    """生成产品机制"""
    mechanisms = []

    for i in range(1, count + 1):
        mech_id = f"MECH{i:03d}"

        # 检查是否已存在
        if frappe.db.exists("Product Mechanism", mech_id):
            mechanisms.append(mech_id)
            continue

        doc = frappe.get_doc({
            "doctype": "Product Mechanism",
            "name": mech_id,
            "mechanism_name": f"产品组合{i:03d}"
        })

        # 随机选择 5-10 个产品
        selected_products = random.sample(products, random.randint(5, 10))
        for product_code in selected_products:
            doc.append("product_list", {
                "name1": product_code,
                "quantity": random.randint(1, 10)
            })

        doc.insert(ignore_permissions=True)
        mechanisms.append(mech_id)

        if i % 10 == 0:
            print(f"  已创建 {i}/{count} 个产品机制...")
            frappe.db.commit()

    frappe.db.commit()
    return mechanisms


def generate_commodity_schedules(stores, tasks, products, records_per_store=30):
    """生成商品计划数据"""
    schedules = []

    # 只为开启中的任务生成数据
    active_tasks = [t for t in tasks if frappe.db.get_value("Schedule tasks", t, "status") == "开启中"]

    if not active_tasks:
        print("  ⚠️ 没有开启中的任务，跳过商品计划生成")
        return schedules

    total_records = len(stores) * records_per_store
    created = 0

    for store_id in stores:
        # 为每个店铺随机选择一个任务
        task_id = random.choice(active_tasks)

        # 随机选择产品
        selected_products = random.sample(products, min(records_per_store, len(products)))

        for product_code in selected_products:
            # 为每个产品生成 3-6 个月的数据
            num_months = random.randint(3, 6)

            for month_offset in range(num_months):
                sub_date = add_months(today(), month_offset).replace(day=1)

                # 检查是否已存在
                filters = {
                    "store_id": store_id,
                    "task_id": task_id,
                    "code": product_code,
                    "sub_date": sub_date
                }

                if frappe.db.exists("Commodity Schedule", filters):
                    continue

                doc = frappe.get_doc({
                    "doctype": "Commodity Schedule",
                    "store_id": store_id,
                    "task_id": task_id,
                    "code": product_code,
                    "quantity": random.randint(10, 500),
                    "sub_date": sub_date
                })

                doc.insert(ignore_permissions=True)
                schedules.append(doc.name)
                created += 1

                if created % 500 == 0:
                    print(f"  已创建 {created}/{total_records * 4} 条商品计划...")
                    frappe.db.commit()

    frappe.db.commit()
    return schedules


if __name__ == "__main__":
    generate_all_test_data()
