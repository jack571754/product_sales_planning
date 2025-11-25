import frappe
import json

@frappe.whitelist()
def get_filter_options():
    """
    获取筛选器选项
    修复方案：直接从源头表（Master DocTypes）获取数据，避免无数据时下拉框为空。
    """
    try:
        # 1. 获取所有【计划任务】
        # 来源：你的主表 "Schedule tasks"
        # 排序：按创建时间倒序，这样最新的任务排在前面
        tasks = frappe.get_all("Schedule tasks", 
                               fields=["name"], 
                               order_by="creation desc", 
                               pluck="name")
        
        # 2. 获取所有【店铺】
        # 来源：你的店铺基础资料表 "Store List" 
        # (根据 Tasks Store 字段定义推断出的)
        stores = frappe.get_all("Store List", 
                                fields=["name"], 
                                order_by="name asc", 
                                pluck="name")
        
        return {
            "stores": stores,
            "tasks": tasks
        }
    except Exception as e:
        frappe.log_error(title="获取筛选器选项失败", message=str(e))
        return {"stores": [], "tasks": []}

@frappe.whitelist()
def get_store_commodity_data(store_id=None, task_id=None, brand=None, category=None, 
                            start=0, page_length=20, search_term=None):
    """
    查询商品规划数据（支持多维度筛选 + 分页）
    
    Args:
        store_id: 店铺ID（可选）
        task_id: 任务ID（可选）
        brand: 品牌（可选）
        category: 类别（可选）
        start: 起始位置
        page_length: 每页条数
        search_term: 搜索关键词（可选）
    """
    try:
        # 1. 构造动态筛选条件
        filters = {}
        
        if store_id:
            filters["store_id"] = store_id
            
        if task_id:
            filters["task_id"] = task_id
        
        # 2. 获取总数
        total_count = frappe.db.count("Commodity Schedule", filters=filters)

        # 3. 获取分页数据
        commodity_schedules = frappe.get_all(
            "Commodity Schedule",
            filters=filters,
            fields=["name", "store_id", "task_id", "code", "quantity", "creation"],
            order_by="creation desc",
            limit_start=int(start),
            limit_page_length=int(page_length)
        )
        
        # 4. 补全关联的产品信息并应用额外筛选
        filtered_items = []
        for item in commodity_schedules:
            product_info = frappe.get_cached_value(
                "Product List", 
                item.code, 
                ["name1", "specifications", "brand", "category"], 
                as_dict=True
            )
            
            if product_info:
                item.update(product_info)
                
                # 应用品牌和类别筛选
                if brand and brand.lower() not in (item.get('brand') or '').lower():
                    continue
                    
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
                
                filtered_items.append(item)
        
        return {
            "data": filtered_items,
            "total_count": total_count  # 注意：这里返回的是数据库总数，不是过滤后的数量
        }

    except Exception as e:
        frappe.log_error(title="查询商品规划数据失败", message=str(e))
        return {"error": str(e), "data": [], "total_count": 0}


