frappe.ui.form.on('Product Mechanism', {
    refresh: function(frm) {
        // 在右上角添加按钮
        frm.add_custom_button(__('新增产品'), function() {
            
            new frappe.ui.form.MultiSelectDialog({
                doctype: "Product List", 
                target: frm,
                
                // 根据 Product List doctype 的实际字段进行调整
                setters: {
                    // 替换为 Product List 中实际存在的字段
                    name1: null,
                    brand: null,
                    specifications: null
                },
                // add_filters_group: 1,

                // 列表显示的列 - 确保这些字段在 Product List 中存在
                columns: ["name1", "specifications"], 

                action: function(selections) {
                    // 这里的 selections 是产品 ID (name) 的数组
                    selections.forEach(function(item_name) {
                        
                        let child = frm.add_child("product_list");
                        
                        // 赋值逻辑 (保持你之前的字段名)
                        frappe.model.set_value(child.doctype, child.name, "name1", item_name);
                        frappe.model.set_value(child.doctype, child.name, "quantity", 1);
                    });

                    frm.refresh_field("product_list");
                    frappe.msgprint(`成功添加 ${selections.length} 行数据`);
                }
            });
        });
    }
});