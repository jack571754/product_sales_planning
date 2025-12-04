import frappe
import json

@frappe.whitelist()
def get_filter_options():
    """
    获取筛选器选项
    修复：返回字典列表以包含显示名称（Label）和值（Value）
    """
    try:
        # 1. 获取所有任务 (任务通常直接用 ID 显示即可，或者你可以加个 title 字段)
        tasks = frappe.get_all("Schedule tasks", 
                               fields=["name"], 
                               order_by="creation desc")
        
        # 2. 获取所有店铺 (关键修改：同时获取 name 和 shop_name)
        stores = frappe.get_all("Store List", 
                                fields=["name", "shop_name"], 
                                order_by="shop_name asc")
        
        return {
            "stores": stores, # 返回 [{'name': 'ID', 'shop_name': '名称'}, ...]
            "tasks": tasks
        }
    except Exception as e:
        frappe.log_error(title="获取筛选器选项失败", message=str(e))
        return {"stores": [], "tasks": []}

@frappe.whitelist()
def get_store_commodity_data(store_id=None, task_id=None, brand=None, category=None,
                            start=0, page_length=20, search_term=None, view_mode="single"):
    """
    查询商品规划数据（支持多维度筛选 + 分页 + 多月视图）

    Args:
        store_id: 店铺ID（可选）
        task_id: 任务ID（可选）
        brand: 品牌（可选）
        category: 类别（可选）
        start: 起始位置
        page_length: 每页条数
        search_term: 搜索关键词（可选）
        view_mode: 视图模式 ("single" 单月视图 | "multi" 多月视图)
    """
    try:
        # 1. 构造动态筛选条件
        filters = {}

        if store_id:
            filters["store_id"] = store_id

        if task_id:
            filters["task_id"] = task_id

        # 🔥 新增：计算未来4个月的日期范围（不含当前月）
        from datetime import datetime
        from dateutil.relativedelta import relativedelta

        current_date = datetime.now()
        start_month = current_date.replace(day=1) + relativedelta(months=1)  # 下个月第一天
        end_month = start_month + relativedelta(months=4)  # 未来4个月后

        # 添加日期范围筛选
        filters["sub_date"] = [">=", start_month.strftime('%Y-%m-%d')]

        # 2. 获取数据（只获取未来4个月的数据）
        commodity_schedules = frappe.get_all(
            "Commodity Schedule",
            filters=filters,
            fields=["name", "store_id", "task_id", "code", "quantity", "sub_date", "creation"],
            order_by="code asc, sub_date asc"
        )

        # 🔥 过滤：只保留未来4个月内的数据
        commodity_schedules = [
            item for item in commodity_schedules
            if item.sub_date and item.sub_date < end_month.date()
        ]

        if view_mode == "multi":
            # 🔥 新增：始终生成未来4个月
            from datetime import datetime
            from dateutil.relativedelta import relativedelta

            current_date = datetime.now()
            default_months = []
            for i in range(1, 5):  # 未来4个月(不含当前月)
                month_date = current_date + relativedelta(months=i)
                default_months.append(month_date.strftime('%Y-%m'))

            # 多月视图：按产品聚合，横向展示各月数据
            product_data = {}
            month_set = set(default_months)  # 🔥 修改：初始化为默认月份

            # 🔥 优化1：先收集所有产品的月份数据
            for item in commodity_schedules:
                code = item.code
                sub_date = item.sub_date

                if code not in product_data:
                    product_data[code] = {
                        "code": code,
                        "months": {},
                        "records": {}  # 存储记录名和修改时间
                    }

                # 添加月份数据
                if sub_date:
                    month_key = sub_date.strftime('%Y-%m') if hasattr(sub_date, 'strftime') else str(sub_date)[:7]

                    # 存储记录信息，用于后续批量查询
                    if month_key not in product_data[code]["records"]:
                        product_data[code]["records"][month_key] = []

                    product_data[code]["records"][month_key].append({
                        "name": item.name,
                        "quantity": item.quantity,
                        "creation": item.creation
                    })

                    month_set.add(month_key)

            # 🔥 优化2：批量获取所有产品信息（一次查询）
            all_codes = list(product_data.keys())
            product_infos = frappe.get_all(
                "Product List",
                filters={"name": ["in", all_codes]},
                fields=["name", "name1", "specifications", "brand", "category"]
            )

            # 转换为字典以便快速查找
            product_info_dict = {p.name: p for p in product_infos}

            # 🔥 优化3：处理重复记录（使用creation时间，避免额外查询）
            for code, data in product_data.items():
                for month_key, records in data["records"].items():
                    if len(records) > 1:
                        # 有多条记录，选择最新的（按creation排序）
                        latest_record = max(records, key=lambda x: x["creation"])
                        data["months"][month_key] = {
                            "quantity": latest_record["quantity"],
                            "record_name": latest_record["name"]
                        }
                    else:
                        # 只有一条记录
                        data["months"][month_key] = {
                            "quantity": records[0]["quantity"],
                            "record_name": records[0]["name"]
                        }

            # 🔥 优化4：应用筛选（使用批量获取的产品信息）
            filtered_product_data = {}
            for code, data in product_data.items():
                product_info = product_info_dict.get(code)

                if not product_info:
                    continue

                # 应用品牌筛选
                if brand and brand.lower() not in (product_info.brand or '').lower():
                    continue

                # 应用类别筛选
                if category and category.lower() not in (product_info.category or '').lower():
                    continue

                # 应用搜索关键词
                if search_term:
                    search_lower = search_term.lower()
                    if not any([
                        search_lower in (product_info.name1 or '').lower(),
                        search_lower in (code or '').lower(),
                        search_lower in (product_info.brand or '').lower()
                    ]):
                        continue

                # 通过筛选，添加到结果中
                filtered_product_data[code] = {
                    "code": code,
                    "name1": product_info.name1,
                    "specifications": product_info.specifications,
                    "brand": product_info.brand,
                    "category": product_info.category,
                    "months": data["months"]
                }

            # 转换为列表并排序月份
            result_data = list(filtered_product_data.values())
            sorted_months = sorted(list(month_set))

            return {
                "data": result_data,
                "months": sorted_months,
                "total_count": len(result_data),
                "view_mode": "multi"
            }
        else:
            # 🔥 修复：单月视图 - 先筛选，再分页
            # 1. 补全产品信息并应用筛选
            filtered_items = []
            for item in commodity_schedules:
                product_info = frappe.get_cached_value(
                    "Product List",
                    item.code,
                    ["name1", "specifications", "brand", "category"],
                    as_dict=True
                )

                if not product_info:
                    continue

                # 合并产品信息到item
                item.update(product_info)

                # 应用品牌筛选
                if brand and brand.lower() not in (item.get('brand') or '').lower():
                    continue

                # 应用类别筛选
                if category and category.lower() not in (item.get('category') or '').lower():
                    continue

                # 应用搜索关键词
                if search_term:
                    search_lower = search_term.lower()
                    if not any([
                        search_lower in (item.get('name1') or '').lower(),
                        search_lower in (item.get('code') or '').lower(),
                        search_lower in (item.get('brand') or '').lower()
                    ]):
                        continue

                # 通过所有筛选条件
                filtered_items.append(item)

            # 2. 计算筛选后的总数
            total_count = len(filtered_items)

            # 3. 分页
            start_idx = int(start)
            end_idx = start_idx + int(page_length)
            paged_items = filtered_items[start_idx:end_idx]

            return {
                "data": paged_items,
                "total_count": total_count,
                "view_mode": "single"
            }

    except Exception as e:
        frappe.log_error(title="查询商品规划数据失败", message=str(e))
        return {"error": str(e), "data": [], "total_count": 0}


