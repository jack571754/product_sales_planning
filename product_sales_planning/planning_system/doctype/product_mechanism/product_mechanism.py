import frappe
from frappe.model.document import Document

class ProductMechanism(Document):
    # 保存前执行
    def before_save(self):
        # 1. 定义空列表
        summary_items = []

        # 2. 检查子表是否有数据
        if self.product_list:
            for row in self.product_list:
                # 获取产品名称 - 从链接的文档中获取实际的产品名称
                product_name = ""
                if row.name1:  # name1 是链接字段
                    # 使用 frappe.db.get_value 获取链接文档的产品名称字段
                    # 请将 "您的产品doctype名称" 替换为实际的产品doctype名称
                    # 请将 "product_name" 替换为实际存储产品名称的字段名
                    product_name = frappe.db.get_value("Product List", row.name1, "name1") or row.name1
                
                # 获取数量字段
                current_qty = row.quantity if row.quantity else 1
                
                # 拼接逻辑
                if product_name:
                    # 使用 f-string 拼接：名称 x 数量
                    summary_items.append(f"{product_name} x{int(current_qty)}")

        # 3. 赋值给主表字段
        self.content_summary = "，".join(summary_items)