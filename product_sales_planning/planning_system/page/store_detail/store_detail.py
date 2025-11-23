import frappe

@frappe.whitelist()
def get_store_commodity_data(store_id):
    """
    查询指定店铺的商品规划数据
    """
    if not store_id:
        return []

    try:
        # 使用 frappe.get_all 进行查询
        # 注意：fields 里我们将数据库字段 'float' 重命名为 'qty'，方便前端使用
        data = frappe.get_all(
            "Commodity Schedule",
            filters={"store_id": store_id},
            fields=[
                "store_name",       # 店铺名称
                "name1",            # 产品名称
                "name",             # 产品id
                "nickname",         # 昵称
                "specifications",   # 规格
                "brand",            # 品牌
                "category",         # 类别
                "series",           # 系列
                "quantity"          # 数量
            ],
            order_by="creation desc", # 按创建时间倒序
            limit=100                 # 限制显示100条，防止卡顿
        )
        
        return data

    except Exception as e:
        # 记录错误日志到 Frappe 后台
        frappe.log_error(title="店铺详情查询失败", message=str(e))
        return {"error": str(e)}
    



# --- 新增：处理单元格编辑的回写接口 ---
@frappe.whitelist()
def update_line_item(name, field, value):
    """
    接收前端的编辑请求并保存
    :param name: 数据行 ID (Commodity Schedule 的 name)
    :param field: 要修改的字段名 (如 quantity 或 float)
    :param value: 新的值
    """
    # 权限检查 (可选，根据业务需求)
    # if not frappe.has_permission("Commodity Schedule", "write"):
    #     frappe.throw("没有权限修改")

    # 字段映射：如果前端用的字段名和数据库不一样，这里要做转换
    # 比如前端叫 quantity，数据库实际是 float
    # if field == 'quantity':
    #     field = 'float'

    # 执行更新
    frappe.db.set_value("Commodity Schedule", name, field, value)
    
    return {"status": "success", "msg": "已保存"}