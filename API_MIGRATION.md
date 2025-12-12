# API 迁移文档

## 概述

本文档记录了从 Frappe Page 到独立 API 架构的迁移过程。

**迁移日期**: 2024-12-12  
**目的**: 移除 Frappe Page 前端，保留 Vue 前端，重新组织后端 API 架构

---

## 架构变更

### 旧架构
```
planning_system/
├── page/
│   ├── planning_dashboard/
│   │   └── planning_dashboard.py
│   ├── store_detail/
│   │   └── store_detail.py
│   └── data_view/
│       └── data_view.py
```

### 新架构
```
api/
└── v1/
    ├── dashboard.py          # 看板API
    ├── commodity.py          # 商品计划API
    ├── store.py              # 店铺API
    ├── approval.py           # 审批API
    ├── data_view.py          # 数据查看API
    ├── import_export.py      # 导入导出API
    └── mechanism.py          # 机制API
```

---

## API 路径映射表

### Dashboard APIs

| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_dashboard_data` | `product_sales_planning.api.v1.dashboard.get_dashboard_data` | 获取看板数据 |
| `product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_filter_options` | `product_sales_planning.api.v1.dashboard.get_filter_options` | 获取筛选选项 |

### Commodity APIs

| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `product_sales_planning.planning_system.page.store_detail.store_detail.get_store_commodity_data` | `product_sales_planning.api.v1.commodity.get_store_commodity_data` | 获取商品数据 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.bulk_insert_commodity_schedule` | `product_sales_planning.api.v1.commodity.bulk_insert_commodity_schedule` | 批量插入商品 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.batch_update_quantity` | `product_sales_planning.api.v1.commodity.batch_update_quantity` | 批量更新数量 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.batch_delete_items` | `product_sales_planning.api.v1.commodity.batch_delete_items` | 批量删除 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.batch_delete_by_codes` | `product_sales_planning.api.v1.commodity.batch_delete_by_codes` | 按编码批量删除 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.update_line_item` | `product_sales_planning.api.v1.commodity.update_line_item` | 更新单个字段 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.update_month_quantity` | `product_sales_planning.api.v1.commodity.update_month_quantity` | 更新月份数量 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.batch_update_month_quantities` | `product_sales_planning.api.v1.commodity.batch_update_month_quantities` | 批量更新月份数量 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.get_product_list_for_dialog` | `product_sales_planning.api.v1.commodity.get_product_list_for_dialog` | 获取商品列表 |

### Store APIs

| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `product_sales_planning.planning_system.page.store_detail.store_detail.get_filter_options` | `product_sales_planning.api.v1.store.get_filter_options` | 获取筛选选项 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.get_tasks_store_status` | `product_sales_planning.api.v1.store.get_tasks_store_status` | 获取任务店铺状态 |

### Approval APIs

| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `product_sales_planning.planning_system.doctype.approval_workflow.approval_api.submit_for_approval` | `product_sales_planning.api.v1.approval.submit_for_approval` | 提交审批 |
| `product_sales_planning.planning_system.doctype.approval_workflow.approval_api.approve_task_store` | `product_sales_planning.api.v1.approval.approve_task_store` | 审批任务 |
| `product_sales_planning.planning_system.doctype.approval_workflow.approval_api.withdraw_approval` | `product_sales_planning.api.v1.approval.withdraw_approval` | 撤回审批 |
| `product_sales_planning.planning_system.doctype.approval_workflow.approval_api.get_approval_history` | `product_sales_planning.api.v1.approval.get_approval_history` | 获取审批历史 |
| `product_sales_planning.planning_system.doctype.approval_workflow.approval_api.get_workflow_for_task_store` | `product_sales_planning.api.v1.approval.get_workflow_for_task_store` | 获取工作流信息 |
| `product_sales_planning.planning_system.doctype.approval_workflow.approval_api.check_can_edit` | `product_sales_planning.api.v1.approval.check_can_edit` | 检查编辑权限 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.get_approval_status` | `product_sales_planning.api.v1.approval.get_approval_status` | 获取审批状态 |

### Data View APIs

| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `product_sales_planning.planning_system.page.data_view.data_view.get_data_view` | `product_sales_planning.api.v1.data_view.get_data_view` | 获取数据视图 |
| `product_sales_planning.planning_system.page.data_view.data_view.get_data_view_filter_options` | `product_sales_planning.api.v1.data_view.get_data_view_filter_options` | 获取筛选选项 |
| `product_sales_planning.planning_system.page.data_view.data_view.export_data_view` | `product_sales_planning.api.v1.data_view.export_data_view` | 导出数据 |

### Import/Export APIs

| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `product_sales_planning.planning_system.page.store_detail.store_detail.download_import_template` | `product_sales_planning.api.v1.import_export.download_import_template` | 下载导入模板 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.import_commodity_data` | `product_sales_planning.api.v1.import_export.import_commodity_data` | 导入商品数据 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.export_commodity_data` | `product_sales_planning.api.v1.import_export.export_commodity_data` | 导出商品数据 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.download_mechanism_template` | `product_sales_planning.api.v1.import_export.download_mechanism_template` | 下载机制模板 |
| `product_sales_planning.planning_system.page.store_detail.store_detail.import_mechanism_excel` | `product_sales_planning.api.v1.import_export.import_mechanism_excel` | 导入机制数据 |