@frappe.whitelist()
def bulk_insert_commodity_schedule(store_id, codes, task_id=None):
    """
    批量插入商品计划
    """
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

        inserted_count = 0
        errors = []

        for code in codes:
            try:
                if not code:
                    errors.append(f"无效的商品代码")
                    continue
                
                # 检查是否存在
                filters = {"code": code}
                if store_id:
                    filters["store_id"] = store_id
                if task_id:
                    filters["task_id"] = task_id

                exists = frappe.db.exists("Commodity Schedule", filters)
                
                if not exists:
                    doc = frappe.new_doc("Commodity Schedule")
                    doc.store_id = store_id
                    doc.code = code
                    doc.task_id = task_id
                    doc.quantity = 0 
                    doc.sub_date = frappe.utils.today()
                    
                    doc.insert(ignore_permissions=True)
                    inserted_count += 1
                else:
                    errors.append(f"商品 {code} 已存在")
                    
            except Exception as e:
                errors.append(f"商品 {code}: {str(e)}")

        frappe.db.commit()

        if errors:
            frappe.log_error("批量添加部分失败", "\n".join(errors))

        return {
            "status": "success", 
            "count": inserted_count,
            "errors": errors[:10]  # 只返回前10条错误
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(title="批量添加商品致命错误", message=str(e))
        return {"status": "error", "msg": f"系统错误: {str(e)}"}


@frappe.whitelist()
def batch_update_quantity(names, quantity):
    """
    批量修改数量
    
    Args:
        names: 记录名称列表（JSON字符串或列表）
        quantity: 新的数量值
    """
    try:
        # 处理参数
        if isinstance(names, str):
            names = json.loads(names)
        
        if not names or not isinstance(names, list):
            return {"status": "error", "msg": "未选择任何记录"}
        
        quantity = int(quantity)
        updated_count = 0
        
        for name in names:
            try:
                frappe.db.set_value("Commodity Schedule", name, "quantity", quantity)
                updated_count += 1
            except Exception as e:
                frappe.log_error(f"更新记录失败: {name}", str(e))
        
        frappe.db.commit()
        
        return {
            "status": "success",
            "count": updated_count,
            "msg": f"成功修改 {updated_count} 条记录"
        }
        
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(title="批量修改失败", message=str(e))
        return {"status": "error", "msg": str(e)}


@frappe.whitelist()
def batch_delete_items(names):
    """
    批量删除记录
    
    Args:
        names: 记录名称列表（JSON字符串或列表）
    """
    try:
        # 处理参数
        if isinstance(names, str):
            names = json.loads(names)
        
        if not names or not isinstance(names, list):
            return {"status": "error", "msg": "未选择任何记录"}
        
        deleted_count = 0
        
        for name in names:
            try:
                frappe.delete_doc("Commodity Schedule", name, ignore_permissions=True)
                deleted_count += 1
            except Exception as e:
                frappe.log_error(f"删除记录失败: {name}", str(e))
        
        frappe.db.commit()
        
        return {
            "status": "success",
            "count": deleted_count,
            "msg": f"成功删除 {deleted_count} 条记录"
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
    
    Args:
        store_id: 店铺ID
        mechanism_names: 机制名称列表
        task_id: 任务ID（可选）
    """
    try:
        if isinstance(mechanism_names, str):
            mechanism_names = json.loads(mechanism_names)
            
        if not mechanism_names:
            return {"status": "error", "msg": "未选择任何机制"}

        inserted_count = 0
        errors = []

        for mech_name in mechanism_names:
            if not frappe.db.exists("Product Mechanism", mech_name):
                errors.append(f"机制 {mech_name} 不存在")
                continue
                
            mech_doc = frappe.get_doc("Product Mechanism", mech_name)
            
            if mech_doc.product_list:
                for item in mech_doc.product_list:
                    product_code = item.name1
                    default_qty = item.quantity or 1
                    
                    try:
                        filters = {"store_id": store_id, "code": product_code}
                        if task_id:
                            filters["task_id"] = task_id

                        exists = frappe.db.exists("Commodity Schedule", filters)
                        
                        if not exists:
                            new_doc = frappe.new_doc("Commodity Schedule")
                            new_doc.store_id = store_id
                            new_doc.code = product_code
                            new_doc.task_id = task_id
                            new_doc.quantity = default_qty
                            new_doc.sub_date = frappe.utils.today()
                            
                            new_doc.insert(ignore_permissions=True)
                            inserted_count += 1
                    except Exception as inner_e:
                        errors.append(f"机制[{mech_name}]-产品[{product_code}]: {str(inner_e)}")

        frappe.db.commit()
        
        return {
            "status": "success",
            "count": inserted_count,
            "errors": errors[:10]
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(title="应用机制失败", message=str(e))
        return {"status": "error", "msg": str(e)}