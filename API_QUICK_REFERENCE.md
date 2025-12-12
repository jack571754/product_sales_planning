# API快速参考

## 🚀 快速命令

### 运行API测试
```bash
cd /home/frappe/frappe-bench
bench --site mysite.local execute product_sales_planning.tests.api_test_suite.run_api_tests
```

### 生成API文档
```bash
bench --site mysite.local execute product_sales_planning.utils.docs.api_doc_generator.generate_api_documentation
```

## 📋 API列表

### Dashboard API (看板)
```javascript
// 获取看板数据
frappe.call({
    method: 'product_sales_planning.api.v1.dashboard.get_dashboard_data',
    args: {
        filters: {},
        search_text: '',
        sort_by: 'deadline',
        sort_order: 'asc'
    }
});

// 获取过滤器选项
frappe.call({
    method: 'product_sales_planning.api.v1.dashboard.get_filter_options'
});
```

### Store API (店铺)
```javascript
// 获取店铺过滤选项
frappe.call({
    method: 'product_sales_planning.api.v1.store.get_filter_options'
});

// 获取任务店铺状态
frappe.call({
    method: 'product_sales_planning.api.v1.store.get_tasks_store_status',
    args: {
        task_id: '2025-12-MON-283',
        store_id: 'SC-5-282'
    }
});
```

### Commodity API (商品)
```javascript
// 获取商品计划数据
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.get_store_commodity_data',
    args: {
        store_id: 'SC-5-282',
        task_id: '2025-12-MON-283',
        start: 0,
        page_length: 20
    }
});

// 获取商品选择列表
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.get_product_list_for_dialog',
    args: {
        search_text: '',
        limit: 50
    }
});

// 保存商品数据
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.save_commodity_data',
    args: {
        store_id: 'SC-5-282',
        task_id: '2025-12-MON-283',
        data: [
            {
                product_code: '242550',
                quantity: 100,
                price: 99.00
            }
        ]
    }
});
```

### Approval API (审批)
```javascript
// 获取审批状态
frappe.call({
    method: 'product_sales_planning.api.v1.approval.get_approval_status',
    args: {
        task_id: '2025-12-MON-283',
        store_id: 'SC-5-282'
    }
});

// 提交审批
frappe.call({
    method: 'product_sales_planning.api.v1.approval.submit_for_approval',
    args: {
        task_id: '2025-12-MON-283',
        store_id: 'SC-5-282'
    }
});

// 审批通过
frappe.call({
    method: 'product_sales_planning.api.v1.approval.approve',
    args: {
        task_id: '2025-12-MON-283',
        store_id: 'SC-5-282',
        comments: '审批通过'
    }
});

// 审批驳回
frappe.call({
    method: 'product_sales_planning.api.v1.approval.reject',
    args: {
        task_id: '2025-12-MON-283',
        store_id: 'SC-5-282',
        reason: '数据不完整'
    }
});
```

### Import/Export API (导入导出)
```javascript
// 下载导入模板
frappe.call({
    method: 'product_sales_planning.api.v1.import_export.download_import_template',
    args: {
        task_id: '2025-12-MON-283'
    }
});

// 导出商品数据
frappe.call({
    method: 'product_sales_planning.api.v1.import_export.export_commodity_data',
    args: {
        store_id: 'SC-5-282',
        task_id: '2025-12-MON-283'
    }
});

// 导入商品数据
frappe.call({
    method: 'product_sales_planning.api.v1.import_export.import_commodity_data',
    args: {
        file_url: '/files/import.xlsx',
        task_id: '2025-12-MON-283',
        store_id: 'SC-5-282'
    }
});
```

## 📊 测试结果示例

```
============================================================
🚀 开始API测试
============================================================
📦 准备测试数据...
✓ 测试店铺: SC-5-282
✓ 测试任务: 2025-12-MON-283
✓ 测试产品: 242550

📊 测试Dashboard API...
✓ get_dashboard_data - 获取看板数据
✓ get_filter_options - 获取过滤器选项

🏪 测试Store API...
✓ get_filter_options - 获取店铺过滤选项
✓ get_tasks_store_status - 获取任务店铺状态

============================================================
📊 测试报告
============================================================
总测试数: 11
成功: 11 ✓
失败: 0 ✗
成功率: 100.0%
```

## 📁 文件位置

- **测试套件**: `apps/product_sales_planning/product_sales_planning/tests/api_test_suite.py`
- **文档生成器**: `apps/product_sales_planning/product_sales_planning/utils/docs/api_doc_generator.py`
- **生成的文档**: `apps/product_sales_planning/product_sales_planning/docs/api_documentation.md`
- **使用说明**: `apps/product_sales_planning/API_TEST_README.md`

## 🔧 常用操作

### 查看生成的文档
```bash
cat apps/product_sales_planning/product_sales_planning/docs/api_documentation.md
```

### 查看测试代码
```bash
cat apps/product_sales_planning/product_sales_planning/tests/api_test_suite.py
```

### 重新运行测试
```bash
bench --site mysite.local execute product_sales_planning.tests.api_test_suite.run_api_tests
```

## 💡 提示

1. **测试前准备**: 确保数据库中有必要的基础数据
2. **文档更新**: API变更后记得重新生成文档
3. **错误排查**: 查看测试报告中的详细错误信息
4. **性能优化**: 关注API响应时间

---

**版本**: 1.0.0  
**更新时间**: 2025-12-12