### Mechanism APIs

| 旧路径 | 新路径 | 说明 |
|--------|--------|------|
| `product_sales_planning.planning_system.page.store_detail.store_detail.apply_mechanisms` | `product_sales_planning.api.v1.mechanism.apply_mechanisms` | 应用机制 |

---

## 前端迁移指南

### Vue 前端需要更新的文件

在 Vue 前端项目中，需要全局搜索并替换所有 API 调用路径。

#### 查找模式
```javascript
// 旧的调用方式
'product_sales_planning.planning_system.page.'
'product_sales_planning.planning_system.doctype.approval_workflow.approval_api.'
```

#### 替换为
```javascript
// 新的调用方式
'product_sales_planning.api.v1.'
```

### 示例：更新 API 调用

**旧代码**:
```javascript
import { createResource } from 'frappe-ui'

const dashboardData = createResource({
  url: 'product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_dashboard_data',
  params: { /* ... */ }
})
```

**新代码**:
```javascript
import { createResource } from 'frappe-ui'

const dashboardData = createResource({
  url: 'product_sales_planning.api.v1.dashboard.get_dashboard_data',
  params: { /* ... */ }
})
```

---

## 测试清单

### 后端测试

- [ ] 测试所有 Dashboard API
- [ ] 测试所有 Commodity API
- [ ] 测试所有 Store API
- [ ] 测试所有 Approval API
- [ ] 测试所有 Data View API
- [ ] 测试所有 Import/Export API
- [ ] 测试所有 Mechanism API

### 前端测试

- [ ] 更新所有 API 调用路径
- [ ] 测试看板页面功能
- [ ] 测试店铺详情页面功能
- [ ] 测试数据查看页面功能
- [ ] 测试导入导出功能
- [ ] 测试审批流程功能

### 集成测试

- [ ] 端到端测试：创建计划任务
- [ ] 端到端测试：提交审批流程
- [ ] 端到端测试：数据导入导出
- [ ] 端到端测试：机制应用

---

## 回滚方案

如果迁移出现问题，可以通过以下步骤回滚：

1. 恢复 `planning_system/page/` 目录
2. 恢复 `hooks.py` 中的旧 API 路径配置
3. 恢复 `page_routes` 配置
4. 重启 Frappe 服务

---

## 优势

1. **清晰的 API 架构** - 按功能模块组织，易于维护
2. **版本控制** - 使用 v1 目录，便于未来 API 版本升级
3. **前后端分离** - Vue 完全独立，不依赖 Frappe Page
4. **更好的可测试性** - API 函数独立，易于单元测试
5. **符合 RESTful 规范** - API 路径更加语义化

---

## 注意事项

1. 所有 API 函数保持了原有的参数和返回值格式
2. 审批 API 仍然调用原有的 `approval_api.py` 中的函数（通过包装）
3. Vue 前端需要更新所有 API 调用路径
4. 建议在生产环境部署前进行充分测试

---

## 联系方式

如有问题，请联系开发团队。