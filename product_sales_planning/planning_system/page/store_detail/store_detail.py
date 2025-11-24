import frappe
import json

# --- 1. 查询接口 (修复了之前的 missing attribute 错误) ---
@frappe.whitelist()
def get_store_commodity_data(store_id, start=0, page_length=20, search_term=None):
    """
    查询指定店铺的商品规划数据（支持分页 + 搜索）
    """
    if not store_id:
        return {"data": [], "total_count": 0}

    try:
        # 1. 构造筛选条件
        count_filters = {"store_id": store_id}
        if search_term:
             count_filters["code"] = ["like", f"%{search_term}%"]

        # 2. 获取总数
        total_count = frappe.db.count("Commodity Schedule", filters=count_filters)

        # 3. 获取分页数据
        commodity_schedules = frappe.get_all(
            "Commodity Schedule",
            filters=count_filters,
            fields=["name", "store_id", "code", "quantity", "creation"],
            order_by="creation desc",
            limit_start=int(start),
            limit_page_length=int(page_length)
        )
        
        # 4. 补全关联的产品信息
        for item in commodity_schedules:
             product_info = frappe.get_cached_value("Product List", item.code, ["name1", "specifications", "brand", "category"], as_dict=True)
             if product_info:
                 item.update(product_info)
        
        return {
            "data": commodity_schedules,
            "total_count": total_count
        }

    except Exception as e:
        frappe.log_error(title="店铺详情查询失败", message=str(e))
        return {"error": str(e), "data": [], "total_count": 0}


# 修改前：def bulk_insert_commodity_schedule(store_id, codes):
# 修改后：增加 task_id 参数

@frappe.whitelist()
def bulk_insert_commodity_schedule(store_id, codes, task_id=None):
    """
    批量插入接口（修复：增加 task_id 以支持自动命名规则）
    """
    try:
        # 1. 处理前端传来的数组
        if isinstance(codes, str):
            codes = json.loads(codes)
        
        if not codes or not isinstance(codes, list):
            return {"status": "error", "msg": "未选择任何商品"}

        # 确保 task_id 存在（如果是 None，可能需要处理，取决于业务逻辑，建议设为默认值或报错）
        # 这里假设没有 task_id 也能存，但在命名规则里会变成 'None'
        
        inserted_count = 0
        errors = []

        for code in codes:
            try:
                # 检查是否存在 (同一任务、同一店铺、同一商品)
                filters = {
                    "store_id": store_id, 
                    "code": code
                }
                # 如果业务要求同一任务下不能重复，应加上 task_id 过滤
                if task_id:
                    filters["task_id"] = task_id

                exists = frappe.db.exists("Commodity Schedule", filters)
                
                if not exists:
                    doc = frappe.new_doc("Commodity Schedule")
                    doc.store_id = store_id
                    doc.code = code
                    doc.task_id = task_id  # <--- 关键修复：赋值 task_id
                    doc.quantity = 0 
                    doc.sub_date = frappe.utils.today()
                    
                    doc.insert(ignore_permissions=True)
                    inserted_count += 1
            except Exception as e:
                errors.append(f"Code {code}: {str(e)}")

        frappe.db.commit()

        if errors:
            frappe.log_error("批量添加部分失败", "\n".join(errors))

        return {
            "status": "success", 
            "count": inserted_count,
            "errors": errors
        }

    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(title="批量添加商品致命错误", message=str(e))
        return {"status": "error", "msg": str(e)}

# --- 3. 单个插入接口 ---
@frappe.whitelist()
def insert_commodity_schedule(store_id, code, task_id=None, quantity=0):
    """
    插入单个商品计划数据到Commodity Schedule
    
    Args:
        store_id (str): 店铺ID
        code (str): 产品编码
        task_id (str, optional): 计划任务ID
        quantity (int, optional): 数量，默认为0
    
    Returns:
        dict: 包含操作结果的字典
    """
    try:
        # 验证必填字段
        if not store_id:
            return {
                "status": "error",
                "msg": "店铺ID不能为空"
            }
            
        if not code:
            return {
                "status": "error",
                "msg": "产品编码不能为空"
            }
        
        # 检查是否已存在相同的记录
        existing_doc = frappe.db.exists("Commodity Schedule", {
            "store_id": store_id,
            "code": code
        })
        
        if existing_doc:
            return {
                "status": "error",
                "msg": "该商品已存在于当前店铺的规划中"
            }
        
        # 创建新的Commodity Schedule文档
        doc = frappe.new_doc("Commodity Schedule")
        doc.store_id = store_id
        doc.code = code
        doc.task_id = task_id
        doc.quantity = quantity
        doc.sub_date = frappe.utils.today()
        
        # 保存文档
        doc.insert(ignore_permissions=True)
        
        frappe.db.commit()
        
        return {
            "status": "success",
            "msg": "商品计划添加成功",
            "docname": doc.name
        }
        
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(title="添加商品计划失败", message=str(e))
        return {
            "status": "error",
            "msg": f"添加商品计划失败: {str(e)}"
        }


# --- 4. 编辑接口 ---
@frappe.whitelist()
def update_line_item(name, field, value):
    """
    接收前端的编辑请求并保存
    """
    frappe.db.set_value("Commodity Schedule", name, field, value)
    frappe.db.commit()
    return {"status": "success", "msg": "已保存"}