# 后端API接口文档

> **版本**: 1.0.0  
> **最后更新**: 2025-12-13  
> **API基础路径**: `product_sales_planning.api.v1`

---

## 📋 目录

1. [API概述](#api概述)
2. [Dashboard API](#dashboard-api)
3. [Commodity API](#commodity-api)
4. [Store API](#store-api)
5. [Approval API](#approval-api)
6. [Data View API](#data-view-api)
7. [Import/Export API](#importexport-api)
8. [Mechanism API](#mechanism-api)
9. [错误处理](#错误处理)

---

## API概述

### 1.1 统一响应格式

所有API使用统一的JSON响应格式：

**成功响应**:
```json
{
  "status": "success",
  "data": { ... },
  "message": "操作成功"
}
```

**错误响应**:
```json
{
  "status": "error",
  "message": "错误信息描述"
}
```

### 1.2 调用方式

**前端调用（frappe-ui）**:
```javascript
import { call } from 'frappe-ui'

const response = await call('product_sales_planning.api.v1.dashboard.get_dashboard_data', {
  filters: JSON.stringify({}),
  current_tab: 'pending'
})
```

**Python调用**:
```python
import frappe

result = frappe.call(
    'product_sales_planning.api.v1.dashboard.get_dashboard_data',
    filters='{}',
    current_tab='pending'
)
```

### 1.3 认证和权限

- 所有API需要用户登录认证
- 基于Frappe角色权限系统
- 使用CSRF Token验证（生产环境）

---

## Dashboard API

### 2.1 获取看板数据

**接口**: `product_sales_planning.api.v1.dashboard.get_dashboard_data`

**方法**: POST

**参数**:
```python
{
  "filters": str,        # JSON字符串，筛选条件
  "current_tab": str,    # 当前标签页: 'all'|'pending'|'approved'|'rejected'
  "search_text": str,    # 搜索关键词（可选）
  "sort_by": str,        # 排序字段（可选）
  "page": int,           # 页码，默认1
  "page_size": int       # 每页数量，默认20
}
```

**filters格式**:
```json
{
  "task_type": ["MON", "PRO"],
  "status": ["Draft", "Pending"],
  "store_id": ["STORE-001"]
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "tasks": [
      {
        "name": "2025-12-MON-745",
        "task_name": "12月常规计划",
        "task_type": "MON",
        "start_date": "2025-12-01",
        "end_date": "2025-12-31",
        "status": "Draft",
        "stores": [
          {
            "store_id": "SC-5-744",
            "store_name": "旗舰店",
            "approval_status": "Draft"
          }
        ]
      }
    ],
    "statistics": {
      "total": 100,
      "pending": 30,
      "approved": 50,
      "rejected": 20
    },
    "total_count": 100
  }
}
```

### 2.2 获取筛选选项

**接口**: `product_sales_planning.api.v1.dashboard.get_filter_options`

**方法**: POST

**参数**: 无

**响应**:
```json
{
  "status": "success",
  "data": {
    "task_types": ["MON", "PRO"],
    "statuses": ["Draft", "Pending", "Approved", "Rejected"],
    "stores": [
      {
        "value": "STORE-001",
        "label": "旗舰店"
      }
    ]
  }
}
```

---

## Commodity API

### 3.1 获取商品数据

**接口**: `product_sales_planning.api.v1.commodity.get_store_commodity_data`

**方法**: POST

**参数**:
```python
{
  "store_id": str,       # 店铺ID（必填）
  "task_id": str,        # 任务ID（必填）
  "filters": str,        # JSON字符串，筛选条件（可选）
  "page": int,           # 页码，默认1
  "page_size": int,      # 每页数量，默认20
  "sort_by": str         # 排序字段（可选）
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "name": "CS-001",
        "commodity_code": "P001",
        "commodity_name": "商品A",
        "specification": "500ml",
        "unit": "瓶",
        "quantity": 100,
        "price": 10.0,
        "amount": 1000.0,
        "mechanism": "折扣",
        "remarks": "备注"
      }
    ],
    "total": 100,
    "statistics": {
      "total_quantity": 1000,
      "total_amount": 50000.0
    },
    "can_edit": true
  }
}
```

### 3.2 批量插入商品

**接口**: `product_sales_planning.api.v1.commodity.bulk_insert_commodity_schedule`

**方法**: POST

**参数**:
```python
{
  "store_id": str,       # 店铺ID（必填）
  "task_id": str,        # 任务ID（必填）
  "items": str           # JSON字符串，商品列表（必填）
}
```

**items格式**:
```json
[
  {
    "commodity_code": "P001",
    "commodity_name": "商品A",
    "quantity": 100,
    "price": 10.0,
    "mechanism": "折扣"
  }
]
```

**响应**:
```json
{
  "status": "success",
  "message": "成功添加10条记录",
  "data": {
    "inserted_count": 10,
    "failed_count": 0
  }
}
```

### 3.3 批量更新数量

**接口**: `product_sales_planning.api.v1.commodity.batch_update_quantity`

**方法**: POST

**参数**:
```python
{
  "updates": str         # JSON字符串，更新列表（必填）
}
```

**updates格式**:
```json
[
  {
    "name": "CS-001",
    "quantity": 200
  }
]
```

**响应**:
```json
{
  "status": "success",
  "message": "成功更新10条记录",
  "data": {
    "updated_count": 10
  }
}
```

### 3.4 批量删除商品

**接口**: `product_sales_planning.api.v1.commodity.batch_delete_items`

**方法**: POST

**参数**:
```python
{
  "names": str           # JSON字符串，ID列表（必填）
}
```

**names格式**:
```json
["CS-001", "CS-002", "CS-003"]
```

**响应**:
```json
{
  "status": "success",
  "message": "成功删除3条记录",
  "data": {
    "deleted_count": 3
  }
}
```

### 3.5 按编码批量删除

**接口**: `product_sales_planning.api.v1.commodity.batch_delete_by_codes`

**方法**: POST

**参数**:
```python
{
  "store_id": str,       # 店铺ID（必填）
  "task_id": str,        # 任务ID（必填）
  "codes": str           # JSON字符串，商品编码列表（必填）
}
```

**响应**:
```json
{
  "status": "success",
  "message": "成功删除5条记录",
  "data": {
    "deleted_count": 5
  }
}
```

### 3.6 更新单个字段

**接口**: `product_sales_planning.api.v1.commodity.update_line_item`

**方法**: POST

**参数**:
```python
{
  "name": str,           # 记录ID（必填）
  "field": str,          # 字段名（必填）
  "value": any           # 新值（必填）
}
```

**响应**:
```json
{
  "status": "success",
  "message": "更新成功"
}
```

### 3.7 获取商品列表（对话框）

**接口**: `product_sales_planning.api.v1.commodity.get_product_list_for_dialog`

**方法**: POST

**参数**:
```python
{
  "search_text": str,    # 搜索关键词（可选）
  "page": int,           # 页码，默认1
  "page_size": int       # 每页数量，默认20
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "products": [
      {
        "commodity_code": "P001",
        "commodity_name": "商品A",
        "specification": "500ml",
        "unit": "瓶",
        "price": 10.0
      }
    ],
    "total": 100
  }
}
```

---

## Store API

### 4.1 获取筛选选项

**接口**: `product_sales_planning.api.v1.store.get_filter_options`

**方法**: POST

**参数**:
```python
{
  "task_id": str         # 任务ID（必填）
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "mechanisms": ["折扣", "赠品", "满减"],
    "categories": ["食品", "饮料", "日用品"]
  }
}
```

### 4.2 获取任务店铺状态

**接口**: `product_sales_planning.api.v1.store.get_tasks_store_status`

**方法**: POST

**参数**:
```python
{
  "task_id": str,        # 任务ID（必填）
  "store_id": str        # 店铺ID（必填）
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "status": "Draft",
    "approval_status": "未开始",
    "can_edit": true,
    "submitted_by": null,
    "submitted_at": null
  }
}
```

---

## Approval API

### 5.1 获取审批状态

**接口**: `product_sales_planning.api.v1.approval.get_approval_status`

**方法**: POST

**参数**:
```python
{
  "task_id": str,        # 任务ID（必填）
  "store_id": str        # 店铺ID（必填）
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "workflow": {
      "has_workflow": true,
      "workflow": {
        "name": "WF-001",
        "workflow_name": "月度计划审批流程",
        "steps": [
          {
            "step_order": 1,
            "step_name": "店长审批",
            "approver_role": "店长",
            "is_final": false
          }
        ]
      },
      "current_state": {
        "status": "已提交",
        "approval_status": "待审批",
        "current_step": 1,
        "can_edit": false,
        "rejection_reason": null
      }
    },
    "can_edit": false,
    "can_approve": true,
    "user_roles": ["区域经理", "User"]
  }
}
```

### 5.2 提交审批

**接口**: `product_sales_planning.api.v1.approval.submit_for_approval`

**方法**: POST

**参数**:
```python
{
  "task_id": str,        # 任务ID（必填）
  "store_id": str,       # 店铺ID（必填）
  "comment": str         # 提交说明（可选）
}
```

**响应**:
```json
{
  "status": "success",
  "message": "提交成功",
  "data": {
    "workflow_id": "WF-001",
    "next_approver_role": "店长"
  }
}
```

### 5.3 审批操作

**接口**: `product_sales_planning.api.v1.approval.approve_task_store`

**方法**: POST

**参数**:
```python
{
  "task_id": str,        # 任务ID（必填）
  "store_id": str,       # 店铺ID（必填）
  "action": str,         # 操作类型（必填）: 'approve'|'reject_to_previous'|'reject_to_submitter'
  "comments": str        # 审批意见/驳回原因（可选）
}
```

**响应**:
```json
{
  "status": "success",
  "message": "审批通过"
}
```

### 5.4 撤回审批

**接口**: `product_sales_planning.api.v1.approval.withdraw_approval`

**方法**: POST

**参数**:
```python
{
  "task_id": str,        # 任务ID（必填）
  "store_id": str,       # 店铺ID（必填）
  "comment": str         # 撤回原因（可选）
}
```

**响应**:
```json
{
  "status": "success",
  "message": "撤回成功"
}
```

### 5.5 获取审批历史

**接口**: `product_sales_planning.api.v1.approval.get_approval_history`

**方法**: POST

**参数**:
```python
{
  "task_id": str,        # 任务ID（必填）
  "store_id": str        # 店铺ID（必填）
}
```

**响应**:
```json
{
  "status": "success",
  "data": [
    {
      "name": "AH-001",
      "task_id": "2025-12-MON-745",
      "store_id": "SC-5-744",
      "approval_step": 0,
      "approver": "user@example.com",
      "action": "提交",
      "comments": "提交审批",
      "action_time": "2025-12-13 10:30:00"
    }
  ]
}
```

---

## Data View API

### 6.1 获取数据视图

**接口**: `product_sales_planning.api.v1.data_view.get_data_view`

**方法**: POST

**参数**:
```python
{
  "filters": str,        # JSON字符串，筛选条件（可选）
  "page": int,           # 页码，默认1
  "page_size": int,      # 每页数量，默认20
  "sort_by": str,        # 排序字段（可选）
  "sort_order": str      # 排序方向: 'asc'|'desc'
}
```

**响应**:
```json
{
  "status": "success",
  "data": {
    "items": [...],
    "total": 100
  }
}
```

### 6.2 获取筛选选项

**接口**: `product_sales_planning.api.v1.data_view.get_data_view_filter_options`

**方法**: POST

**参数**: 无

**响应**:
```json
{
  "status": "success",
  "data": {
    "tasks": [...],
    "stores": [...],
    "categories": [...]
  }
}
```

### 6.3 导出数据

**接口**: `product_sales_planning.api.v1.data_view.export_data_view`

**方法**: POST

**参数**:
```python
{
  "filters": str,        # JSON字符串，筛选条件（可选）
  "format": str          # 导出格式: 'excel'|'csv'
}
```

**响应**: 返回文件下载

---

## Import/Export API

### 7.1 下载导入模板

**接口**: `product_sales_planning.api.v1.import_export.download_import_template`

**方法**: POST

**参数**:
```python
{
  "template_type": str   # 模板类型: 'commodity'|'mechanism'
}
```

**响应**: 返回Excel文件下载

### 7.2 导入商品数据

**接口**: `product_sales_planning.api.v1.import_export.import_commodity_data`

**方法**: POST

**参数**:
```python
{
  "store_id": str,       # 店铺ID（必填）
  "task_id": str,        # 任务ID（必填）
  "file": file           # Excel文件（必填）
}
```

**响应**:
```json
{
  "status": "success",
  "message": "导入完成",
  "data": {
    "success_count": 95,
    "failed_count": 5,
    "failed_rows": [
      {
        "row": 10,
        "reason": "商品编码不存在"
      }
    ]
  }
}
```

### 7.3 导出商品数据

**接口**: `product_sales_planning.api.v1.import_export.export_commodity_data`

**方法**: POST

**参数**:
```python
{
  "store_id": str,       # 店铺ID（必填）
  "task_id": str,        # 任务ID（必填）
  "filters": str         # JSON字符串，筛选条件（可选）
}
```

**响应**: 返回Excel文件下载

---

## Mechanism API

### 8.1 应用机制

**接口**: `product_sales_planning.api.v1.mechanism.apply_mechanisms`

**方法**: POST

**参数**:
```python
{
  "store_id": str,       # 店铺ID（必填）
  "task_id": str,        # 任务ID（必填）
  "mechanism_type": str, # 机制类型（必填）
  "target_items": str    # JSON字符串，目标商品ID列表（可选，为空则应用到全部）
}
```

**响应**:
```json
{
  "status": "success",
  "message": "成功应用机制到50个商品",
  "data": {
    "affected_count": 50
  }
}
```

---

## 错误处理

### 9.1 常见错误码

| 错误信息 | 说明 | 解决方法 |
|---------|------|---------|
| "参数缺失" | 必填参数未提供 | 检查API调用参数 |
| "权限不足" | 用户没有操作权限 | 检查用户角色权限 |
| "记录不存在" | 指定的记录不存在 | 检查ID是否正确 |
| "数据验证失败" | 数据不符合验证规则 | 检查数据格式和内容 |
| "操作被拒绝" | 当前状态不允许该操作 | 检查业务状态 |

### 9.2 错误处理示例

```javascript
try {
  const response = await call('product_sales_planning.api.v1.commodity.batch_delete_items', {
    names: JSON.stringify(['CS-001', 'CS-002'])
  })
  
  if (response.status === 'success') {
    console.log('删除成功')
  } else {
    console.error('删除失败:', response.message)
  }
} catch (error) {
  console.error('API调用失败:', error)
}
```

---

## 附录

### A. 数据类型说明

- `str`: 字符串
- `int`: 整数
- `float`: 浮点数
- `bool`: 布尔值
- `file`: 文件对象
- `any`: 任意类型

### B. 日期时间格式

- 日期: `YYYY-MM-DD` (如: 2025-12-13)
- 时间: `HH:MM:SS` (如: 10:30:00)
- 日期时间: `YYYY-MM-DD HH:MM:SS` (如: 2025-12-13 10:30:00)

### C. API测试工具

推荐使用以下工具测试API：
- Postman
- Frappe Console
- 浏览器开发者工具

---

**版本**: 1.0.0  
**最后更新**: 2025-12-13  
**维护者**: 开发团队