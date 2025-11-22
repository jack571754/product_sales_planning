import frappe

@frappe.whitelist()
def get_store_commodity_data(store_id):
    """
    根据店铺ID获取该店铺的单品规划结果
    """
    # 1. 检查参数
    if not store_id:
        return []

    # 2. 查询数据
    # 注意：这里假设你在 Commodity Schedule 中添加了 'store_name' 字段来关联店铺
    # 如果你的关联字段叫其他名字（比如 task_id），请修改 filters
    data = frappe.get_all(
        "Commodity Schedule",
        filters={
            "store_id": store_id  # <--- 必须确认表里有这个字段
        },
        fields=[
            "name1",            # 产品名称
            "nickname",         # 昵称
            "specifications",   # 规格
            "brand",            # 品牌
            "series",           # 系列
            "float as qty",     # 数量 (将字段名 float 重命名为 qty，方便前端使用)
            "category"          # 类别
        ],
        order_by="creation desc"
    )

    return data