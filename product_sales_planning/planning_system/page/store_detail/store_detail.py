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