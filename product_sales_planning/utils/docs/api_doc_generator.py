# -*- coding: utf-8 -*-
"""
API文档生成器
自动扫描API文件并生成Markdown格式的接口文档
"""

import frappe
import os
import inspect
import json
from datetime import datetime

def generate_api_documentation():
    """生成完整的API文档"""
    
    # API模块列表
    api_modules = [
        'product_sales_planning.api.v1.dashboard',
        'product_sales_planning.api.v1.store',
        'product_sales_planning.api.v1.commodity',
        'product_sales_planning.api.v1.approval',
        'product_sales_planning.api.v1.import_export',
        'product_sales_planning.api.v1.mechanism',
        'product_sales_planning.api.v1.data_view',
    ]
    
    # 生成文档内容
    doc_content = generate_markdown_doc(api_modules)
    
    # 保存到文件
    doc_path = frappe.get_app_path('product_sales_planning', 'docs', 'API_DOCUMENTATION.md')
    os.makedirs(os.path.dirname(doc_path), exist_ok=True)
    
    with open(doc_path, 'w', encoding='utf-8') as f:
        f.write(doc_content)
    
    print(f"✅ API文档已生成: {doc_path}")
    return {"status": "success", "path": doc_path}

def generate_markdown_doc(api_modules):
    """生成Markdown格式的文档"""
    
    doc = []
    doc.append("# Product Sales Planning API 文档\n")
    doc.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    doc.append("---\n\n")
    
    # 目录
    doc.append("## 目录\n\n")
    module_names = {
        'dashboard': '看板API',
        'store': '店铺API',
        'commodity': '商品API',
        'approval': '审批API',
        'import_export': '导入导出API',
        'mechanism': '机制API',
        'data_view': '数据视图API'
    }
    
    for module_path in api_modules:
        module_name = module_path.split('.')[-1]
        display_name = module_names.get(module_name, module_name)
        doc.append(f"- [{display_name}](#{module_name})\n")
    
    doc.append("\n---\n\n")
    
    # 遍历每个模块
    for module_path in api_modules:
        try:
            module = frappe.get_module(module_path)
            module_name = module_path.split('.')[-1]
            display_name = module_names.get(module_name, module_name)
            
            doc.append(f"## {display_name} {{#{module_name}}}\n\n")
            
            # 获取模块中的所有函数
            functions = [
                (name, obj) for name, obj in inspect.getmembers(module)
                if inspect.isfunction(obj) and not name.startswith('_')
            ]
            
            if not functions:
                doc.append("*暂无API接口*\n\n")
                continue
            
            # 遍历每个函数
            for func_name, func in functions:
                doc.append(f"### {func_name}\n\n")
                
                # 函数文档字符串
                docstring = inspect.getdoc(func) or "无描述"
                doc.append(f"**描述**: {docstring}\n\n")
                
                # API路径
                api_path = f"{module_path}.{func_name}"
                doc.append(f"**API路径**: `{api_path}`\n\n")
                
                # 函数签名
                try:
                    sig = inspect.signature(func)
                    params = []
                    for param_name, param in sig.parameters.items():
                        param_type = param.annotation if param.annotation != inspect.Parameter.empty else "Any"
                        param_default = f" = {param.default}" if param.default != inspect.Parameter.empty else ""
                        params.append(f"- `{param_name}`: {param_type}{param_default}")
                    
                    if params:
                        doc.append("**参数**:\n")
                        doc.append("\n".join(params))
                        doc.append("\n\n")
                    else:
                        doc.append("**参数**: 无\n\n")
                except Exception as e:
                    doc.append(f"**参数**: 无法解析 ({str(e)})\n\n")
                
                # 调用示例
                doc.append("**调用示例**:\n")
                doc.append("```python\n")
                doc.append(f"frappe.call({{\n")
                doc.append(f"    method: '{api_path}',\n")
                doc.append(f"    args: {{\n")
                doc.append(f"        // 参数\n")
                doc.append(f"    }},\n")
                doc.append(f"    callback: function(r) {{\n")
                doc.append(f"        console.log(r.message);\n")
                doc.append(f"    }}\n")
                doc.append(f"}});\n")
                doc.append("```\n\n")
                
                doc.append("---\n\n")
            
        except Exception as e:
            doc.append(f"*加载模块失败: {str(e)}*\n\n")
    
    return "".join(doc)

if __name__ == "__main__":
    generate_api_documentation()
