# API测试和文档生成指南

## 概述

本项目提供了完整的API测试套件和文档生成工具，帮助开发者快速测试API接口并生成标准化文档。

## 功能特性

### 1. API自动化测试
- ✅ 自动准备测试数据
- ✅ 测试所有API模块
- ✅ 生成详细测试报告
- ✅ 错误追踪和统计
- ✅ JSON格式结果输出

### 2. API文档自动生成
- ✅ 自动扫描API文件
- ✅ 解析函数签名和文档字符串
- ✅ 生成Markdown格式文档
- ✅ 包含调用示例

## 快速开始

### 运行API测试

```bash
# 在frappe-bench目录下执行
cd /home/frappe/frappe-bench

# 运行完整测试套件
bench --site mysite.local execute product_sales_planning.tests.api_test_suite.run_api_tests
```

### 生成API文档

```bash
# 生成API文档
bench --site mysite.local execute product_sales_planning.utils.docs.api_doc_generator.generate_api_documentation
```

生成的文档位置：
- `apps/product_sales_planning/product_sales_planning/docs/api_documentation.md`

## 测试结果说明

测试运行后会输出：

1. **测试进度**：显示每个API的测试状态
2. **测试报告**：
   - 总测试数
   - 成功数量
   - 失败数量
   - 成功率
3. **详细结果**：JSON格式的完整测试结果

### 测试报告示例

```
============================================================
📊 测试报告
============================================================

总测试数: 11
成功: 11 ✓
失败: 0 ✗
成功率: 100.0%
```

## API模块说明

### 1. Dashboard API (看板)
- `get_dashboard_data` - 获取看板数据
- `get_filter_options` - 获取过滤器选项

### 2. Store API (店铺)
- `get_filter_options` - 获取店铺过滤选项
- `get_tasks_store_status` - 获取任务店铺状态

### 3. Commodity API (商品)
- `get_store_commodity_data` - 获取商品计划数据
- `get_product_list_for_dialog` - 获取商品选择列表
- `save_commodity_data` - 保存商品数据
- `delete_commodity_data` - 删除商品数据

### 4. Approval API (审批)
- `get_approval_status` - 获取审批状态
- `submit_for_approval` - 提交审批
- `approve` - 审批通过
- `reject` - 审批驳回
- `withdraw` - 撤回审批
- `check_can_edit` - 检查是否可编辑

### 5. Import/Export API (导入导出)
- `download_import_template` - 下载导入模板
- `import_commodity_data` - 导入商品数据
- `export_commodity_data` - 导出商品数据

### 6. Mechanism API (机制)
- `get_mechanism_list` - 获取机制列表
- `get_mechanism_detail` - 获取机制详情
- `save_mechanism` - 保存机制
- `delete_mechanism` - 删除机制

### 7. Data View API (数据视图)
- `get_data_view` - 获取数据视图

## 文件结构

```
product_sales_planning/
├── tests/
│   ├── __init__.py
│   └── api_test_suite.py          # API测试套件
├── utils/
│   └── docs/
│       ├── __init__.py
│       └── api_doc_generator.py   # 文档生成器
└── docs/
    └── api_documentation.md       # 生成的API文档
```

## 测试数据

测试套件会自动创建以下测试数据：
- 测试店铺
- 测试任务
- 测试产品

测试完成后，这些数据会保留在系统中供后续使用。

## 常见问题

### Q: 测试失败怎么办？
A: 查看测试报告中的错误信息，通常包含：
- API路径
- 错误描述
- 参数信息

### Q: 如何添加新的测试？
A: 编辑 `api_test_suite.py`，在相应的测试函数中添加新的测试用例。

### Q: 文档生成失败？
A: 确保：
1. API文件存在
2. 函数有正确的文档字符串
3. 模块可以正常导入

## 最佳实践

1. **定期运行测试**：在修改API后运行测试确保功能正常
2. **更新文档**：API变更后重新生成文档
3. **查看测试报告**：关注失败的测试用例
4. **保持文档同步**：确保代码和文档一致

## 技术支持

如有问题，请查看：
- API文档：`docs/api_documentation.md`
- 测试代码：`tests/api_test_suite.py`
- 文档生成器：`utils/docs/api_doc_generator.py`

---

**最后更新**: 2025-12-12
**版本**: 1.0.0