@frappe.whitelist()
def bulk_insert_commodity_schedule(store_id, codes, task_id=None):
    """
    批量插入商品计划

    优化点：
    1. 使用 doc.insert() 而非 ignore_permissions，触发验证逻辑
    2. 改进错误处理和参数验证
    """
    # 参数验证
    if not store_id or not task_id:
        return {"status": "error", "msg": "必须指定店铺和任务ID"}

    try:
        # 处理参数
        if isinstance(codes, str):
            try:
                codes = json.loads(codes)
            except json.JSONDecodeError:
                return {"status": "error", "msg": "商品代码格式错误"}

        if not codes or not isinstance(codes, list):
            return {"status": "error", "msg": "未选择任何商品"}

        # 验证店铺和任务是否存在
        if not frappe.db.exists("Store List", store_id):
            return {"status": "error", "msg": f"店铺 {store_id} 不存在"}

        if not frappe.db.exists("Schedule tasks", task_id):
            return {"status": "error", "msg": f"计划任务 {task_id} 不存在"}

        inserted_count = 0
        skipped_count = 0
        errors = []

        for code in codes:
            try:
                if not code:
                    errors.append("无效的商品代码")
                    continue

                # 🔥 修复：使用下个月的第一天
                from datetime import datetime
                from dateutil.relativedelta import relativedelta
                next_month = datetime.now() + relativedelta(months=1)
                sub_date = next_month.strftime('%Y-%m') + "-01"

                # 检查是否存在
                filters = {
                    "code": code,
                    "store_id": store_id,
                    "task_id": task_id,
                    "sub_date": sub_date
                }

                exists = frappe.db.exists("Commodity Schedule", filters)

                if not exists:
                    # 使用 DocType 的 insert() 方法，触发 validate() 钩子
                    doc = frappe.new_doc("Commodity Schedule")
                    doc.store_id = store_id
                    doc.code = code
                    doc.task_id = task_id
                    doc.quantity = 0
                    doc.sub_date = sub_date

                    # 移除 ignore_permissions，让权限系统正常工作
                    doc.insert()
                    inserted_count += 1
                else:
                    skipped_count += 1

            except frappe.ValidationError as ve:
                errors.append(f"商品 {code}: {str(ve)}")
            except Exception as e:
                errors.append(f"商品 {code}: {str(e)}")

        frappe.db.commit()

        if errors:
            frappe.log_error("批量添加部分失败", "\n".join(errors))

        msg = f"成功添加 {inserted_count} 条"
        if skipped_count > 0:
            msg += f"，跳过 {skipped_count} 条已存在记录"

        return {
            "status": "success",
            "count": inserted_count,
            "skipped": skipped_count,
            "errors": errors[:10],  # 只返回前10条错误
            "msg": msg
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(title="批量添加商品致命错误", message=str(e))
        return {"status": "error", "msg": f"系统错误: {str(e)}"}


@frappe.whitelist()
def batch_update_quantity(names, quantity):
    """
    批量修改数量

    优化点：
    1. 使用 doc.save() 触发验证逻辑
    2. 改进参数验证和错误处理
    """
    try:
        # 处理参数
        if isinstance(names, str):
            names = json.loads(names)

        if not names or not isinstance(names, list):
            return {"status": "error", "msg": "未选择任何记录"}

        # 验证数量参数
        try:
            quantity = int(quantity)
            if quantity < 0:
                return {"status": "error", "msg": "数量不能为负数"}
        except (ValueError, TypeError):
            return {"status": "error", "msg": "数量必须是有效的整数"}

        updated_count = 0
        errors = []

        for name in names:
            try:
                # 使用 get_doc + save 而非直接 set_value，触发验证
                doc = frappe.get_doc("Commodity Schedule", name)
                doc.quantity = quantity
                doc.save()
                updated_count += 1
            except frappe.PermissionError:
                errors.append(f"记录 {name}: 无权限修改")
            except Exception as e:
                errors.append(f"记录 {name}: {str(e)}")
                frappe.log_error(f"更新记录失败: {name}", str(e))

        frappe.db.commit()

        msg = f"成功修改 {updated_count} 条记录"
        if errors:
            msg += f"，{len(errors)} 条失败"

        return {
            "status": "success",
            "count": updated_count,
            "errors": errors[:10],
            "msg": msg
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(title="批量修改失败", message=str(e))
        return {"status": "error", "msg": str(e)}


@frappe.whitelist()
def batch_delete_items(names):
    """
    批量删除记录

    优化点：
    1. 移除 ignore_permissions，让权限系统正常工作
    2. 改进错误处理
    """
    try:
        # 处理参数
        if isinstance(names, str):
            names = json.loads(names)

        if not names or not isinstance(names, list):
            return {"status": "error", "msg": "未选择任何记录"}

        deleted_count = 0
        errors = []

        for name in names:
            try:
                # 移除 ignore_permissions，让权限系统正常工作
                frappe.delete_doc("Commodity Schedule", name)
                deleted_count += 1
            except frappe.PermissionError:
                errors.append(f"记录 {name}: 无权限删除")
            except Exception as e:
                errors.append(f"记录 {name}: {str(e)}")
                frappe.log_error(f"删除记录失败: {name}", str(e))

        frappe.db.commit()

        msg = f"成功删除 {deleted_count} 条记录"
        if errors:
            msg += f"，{len(errors)} 条失败"

        return {
            "status": "success",
            "count": deleted_count,
            "errors": errors[:10],
            "msg": msg
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(title="批量删除失败", message=str(e))
        return {"status": "error", "msg": str(e)}


@frappe.whitelist()
def batch_delete_by_codes(store_id, task_id, codes):
    """
    根据产品编码批量删除记录（用于多月视图）

    优化点：
    1. 移除 ignore_permissions
    2. 改进错误处理和参数验证
    """
    try:
        # 处理参数
        if isinstance(codes, str):
            codes = json.loads(codes)

        if not codes or not isinstance(codes, list):
            return {"status": "error", "msg": "未选择任何商品"}

        # 参数验证
        if not store_id:
            return {"status": "error", "msg": "店铺ID不能为空"}

        if not task_id:
            return {"status": "error", "msg": "任务ID不能为空"}

        deleted_count = 0
        errors = []

        for code in codes:
            try:
                # 查找该产品的所有记录
                filters = {
                    "code": code,
                    "store_id": store_id,
                    "task_id": task_id
                }

                records = frappe.get_all("Commodity Schedule", filters=filters, fields=["name"])

                # 删除所有找到的记录
                for record in records:
                    try:
                        frappe.delete_doc("Commodity Schedule", record.name)
                        deleted_count += 1
                    except frappe.PermissionError:
                        errors.append(f"产品 {code} 记录 {record.name}: 无权限删除")
                    except Exception as inner_e:
                        errors.append(f"产品 {code} 记录 {record.name}: {str(inner_e)}")

            except Exception as e:
                errors.append(f"产品 {code}: {str(e)}")
                frappe.log_error(f"删除产品记录失败: {code}", str(e))

        frappe.db.commit()

        msg = f"成功删除 {deleted_count} 条记录"
        if errors:
            msg += f"，{len(errors)} 条失败"

        return {
            "status": "success",
            "count": deleted_count,
            "errors": errors[:10],
            "msg": msg
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(title="批量删除失败", message=str(e))
        return {"status": "error", "msg": str(e)}


@frappe.whitelist()
def update_line_item(name, field, value):
    """
    更新单个字段
    """
    try:
        frappe.db.set_value("Commodity Schedule", name, field, value)
        frappe.db.commit()
        return {"status": "success", "msg": "已保存"}
    except Exception as e:
        frappe.log_error(title="更新字段失败", message=str(e))
        return {"status": "error", "msg": str(e)}


@frappe.whitelist()
def apply_mechanisms(store_id, mechanism_names, task_id=None):
    """
    应用产品机制（批量添加机制中的所有产品）

    优化点：
    1. 移除 ignore_permissions
    2. 改进参数验证和错误处理
    """
    try:
        # 参数验证
        if not store_id:
            return {"status": "error", "msg": "店铺ID不能为空"}

        if isinstance(mechanism_names, str):
            mechanism_names = json.loads(mechanism_names)

        if not mechanism_names or not isinstance(mechanism_names, list):
            return {"status": "error", "msg": "未选择任何机制"}

        # 验证店铺是否存在
        if not frappe.db.exists("Store List", store_id):
            return {"status": "error", "msg": f"店铺 {store_id} 不存在"}

        # 验证任务是否存在
        if task_id and not frappe.db.exists("Schedule tasks", task_id):
            return {"status": "error", "msg": f"计划任务 {task_id} 不存在"}

        inserted_count = 0
        skipped_count = 0
        errors = []

        for mech_name in mechanism_names:
            if not frappe.db.exists("Product Mechanism", mech_name):
                errors.append(f"机制 {mech_name} 不存在")
                continue

            try:
                mech_doc = frappe.get_doc("Product Mechanism", mech_name)

                if mech_doc.product_list:
                    for item in mech_doc.product_list:
                        product_code = item.name1
                        default_qty = item.quantity or 1

                        try:
                            # 🔥 修复：使用下个月的第一天
                            from datetime import datetime
                            from dateutil.relativedelta import relativedelta
                            next_month = datetime.now() + relativedelta(months=1)
                            sub_date = next_month.strftime('%Y-%m') + "-01"

                            filters = {
                                "store_id": store_id,
                                "code": product_code,
                                "sub_date": sub_date
                            }
                            if task_id:
                                filters["task_id"] = task_id

                            exists = frappe.db.exists("Commodity Schedule", filters)

                            if not exists:
                                new_doc = frappe.new_doc("Commodity Schedule")
                                new_doc.store_id = store_id
                                new_doc.code = product_code
                                new_doc.task_id = task_id
                                new_doc.quantity = default_qty
                                new_doc.sub_date = sub_date

                                # 移除 ignore_permissions
                                new_doc.insert()
                                inserted_count += 1
                            else:
                                skipped_count += 1

                        except frappe.ValidationError as ve:
                            errors.append(f"机制[{mech_name}]-产品[{product_code}]: {str(ve)}")
                        except frappe.PermissionError:
                            errors.append(f"机制[{mech_name}]-产品[{product_code}]: 无权限创建")
                        except Exception as inner_e:
                            errors.append(f"机制[{mech_name}]-产品[{product_code}]: {str(inner_e)}")

            except Exception as mech_e:
                errors.append(f"机制 {mech_name}: {str(mech_e)}")

        frappe.db.commit()

        msg = f"成功添加 {inserted_count} 条"
        if skipped_count > 0:
            msg += f"，跳过 {skipped_count} 条已存在记录"

        return {
            "status": "success",
            "inserted_count": inserted_count,
            "skipped_count": skipped_count,
            "skipped": skipped_count,
            "errors": errors[:10],
            "msg": msg
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(title="应用机制失败", message=str(e))
        return {"status": "error", "msg": str(e)}


@frappe.whitelist()
def update_month_quantity(store_id, task_id, code, month, quantity):
    """
    更新指定产品的某个月份的计划数量

    优化点：
    1. 使用 doc.save() 触发验证
    2. 改进参数验证和错误处理
    """
    try:
        # 参数验证
        if not store_id or not task_id or not code or not month:
            return {"status": "error", "msg": "缺少必填参数"}

        # 验证数量
        try:
            quantity = int(quantity)
            if quantity < 0:
                return {"status": "error", "msg": "数量不能为负数"}
        except (ValueError, TypeError):
            return {"status": "error", "msg": "数量必须是有效的整数"}

        # 验证月份格式
        if not month or len(month) != 7 or month[4] != '-':
            return {"status": "error", "msg": "月份格式错误，应为 YYYY-MM"}

        # 构造日期 (月份第一天)
        sub_date = f"{month}-01"

        # 查找记录
        filters = {
            "store_id": store_id,
            "task_id": task_id,
            "code": code,
            "sub_date": sub_date
        }

        existing = frappe.db.get_value("Commodity Schedule", filters, "name")

        if existing:
            # 更新现有记录 - 使用 get_doc + save 触发验证
            doc = frappe.get_doc("Commodity Schedule", existing)
            doc.quantity = quantity
            doc.save()
        else:
            # 创建新记录 - 移除 ignore_permissions
            new_doc = frappe.new_doc("Commodity Schedule")
            new_doc.store_id = store_id
            new_doc.task_id = task_id
            new_doc.code = code
            new_doc.quantity = quantity
            new_doc.sub_date = sub_date
            new_doc.insert()

        frappe.db.commit()
        return {"status": "success", "msg": "已保存"}

    except frappe.ValidationError as ve:
        frappe.db.rollback()
        return {"status": "error", "msg": str(ve)}
    except frappe.PermissionError:
        frappe.db.rollback()
        return {"status": "error", "msg": "无权限操作"}
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(title="更新月份数量失败", message=str(e))
        return {"status": "error", "msg": str(e)}


@frappe.whitelist()
def download_import_template(store_id=None, task_id=None):
    """
    生成并下载Excel导入模板（直接下载，不返回JSON）

    Args:
        store_id: 店铺ID（可选）
        task_id: 任务ID（可选）
    """
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        import io
        from datetime import datetime
        from dateutil.relativedelta import relativedelta

        # 创建工作簿
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "商品计划导入模板"

        # 定义样式
        header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF", size=11)
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        # 生成月份列（未来4个月）
        current_date = datetime.now()
        months = []
        for i in range(1, 5):  # 从下个月开始，共4个月
            month_date = current_date + relativedelta(months=i)
            months.append(month_date.strftime('%Y-%m'))

        # 设置表头
        headers = ['产品编码', '产品名称'] + months
        ws.append(headers)

        # 设置表头样式
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = border

        # 添加示例数据（2行）
        example_row1 = ['PROD001', '示例商品A'] + [100 + i * 10 for i in range(len(months))]
        example_row2 = ['PROD002', '示例商品B'] + [50 + i * 5 for i in range(len(months))]

        for row_data in [example_row1, example_row2]:
            ws.append(row_data)
            for col_num in range(1, len(headers) + 1):
                cell = ws.cell(row=ws.max_row, column=col_num)
                cell.border = border
                if col_num > 2:  # 数量列右对齐
                    cell.alignment = Alignment(horizontal='right', vertical='center')

        # 设置列宽
        ws.column_dimensions['A'].width = 15  # 产品编码
        ws.column_dimensions['B'].width = 25  # 产品名称
        for i in range(len(months)):
            col_letter = openpyxl.utils.get_column_letter(i + 3)
            ws.column_dimensions[col_letter].width = 12  # 月份列

        # 添加说明工作表
        ws_info = wb.create_sheet("填写说明")
        instructions = [
            ["商品计划导入模板使用说明", ""],
            ["", ""],
            ["1. 基本要求", ""],
            ["", "• 产品编码必须在系统中存在"],
            ["", "• 产品名称仅用于参考，不影响导入"],
            ["", "• 月份格式支持：2025-01、202501、2025/01"],
            ["", "• 数量必须为整数，空值或0将被跳过"],
            ["", ""],
            ["2. 导入规则", ""],
            ["", "• 如果记录已存在（相同店铺+任务+产品+月份），将更新数量"],
            ["", "• 如果记录不存在，将创建新记录"],
            ["", "• 导入前请确保已选择店铺和计划任务"],
            ["", ""],
            ["3. 注意事项", ""],
            ["", "• 请勿修改表头行"],
            ["", "• 建议单次导入不超过1000行数据"],
            ["", "• 导入完成后请检查导入结果"],
            ["", ""],
            ["4. 示例数据", ""],
            ["", "• 第一个工作表中包含2行示例数据"],
            ["", "• 请删除示例数据后填写实际数据"],
        ]

        for row_data in instructions:
            ws_info.append(row_data)

        # 设置说明页样式
        ws_info.column_dimensions['A'].width = 20
        ws_info.column_dimensions['B'].width = 50
        title_cell = ws_info['A1']
        title_cell.font = Font(bold=True, size=14, color="4472C4")

        # 保存到内存
        file_content = io.BytesIO()
        wb.save(file_content)
        file_content.seek(0)

        # 生成文件名
        filename = f"commodity_plan_import_template_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        # 直接返回文件下载
        frappe.response['filename'] = filename
        frappe.response['filecontent'] = file_content.getvalue()
        frappe.response['type'] = 'download'

    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        frappe.log_error(title="生成导入模板失败", message=error_msg)
        frappe.throw(f"生成模板失败: {str(e)}")


@frappe.whitelist()
def import_commodity_data(store_id, task_id, file_url):
    """
    从Excel导入商品计划数据

    Args:
        store_id: 店铺ID
        task_id: 任务ID
        file_url: 上传的Excel文件URL

    Excel格式要求:
        第一行: 表头 (产品编码 | 产品名称 | 月份1 | 月份2 | ...)
        数据行: 产品编码 | 产品名称 | 数量1 | 数量2 | ...
    """
    try:
        import openpyxl
        from frappe.utils.file_manager import get_file_path
        import traceback

        if not store_id or not task_id:
            return {"status": "error", "msg": "必须指定店铺和任务ID"}

        # 获取文件路径
        try:
            file_path = get_file_path(file_url)
        except Exception as e:
            return {"status": "error", "msg": f"无法获取文件: {str(e)}"}

        # 读取Excel文件
        try:
            wb = openpyxl.load_workbook(file_path, data_only=True)
            ws = wb.active
        except Exception as e:
            return {"status": "error", "msg": f"无法读取Excel文件: {str(e)}"}

        # 读取表头
        headers = []
        for cell in ws[1]:
            if cell.value:
                headers.append(str(cell.value).strip())
            else:
                headers.append("")

        if len(headers) < 3:
            return {"status": "error", "msg": "Excel格式错误：至少需要3列（产品编码、产品名称、月份数据）"}

        # 解析月份列（从第3列开始）
        month_columns = [h for h in headers[2:] if h]  # 过滤空表头

        if not month_columns:
            return {"status": "error", "msg": "Excel格式错误：未找到月份列"}

        inserted_count = 0
        updated_count = 0
        errors = []
        skipped_count = 0

        # 从第2行开始读取数据
        for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            if not row or not row[0]:  # 跳过空行
                skipped_count += 1
                continue

            try:
                product_code = str(row[0]).strip()
            except:
                errors.append(f"第{row_idx}行: 产品编码格式错误")
                continue

            # 验证产品是否存在
            if not frappe.db.exists("Product List", product_code):
                errors.append(f"第{row_idx}行: 产品编码 {product_code} 不存在")
                continue

            # 处理每个月份的数据
            for col_idx, month_str in enumerate(month_columns):
                try:
                    # 获取数量值（从第3列开始，索引为2+col_idx）
                    if len(row) <= 2 + col_idx:
                        continue

                    quantity_value = row[2 + col_idx]

                    # 跳过空值或0
                    if quantity_value is None or quantity_value == '' or quantity_value == 0:
                        continue

                    try:
                        quantity = int(float(quantity_value))
                    except:
                        errors.append(f"第{row_idx}行-{month_str}: 数量格式错误 ({quantity_value})")
                        continue

                    # 解析月份字符串为日期
                    if isinstance(month_str, str):
                        # 支持格式: "2025-01" 或 "202501" 或 "2025/01"
                        month_str_clean = month_str.replace('/', '-').strip()
                        if len(month_str_clean) == 6 and month_str_clean.isdigit():  # 202501
                            month_str_clean = f"{month_str_clean[:4]}-{month_str_clean[4:]}"

                        # 验证格式
                        if '-' in month_str_clean and len(month_str_clean.split('-')) == 2:
                            sub_date = f"{month_str_clean}-01"
                        else:
                            errors.append(f"第{row_idx}行: 月份格式错误 ({month_str})")
                            continue
                    else:
                        errors.append(f"第{row_idx}行: 月份格式错误 ({month_str})")
                        continue

                    # 检查记录是否存在
                    filters = {
                        "store_id": store_id,
                        "task_id": task_id,
                        "code": product_code,
                        "sub_date": sub_date
                    }

                    existing = frappe.db.get_value("Commodity Schedule", filters, "name")

                    if existing:
                        # 更新现有记录
                        frappe.db.set_value("Commodity Schedule", existing, "quantity", quantity)
                        updated_count += 1
                    else:
                        # 🔥 修复：创建新记录时不使用 ignore_permissions，让 autoname 正常工作
                        new_doc = frappe.new_doc("Commodity Schedule")
                        new_doc.store_id = store_id
                        new_doc.task_id = task_id
                        new_doc.code = product_code
                        new_doc.quantity = quantity
                        new_doc.sub_date = sub_date

                        # 移除 ignore_permissions，让 Frappe 的 autoname 正常工作
                        new_doc.insert()
                        inserted_count += 1

                except Exception as inner_e:
                    errors.append(f"第{row_idx}行-{month_str}: {str(inner_e)}")

        frappe.db.commit()

        msg = f"成功导入 {inserted_count} 条，更新 {updated_count} 条"
        if skipped_count > 0:
            msg += f"，跳过 {skipped_count} 行空数据"

        return {
            "status": "success",
            "inserted": inserted_count,
            "updated": updated_count,
            "skipped": skipped_count,
            "errors": errors[:20],  # 只返回前20条错误
            "msg": msg
        }

    except Exception as e:
        frappe.db.rollback()
        import traceback
        error_msg = traceback.format_exc()
        frappe.log_error(title="Excel导入失败", message=error_msg)
        return {"status": "error", "msg": f"导入失败: {str(e)}"}


@frappe.whitelist()
def batch_update_month_quantities(store_id, task_id, updates):
    """
    批量更新月份数量（用于Excel粘贴功能）- 优化版

    Args:
        store_id: 店铺ID
        task_id: 任务ID
        updates: 更新列表 [{"code": "PROD001", "month": "2025-01", "quantity": 100}, ...]
    """
    try:
        # 参数验证
        if not store_id or not task_id:
            return {"status": "error", "msg": "必须指定店铺和任务ID"}

        # 处理JSON字符串参数
        if isinstance(updates, str):
            updates = json.loads(updates)

        if not isinstance(updates, list):
            return {"status": "error", "msg": "updates参数必须是列表"}

        # 🔥 优化1：预处理数据，解析日期
        processed_updates = []
        errors = []

        for update in updates:
            try:
                code = update.get("code")
                month = update.get("month")
                quantity = int(update.get("quantity", 0))

                if not code or not month or quantity == 0:
                    continue

                # 解析月份，生成sub_date
                from datetime import datetime
                try:
                    if '-' in month:
                        sub_date = datetime.strptime(month + "-01", "%Y-%m-%d").date()
                    elif '/' in month:
                        sub_date = datetime.strptime(month.replace('/', '-') + "-01", "%Y-%m-%d").date()
                    elif len(month) == 6:
                        sub_date = datetime.strptime(month + "01", "%Y%m%d").date()
                    else:
                        errors.append(f"无效的月份格式: {month}")
                        continue
                except Exception as date_err:
                    errors.append(f"日期解析失败 {month}: {str(date_err)}")
                    continue

                processed_updates.append({
                    "code": code,
                    "month": month,
                    "sub_date": sub_date,
                    "quantity": quantity
                })

            except Exception as inner_e:
                errors.append(f"处理 {code}-{month} 失败: {str(inner_e)}")

        if not processed_updates:
            return {"status": "success", "count": 0, "inserted": 0, "updated": 0, "errors": errors, "msg": "没有有效数据"}

        # 🔥 优化2：批量查询现有记录（一次查询）
        sub_dates = [u["sub_date"] for u in processed_updates]
        codes = list(set([u["code"] for u in processed_updates]))

        existing_records = frappe.get_all(
            "Commodity Schedule",
            filters={
                "store_id": store_id,
                "task_id": task_id,
                "code": ["in", codes],
                "sub_date": ["in", sub_dates]
            },
            fields=["name", "code", "sub_date", "quantity"]
        )

        # 创建查找字典
        existing_dict = {}
        for record in existing_records:
            key = f"{record.code}_{record.sub_date}"
            existing_dict[key] = record

        # 🔥 优化3：分类处理（批量更新和批量插入）
        to_update = []
        to_insert = []

        for update in processed_updates:
            key = f"{update['code']}_{update['sub_date']}"
            if key in existing_dict:
                # 需要更新
                existing_record = existing_dict[key]
                if existing_record.quantity != update["quantity"]:
                    to_update.append({
                        "name": existing_record.name,
                        "quantity": update["quantity"]
                    })
            else:
                # 需要插入
                to_insert.append({
                    "doctype": "Commodity Schedule",
                    "store_id": store_id,
                    "task_id": task_id,
                    "code": update["code"],
                    "quantity": update["quantity"],
                    "sub_date": update["sub_date"]
                })

        # 🔥 优化4：批量更新（使用SQL）
        updated_count = 0
        if to_update:
            for item in to_update:
                frappe.db.set_value("Commodity Schedule", item["name"], "quantity", item["quantity"])
                updated_count += 1

        # 🔥 优化5：批量插入（使用bulk_insert）
        inserted_count = 0
        if to_insert:
            try:
                # 批量插入
                for doc_data in to_insert:
                    doc = frappe.new_doc("Commodity Schedule")
                    doc.update(doc_data)
                    doc.insert()
                    inserted_count += 1
            except Exception as insert_err:
                errors.append(f"批量插入失败: {str(insert_err)}")

        frappe.db.commit()

        msg = f"成功插入 {inserted_count} 条，更新 {updated_count} 条"
        return {
            "status": "success",
            "count": inserted_count + updated_count,
            "inserted": inserted_count,
            "updated": updated_count,
            "errors": errors[:10],
            "msg": msg
        }

    except Exception as e:
        frappe.db.rollback()
        import traceback
        error_msg = traceback.format_exc()
        frappe.log_error(title="批量更新月份数量失败", message=error_msg)
        return {"status": "error", "msg": f"批量更新失败: {str(e)}"}


@frappe.whitelist()
def import_mechanism_excel(store_id, task_id, file_url):
    """
    从Excel导入机制数据并自动拆分到Commodity Schedule

    Excel格式：
    第一行：表头（机制名称 | 产品编码 | 产品名称 | 单位数量 | 月份1 | 月份2 | ...）
    数据行：机制名称 | 产品编码 | 产品名称 | 单位数量 | 数量1 | 数量2 | ...

    功能：
    1. 读取Excel中每行的产品和数量
    2. 计算最终数量：机制数量 × 单位数量 = 最终数量
    3. 插入到Commodity Schedule表
    """
    try:
        import openpyxl
        from frappe.utils.file_manager import get_file_path

        # 参数验证
        if not store_id or not task_id:
            return {"status": "error", "msg": "必须指定店铺和任务ID"}

        # 获取文件路径
        try:
            file_path = get_file_path(file_url)
        except Exception as e:
            return {"status": "error", "msg": f"无法获取文件: {str(e)}"}

        # 读取Excel
        try:
            wb = openpyxl.load_workbook(file_path, data_only=True)
            ws = wb.active
        except Exception as e:
            return {"status": "error", "msg": f"无法读取Excel文件: {str(e)}"}

        # 读取表头
        headers = []
        for cell in ws[1]:
            if cell.value:
                headers.append(str(cell.value).strip())
            else:
                headers.append("")

        if len(headers) < 5:
            return {"status": "error", "msg": "Excel格式错误：至少需要5列（机制名称、产品编码、产品名称、单位数量、月份数据）"}

        # 解析月份列（从第5列开始，索引4）
        month_columns = [h for h in headers[4:] if h]

        if not month_columns:
            return {"status": "error", "msg": "Excel格式错误：未找到月份列"}

        inserted_count = 0
        updated_count = 0
        errors = []
        skipped_count = 0

        # 从第2行开始读取数据
        for row_idx, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            if not row or not row[0]:
                skipped_count += 1
                continue

            try:
                # 读取行数据
                mechanism_name = str(row[0]).strip() if row[0] else ""
                product_code = str(row[1]).strip() if row[1] else ""
                product_name = str(row[2]).strip() if row[2] else ""
                unit_quantity = row[3] if row[3] else 1

                # 验证必填字段
                if not product_code:
                    errors.append(f"第{row_idx}行: 产品编码不能为空")
                    continue

                # 验证产品是否存在
                if not frappe.db.exists("Product List", product_code):
                    errors.append(f"第{row_idx}行: 产品 {product_code} 不存在")
                    continue

                # 验证单位数量
                try:
                    unit_quantity = int(float(unit_quantity))
                    if unit_quantity <= 0:
                        unit_quantity = 1
                except:
                    errors.append(f"第{row_idx}行: 单位数量格式错误 ({unit_quantity})，使用默认值1")
                    unit_quantity = 1

                # 处理每个月份的数量
                for col_idx, month_str in enumerate(month_columns):
                    try:
                        # 获取机制数量（从第5列开始，索引为4+col_idx）
                        if len(row) <= 4 + col_idx:
                            continue

                        mechanism_quantity = row[4 + col_idx]

                        # 跳过空值或0
                        if mechanism_quantity is None or mechanism_quantity == '' or mechanism_quantity == 0:
                            continue

                        try:
                            mechanism_quantity = int(float(mechanism_quantity))
                        except:
                            errors.append(f"第{row_idx}行-{month_str}: 数量格式错误 ({mechanism_quantity})")
                            continue

                        # 解析月份
                        if isinstance(month_str, str):
                            month_str_clean = month_str.replace('/', '-').strip()
                            if len(month_str_clean) == 6 and month_str_clean.isdigit():
                                month_str_clean = f"{month_str_clean[:4]}-{month_str_clean[4:]}"

                            if '-' in month_str_clean and len(month_str_clean.split('-')) == 2:
                                sub_date = f"{month_str_clean}-01"
                            else:
                                errors.append(f"第{row_idx}行: 月份格式错误 ({month_str})")
                                continue
                        else:
                            errors.append(f"第{row_idx}行: 月份格式错误 ({month_str})")
                            continue

                        # 🔥 关键：计算最终数量 = 机制数量 × 单位数量
                        final_quantity = mechanism_quantity * unit_quantity

                        # 检查记录是否存在
                        filters = {
                            "store_id": store_id,
                            "task_id": task_id,
                            "code": product_code,
                            "sub_date": sub_date
                        }

                        existing = frappe.db.get_value("Commodity Schedule", filters, "name")

                        if existing:
                            # 更新现有记录（累加数量）
                            current_qty = frappe.db.get_value("Commodity Schedule", existing, "quantity") or 0
                            new_qty = current_qty + final_quantity
                            frappe.db.set_value("Commodity Schedule", existing, "quantity", new_qty)
                            updated_count += 1
                        else:
                            # 创建新记录
                            new_doc = frappe.new_doc("Commodity Schedule")
                            new_doc.store_id = store_id
                            new_doc.task_id = task_id
                            new_doc.code = product_code
                            new_doc.quantity = final_quantity
                            new_doc.sub_date = sub_date
                            new_doc.insert()
                            inserted_count += 1

                    except Exception as inner_e:
                        errors.append(f"第{row_idx}行-{month_str}: {str(inner_e)}")

            except Exception as row_e:
                errors.append(f"第{row_idx}行: {str(row_e)}")

        frappe.db.commit()

        msg = f"成功导入 {inserted_count} 条，更新 {updated_count} 条"
        if skipped_count > 0:
            msg += f"，跳过 {skipped_count} 行空数据"

        return {
            "status": "success",
            "inserted": inserted_count,
            "updated": updated_count,
            "skipped": skipped_count,
            "errors": errors[:20],
            "msg": msg
        }

    except Exception as e:
        frappe.db.rollback()
        import traceback
        error_msg = traceback.format_exc()
        frappe.log_error(title="机制Excel导入失败", message=error_msg)
        return {"status": "error", "msg": f"导入失败: {str(e)}"}


@frappe.whitelist()
def download_mechanism_template():
    """
    生成并下载机制导入模板
    """
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from frappe.utils.file_manager import save_file
        import io
        from datetime import datetime
        from dateutil.relativedelta import relativedelta

        # 创建工作簿
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "机制导入模板"

        # 定义样式
        header_fill = PatternFill(start_color="70AD47", end_color="70AD47", fill_type="solid")
        header_font = Font(bold=True, color="FFFFFF", size=11)
        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        # 生成月份列（不含当前月的未来4个月）
        current_date = datetime.now()
        months = []
        for i in range(1, 5):
            month_date = current_date + relativedelta(months=i)
            months.append(month_date.strftime('%Y-%m'))

        # 设置表头
        headers = ['机制名称', '产品编码', '产品名称', '单位数量'] + months
        ws.append(headers)

        # 设置表头样式
        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = border

        # 获取示例机制数据
        sample_mechanisms = frappe.get_all(
            "Product Mechanism",
            filters={"is_active": 1},
            fields=["name", "mechanism_name"],
            limit=2,
            order_by="creation desc"
        )

        # 添加示例数据
        if sample_mechanisms:
            for idx, mech in enumerate(sample_mechanisms):
                mechanism_name = mech.mechanism_name or mech.name

                # 获取机制的产品列表
                mech_doc = frappe.get_doc("Product Mechanism", mech.name)

                if mech_doc.product_list:
                    for product_item in mech_doc.product_list:
                        product_code = product_item.name1
                        product_quantity = product_item.quantity or 1

                        # 获取产品名称
                        product_name = frappe.db.get_value("Product List", product_code, "name1") or product_code

                        # 生成示例数量
                        quantities = [10 + idx * 5 + i * 5 for i in range(len(months))]
                        row_data = [mechanism_name, product_code, product_name, product_quantity] + quantities
                        ws.append(row_data)

                        for col_num in range(1, len(headers) + 1):
                            cell = ws.cell(row=ws.max_row, column=col_num)
                            cell.border = border
                            if col_num <= 3:
                                cell.alignment = Alignment(horizontal='left', vertical='center')
                            elif col_num == 4:
                                cell.alignment = Alignment(horizontal='center', vertical='center')
                            else:
                                cell.alignment = Alignment(horizontal='right', vertical='center')
        else:
            # 如果没有机制，添加空示例
            example_rows = [
                ['机制A', 'PROD001', '产品X', 2] + [10 + i * 5 for i in range(len(months))],
                ['机制A', 'PROD002', '产品Y', 3] + [10 + i * 5 for i in range(len(months))],
                ['机制B', 'PROD003', '产品Z', 1] + [20 + i * 10 for i in range(len(months))],
                ['机制B', 'PROD004', '产品W', 5] + [20 + i * 10 for i in range(len(months))],
            ]

            for row_data in example_rows:
                ws.append(row_data)
                for col_num in range(1, len(headers) + 1):
                    cell = ws.cell(row=ws.max_row, column=col_num)
                    cell.border = border
                    if col_num <= 3:
                        cell.alignment = Alignment(horizontal='left', vertical='center')
                    elif col_num == 4:
                        cell.alignment = Alignment(horizontal='center', vertical='center')
                    else:
                        cell.alignment = Alignment(horizontal='right', vertical='center')

        # 设置列宽
        ws.column_dimensions['A'].width = 20
        ws.column_dimensions['B'].width = 15
        ws.column_dimensions['C'].width = 25
        ws.column_dimensions['D'].width = 12
        for i in range(len(months)):
            col_letter = openpyxl.utils.get_column_letter(i + 5)
            ws.column_dimensions[col_letter].width = 12

        # 添加机制明细工作表
        ws_detail = wb.create_sheet("机制明细")

        # 获取所有激活的机制
        mechanisms = frappe.get_all(
            "Product Mechanism",
            filters={"is_active": 1},
            fields=["name", "mechanism_name", "content_summary"],
            order_by="mechanism_name asc"
        )

        # 设置机制明细表头
        detail_headers = ["机制名称", "包含产品明细"]
        ws_detail.append(detail_headers)

        # 设置表头样式
        for col_num in range(1, 3):
            cell = ws_detail.cell(row=1, column=col_num)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = border

        # 填充机制明细数据
        for mech in mechanisms:
            mechanism_name = mech.mechanism_name or mech.name
            content_summary = mech.content_summary or "（未设置产品）"

            ws_detail.append([mechanism_name, content_summary])

            # 设置单元格样式
            row_num = ws_detail.max_row
            for col_num in range(1, 3):
                cell = ws_detail.cell(row=row_num, column=col_num)
                cell.border = border
                if col_num == 1:
                    cell.alignment = Alignment(horizontal='left', vertical='center')
                else:
                    cell.alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

        # 设置列宽
        ws_detail.column_dimensions['A'].width = 25
        ws_detail.column_dimensions['B'].width = 60

        # 添加说明工作表
        ws_info = wb.create_sheet("填写说明")
        instructions = [
            ["机制导入模板使用说明", ""],
            ["", ""],
            ["1. 什么是机制导入？", ""],
            ["", "• 机制是预定义的产品组合（如促销套装）"],
            ["", "• 导入机制数量后，系统会自动拆分到各个单品"],
            ["", "• 例如：机制A包含产品X(2个)和产品Y(3个)"],
            ["", "  导入10个机制A，系统会自动创建："],
            ["", "  - 产品X: 10 × 2 = 20个"],
            ["", "  - 产品Y: 10 × 3 = 30个"],
            ["", ""],
            ["2. Excel格式说明", ""],
            ["", "• 第1列：机制名称（可重复，表示同一机制）"],
            ["", "• 第2列：产品编码（必填）"],
            ["", "• 第3列：产品名称（仅供参考）"],
            ["", "• 第4列：单位数量（该产品在机制中的数量）"],
            ["", "• 第5列起：各月份的机制数量"],
            ["", "• 同一机制的多个产品，机制名称会重复"],
            ["", ""],
            ["3. 填写要求", ""],
            ["", "• 机制名称必须在系统中存在（请参考'机制明细'工作表）"],
            ["", "• 月份格式支持：2025-01、202501、2025/01"],
            ["", "• 数量必须为整数，空值或0将被跳过"],
            ["", "• 如果记录已存在，数量会累加"],
            ["", ""],
            ["4. 注意事项", ""],
            ["", "• 请先在系统中创建机制"],
            ["", "• 确保机制中已添加产品"],
            ["", "• 导入前请选择店铺和计划任务"],
            ["", "• 建议单次导入不超过500行"],
            ["", ""],
            ["5. 查看机制明细", ""],
            ["", "• 请查看'机制明细'工作表，了解每个机制包含的产品"],
            ["", "• 机制明细中显示了每个产品的数量"],
        ]

        for row_data in instructions:
            ws_info.append(row_data)

        ws_info.column_dimensions['A'].width = 25
        ws_info.column_dimensions['B'].width = 50
        title_cell = ws_info['A1']
        title_cell.font = Font(bold=True, size=14, color="70AD47")

        # 保存到内存
        file_content = io.BytesIO()
        wb.save(file_content)
        file_content.seek(0)

        # 生成文件名
        filename = f"mechanism_import_template_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

        # 保存文件
        file_doc = save_file(
            fname=filename,
            content=file_content.read(),
            dt=None,
            dn=None,
            is_private=0
        )

        return {
            "status": "success",
            "file_url": file_doc.file_url,
            "file_name": filename
        }

    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        frappe.log_error(title="生成机制模板失败", message=error_msg)
        return {"status": "error", "msg": f"生成模板失败: {str(e)}"}


# ========== 审批流程相关API ==========

@frappe.whitelist()
def get_approval_status(task_id, store_id):
	"""
	获取审批状态和流程信息

	Args:
		task_id: 任务ID
		store_id: 店铺ID

	Returns:
		dict: 审批状态信息
	"""
	try:
		# 导入审批API模块
		from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import (
			get_workflow_for_task_store,
			get_approval_history,
			check_can_edit
		)

		# 获取审批流程信息
		workflow_info = get_workflow_for_task_store(task_id, store_id)

		# 获取审批历史
		history_info = get_approval_history(task_id, store_id)

		# 检查是否可编辑
		edit_info = check_can_edit(task_id, store_id)

		# 获取当前用户角色
		current_user = frappe.session.user
		user_roles = frappe.get_roles(current_user)

		# 检查是否可以审批
		can_approve = False
		if workflow_info.get("has_workflow") and workflow_info.get("current_state"):
			current_state = workflow_info["current_state"]
			if current_state.get("approval_status") == "待审批":
				# 获取当前步骤的审批角色
				current_step = current_state.get("current_step", 0)
				if current_step > 0 and workflow_info.get("workflow"):
					steps = workflow_info["workflow"].get("steps", [])
					if current_step <= len(steps):
						required_role = steps[current_step - 1].get("approver_role")
						can_approve = required_role in user_roles or "System Manager" in user_roles

		return {
			"status": "success",
			"workflow": workflow_info,
			"history": history_info.get("data", []),
			"can_edit": edit_info.get("can_edit", True),
			"edit_reason": edit_info.get("reason", ""),
			"can_approve": can_approve,
			"user_roles": user_roles
		}

	except Exception as e:
		frappe.log_error(title="获取审批状态失败", message=str(e))
		return {
			"status": "error",
			"message": str(e)
		}