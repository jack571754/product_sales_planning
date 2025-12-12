# Product Sales Planning API 文档
生成时间: 2025-12-12 11:11:09
---

## 目录

- [看板API](#dashboard)
- [店铺API](#store)
- [商品API](#commodity)
- [审批API](#approval)
- [导入导出API](#import_export)
- [机制API](#mechanism)
- [数据视图API](#data_view)

---

## 看板API {#dashboard}

### date_diff

**描述**: Returns the difference between given two dates in days.

**API路径**: `product_sales_planning.api.v1.dashboard.date_diff`

**参数**:
- `string_ed_date`: str | datetime.date | datetime.datetime
- `string_st_date`: str | datetime.date | datetime.datetime

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.dashboard.date_diff',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### format_datetime

**描述**: Converts the given string time to :data:`user_datetime_format`
User format specified in defaults

Examples:

* dd-mm-yyyy HH:mm:ss
* mm-dd-yyyy HH:mm

**API路径**: `product_sales_planning.api.v1.dashboard.format_datetime`

**参数**:
- `datetime_string`: str | datetime.date | datetime.datetime
- `format_string`: str | None = None

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.dashboard.format_datetime',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### get_dashboard_data

**描述**: 获取计划看板数据（支持过滤、搜索、排序）

从 planning_dashboard.py 迁移

**API路径**: `product_sales_planning.api.v1.dashboard.get_dashboard_data`

**参数**:
- `filters`: Any = None
- `search_text`: Any = None
- `sort_by`: Any = None
- `sort_order`: Any = asc

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.dashboard.get_dashboard_data',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### get_filter_options

**描述**: 获取过滤器选项

**API路径**: `product_sales_planning.api.v1.dashboard.get_filter_options`

**参数**: 无

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.dashboard.get_filter_options',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### getdate

**描述**: Converts string date (yyyy-mm-dd) to datetime.date object.
If no input is provided, current date is returned.

**API路径**: `product_sales_planning.api.v1.dashboard.getdate`

**参数**:
- `string_date`: typing.Optional[ForwardRef('DateTimeLikeObject')] = None
- `parse_day_first`: <class 'bool'> = False

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.dashboard.getdate',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### today

**描述**: 无描述

**API路径**: `product_sales_planning.api.v1.dashboard.today`

**参数**: 无

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.dashboard.today',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

## 店铺API {#store}

### error_response

**描述**: 错误响应

Args:
        message: 错误消息
        error_code: 错误代码
        **kwargs: 其他额外字段

Returns:
        dict: 统一格式的错误响应

**API路径**: `product_sales_planning.api.v1.store.error_response`

**参数**:
- `message`: Any = 操作失败
- `error_code`: Any = None
- `kwargs`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.store.error_response',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### get_filter_options

**描述**: 获取筛选器选项

**API路径**: `product_sales_planning.api.v1.store.get_filter_options`

**参数**: 无

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.store.get_filter_options',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### get_tasks_store_status

**描述**: 获取任务店铺状态信息

**API路径**: `product_sales_planning.api.v1.store.get_tasks_store_status`

**参数**:
- `task_id`: Any
- `store_id`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.store.get_tasks_store_status',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### success_response

**描述**: 成功响应

Args:
        data: 返回的数据
        message: 成功消息
        **kwargs: 其他额外字段

Returns:
        dict: 统一格式的成功响应

**API路径**: `product_sales_planning.api.v1.store.success_response`

**参数**:
- `data`: Any = None
- `message`: Any = 操作成功
- `kwargs`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.store.success_response',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

## 商品API {#commodity}

### batch_delete_by_codes

**描述**: 根据产品编码批量删除记录（用于多月视图）

**API路径**: `product_sales_planning.api.v1.commodity.batch_delete_by_codes`

**参数**:
- `store_id`: Any
- `task_id`: Any
- `codes`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.batch_delete_by_codes',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### batch_delete_items

**描述**: 批量删除记录

**API路径**: `product_sales_planning.api.v1.commodity.batch_delete_items`

**参数**:
- `names`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.batch_delete_items',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### batch_update_month_quantities

**描述**: 批量更新多个商品的月份数量

**API路径**: `product_sales_planning.api.v1.commodity.batch_update_month_quantities`

**参数**:
- `store_id`: Any
- `task_id`: Any
- `updates`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.batch_update_month_quantities',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### batch_update_quantity

**描述**: 批量修改数量

**API路径**: `product_sales_planning.api.v1.commodity.batch_update_quantity`

**参数**:
- `names`: Any
- `quantity`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.batch_update_quantity',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### bulk_insert_commodity_schedule

**描述**: 批量插入商品计划

**API路径**: `product_sales_planning.api.v1.commodity.bulk_insert_commodity_schedule`

**参数**:
- `store_id`: Any
- `codes`: Any
- `task_id`: Any = None

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.bulk_insert_commodity_schedule',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### error_response

**描述**: 错误响应

Args:
        message: 错误消息
        error_code: 错误代码
        **kwargs: 其他额外字段

Returns:
        dict: 统一格式的错误响应

**API路径**: `product_sales_planning.api.v1.commodity.error_response`

**参数**:
- `message`: Any = 操作失败
- `error_code`: Any = None
- `kwargs`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.error_response',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### get_product_list_for_dialog

**描述**: 获取商品选择列表（供前端弹窗使用）

**API路径**: `product_sales_planning.api.v1.commodity.get_product_list_for_dialog`

**参数**:
- `store_id`: Any = None
- `task_id`: Any = None
- `search_term`: Any = None
- `brand`: Any = None
- `category`: Any = None
- `limit`: Any = 500

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.get_product_list_for_dialog',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### get_store_commodity_data

**描述**: 查询商品规划数据
从 store_detail.py 迁移

**API路径**: `product_sales_planning.api.v1.commodity.get_store_commodity_data`

**参数**:
- `store_id`: Any = None
- `task_id`: Any = None
- `brand`: Any = None
- `category`: Any = None
- `start`: Any = 0
- `page_length`: Any = 20
- `search_term`: Any = None
- `view_mode`: Any = multi

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.get_store_commodity_data',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### parse_json_param

**描述**: 解析JSON参数

Args:
        param: 参数值（可能是字符串或已解析的对象）
        param_name: 参数名称（用于错误消息）

Returns:
        解析后的对象

Raises:
        frappe.ValidationError: 如果解析失败

**API路径**: `product_sales_planning.api.v1.commodity.parse_json_param`

**参数**:
- `param`: Any
- `param_name`: Any = 参数

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.parse_json_param',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### success_response

**描述**: 成功响应

Args:
        data: 返回的数据
        message: 成功消息
        **kwargs: 其他额外字段

Returns:
        dict: 统一格式的成功响应

**API路径**: `product_sales_planning.api.v1.commodity.success_response`

**参数**:
- `data`: Any = None
- `message`: Any = 操作成功
- `kwargs`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.success_response',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### update_line_item

**描述**: 更新单个字段

**API路径**: `product_sales_planning.api.v1.commodity.update_line_item`

**参数**:
- `name`: Any
- `field`: Any
- `value`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.update_line_item',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### update_month_quantity

**描述**: 更新指定产品的某个月份的计划数量

**API路径**: `product_sales_planning.api.v1.commodity.update_month_quantity`

**参数**:
- `store_id`: Any
- `task_id`: Any
- `code`: Any
- `month`: Any
- `quantity`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.update_month_quantity',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### validate_month_format

**描述**: 验证月份格式

Args:
        month_str: 月份字符串（支持 YYYY-MM, YYYYMM, YYYY/MM 格式）

Returns:
        str: 标准化的月份字符串 (YYYY-MM)

Raises:
        frappe.ValidationError: 如果格式无效

**API路径**: `product_sales_planning.api.v1.commodity.validate_month_format`

**参数**:
- `month_str`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.validate_month_format',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### validate_positive_integer

**描述**: 验证正整数

Args:
        value: 要验证的值
        field_name: 字段名称（用于错误消息）

Returns:
        int: 验证后的整数值

Raises:
        frappe.ValidationError: 如果不是有效的正整数

**API路径**: `product_sales_planning.api.v1.commodity.validate_positive_integer`

**参数**:
- `value`: Any
- `field_name`: Any = 数值

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.validate_positive_integer',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### validate_required_params

**描述**: 验证必需参数

Args:
        params: 参数字典
        required_fields: 必需字段列表

Raises:
        frappe.ValidationError: 如果缺少必需参数

**API路径**: `product_sales_planning.api.v1.commodity.validate_required_params`

**参数**:
- `params`: Any
- `required_fields`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.commodity.validate_required_params',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

## 审批API {#approval}

### approve_task_store

**描述**: 审批任务店铺

**API路径**: `product_sales_planning.api.v1.approval.approve_task_store`

**参数**:
- `task_id`: Any
- `store_id`: Any
- `action`: Any
- `comment`: Any = None

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.approval.approve_task_store',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### check_can_edit

**描述**: 检查是否可以编辑

**API路径**: `product_sales_planning.api.v1.approval.check_can_edit`

**参数**:
- `task_id`: Any
- `store_id`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.approval.check_can_edit',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### error_response

**描述**: 错误响应

Args:
        message: 错误消息
        error_code: 错误代码
        **kwargs: 其他额外字段

Returns:
        dict: 统一格式的错误响应

**API路径**: `product_sales_planning.api.v1.approval.error_response`

**参数**:
- `message`: Any = 操作失败
- `error_code`: Any = None
- `kwargs`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.approval.error_response',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### get_approval_history

**描述**: 获取审批历史

**API路径**: `product_sales_planning.api.v1.approval.get_approval_history`

**参数**:
- `task_id`: Any
- `store_id`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.approval.get_approval_history',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### get_approval_status

**描述**: 获取审批状态和流程信息

**API路径**: `product_sales_planning.api.v1.approval.get_approval_status`

**参数**:
- `task_id`: Any
- `store_id`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.approval.get_approval_status',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### get_workflow_for_task_store

**描述**: 获取任务店铺的工作流信息

**API路径**: `product_sales_planning.api.v1.approval.get_workflow_for_task_store`

**参数**:
- `task_id`: Any
- `store_id`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.approval.get_workflow_for_task_store',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### submit_for_approval

**描述**: 提交审批

**API路径**: `product_sales_planning.api.v1.approval.submit_for_approval`

**参数**:
- `task_id`: Any
- `store_id`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.approval.submit_for_approval',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### success_response

**描述**: 成功响应

Args:
        data: 返回的数据
        message: 成功消息
        **kwargs: 其他额外字段

Returns:
        dict: 统一格式的成功响应

**API路径**: `product_sales_planning.api.v1.approval.success_response`

**参数**:
- `data`: Any = None
- `message`: Any = 操作成功
- `kwargs`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.approval.success_response',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### withdraw_approval

**描述**: 撤回审批

**API路径**: `product_sales_planning.api.v1.approval.withdraw_approval`

**参数**:
- `task_id`: Any
- `store_id`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.approval.withdraw_approval',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

## 导入导出API {#import_export}

### download_import_template

**描述**: 生成并下载Excel导入模板

**API路径**: `product_sales_planning.api.v1.import_export.download_import_template`

**参数**:
- `task_id`: Any = None

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.import_export.download_import_template',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### download_mechanism_template

**描述**: 下载机制导入模板（占位函数）

**API路径**: `product_sales_planning.api.v1.import_export.download_mechanism_template`

**参数**: 无

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.import_export.download_mechanism_template',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### error_response

**描述**: 错误响应

Args:
        message: 错误消息
        error_code: 错误代码
        **kwargs: 其他额外字段

Returns:
        dict: 统一格式的错误响应

**API路径**: `product_sales_planning.api.v1.import_export.error_response`

**参数**:
- `message`: Any = 操作失败
- `error_code`: Any = None
- `kwargs`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.import_export.error_response',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### export_commodity_data

**描述**: 导出商品计划数据到Excel

**API路径**: `product_sales_planning.api.v1.import_export.export_commodity_data`

**参数**:
- `store_id`: Any = None
- `task_id`: Any = None

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.import_export.export_commodity_data',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### import_commodity_data

**描述**: 从Excel导入商品计划数据

**API路径**: `product_sales_planning.api.v1.import_export.import_commodity_data`

**参数**:
- `store_id`: Any
- `task_id`: Any
- `file_url`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.import_export.import_commodity_data',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### import_mechanism_excel

**描述**: 导入机制Excel（占位函数）

**API路径**: `product_sales_planning.api.v1.import_export.import_mechanism_excel`

**参数**:
- `file_url`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.import_export.import_mechanism_excel',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### success_response

**描述**: 成功响应

Args:
        data: 返回的数据
        message: 成功消息
        **kwargs: 其他额外字段

Returns:
        dict: 统一格式的成功响应

**API路径**: `product_sales_planning.api.v1.import_export.success_response`

**参数**:
- `data`: Any = None
- `message`: Any = 操作成功
- `kwargs`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.import_export.success_response',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### validate_required_params

**描述**: 验证必需参数

Args:
        params: 参数字典
        required_fields: 必需字段列表

Raises:
        frappe.ValidationError: 如果缺少必需参数

**API路径**: `product_sales_planning.api.v1.import_export.validate_required_params`

**参数**:
- `params`: Any
- `required_fields`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.import_export.validate_required_params',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

## 机制API {#mechanism}

### apply_mechanisms

**描述**: 应用产品机制（批量添加机制中的所有产品）

**API路径**: `product_sales_planning.api.v1.mechanism.apply_mechanisms`

**参数**:
- `store_id`: Any
- `mechanism_names`: Any
- `task_id`: Any = None

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.mechanism.apply_mechanisms',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### error_response

**描述**: 错误响应

Args:
        message: 错误消息
        error_code: 错误代码
        **kwargs: 其他额外字段

Returns:
        dict: 统一格式的错误响应

**API路径**: `product_sales_planning.api.v1.mechanism.error_response`

**参数**:
- `message`: Any = 操作失败
- `error_code`: Any = None
- `kwargs`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.mechanism.error_response',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### parse_json_param

**描述**: 解析JSON参数

Args:
        param: 参数值（可能是字符串或已解析的对象）
        param_name: 参数名称（用于错误消息）

Returns:
        解析后的对象

Raises:
        frappe.ValidationError: 如果解析失败

**API路径**: `product_sales_planning.api.v1.mechanism.parse_json_param`

**参数**:
- `param`: Any
- `param_name`: Any = 参数

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.mechanism.parse_json_param',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### success_response

**描述**: 成功响应

Args:
        data: 返回的数据
        message: 成功消息
        **kwargs: 其他额外字段

Returns:
        dict: 统一格式的成功响应

**API路径**: `product_sales_planning.api.v1.mechanism.success_response`

**参数**:
- `data`: Any = None
- `message`: Any = 操作成功
- `kwargs`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.mechanism.success_response',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### validate_doctype_exists

**描述**: 验证DocType记录是否存在

Args:
        doctype: DocType名称
        name: 记录名称
        label: 显示标签（用于错误消息）

Raises:
        frappe.ValidationError: 如果记录不存在

**API路径**: `product_sales_planning.api.v1.mechanism.validate_doctype_exists`

**参数**:
- `doctype`: Any
- `name`: Any
- `label`: Any = None

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.mechanism.validate_doctype_exists',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### validate_required_params

**描述**: 验证必需参数

Args:
        params: 参数字典
        required_fields: 必需字段列表

Raises:
        frappe.ValidationError: 如果缺少必需参数

**API路径**: `product_sales_planning.api.v1.mechanism.validate_required_params`

**参数**:
- `params`: Any
- `required_fields`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.mechanism.validate_required_params',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

## 数据视图API {#data_view}

### export_data_view

**描述**: 导出数据为 Excel

**API路径**: `product_sales_planning.api.v1.data_view.export_data_view`

**参数**:
- `filters`: Any = None

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.data_view.export_data_view',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### format_datetime

**描述**: Converts the given string time to :data:`user_datetime_format`
User format specified in defaults

Examples:

* dd-mm-yyyy HH:mm:ss
* mm-dd-yyyy HH:mm

**API路径**: `product_sales_planning.api.v1.data_view.format_datetime`

**参数**:
- `datetime_string`: str | datetime.date | datetime.datetime
- `format_string`: str | None = None

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.data_view.format_datetime',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### get_data_view

**描述**: 获取跨店铺商品数据列表

**API路径**: `product_sales_planning.api.v1.data_view.get_data_view`

**参数**:
- `filters`: Any = None
- `page`: Any = 1
- `page_size`: Any = 50
- `sort_by`: Any = None
- `sort_order`: Any = asc

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.data_view.get_data_view',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### get_data_view_filter_options

**描述**: 获取数据查看页面的筛选器选项

**API路径**: `product_sales_planning.api.v1.data_view.get_data_view_filter_options`

**参数**: 无

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.data_view.get_data_view_filter_options',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### getdate

**描述**: Converts string date (yyyy-mm-dd) to datetime.date object.
If no input is provided, current date is returned.

**API路径**: `product_sales_planning.api.v1.data_view.getdate`

**参数**:
- `string_date`: typing.Optional[ForwardRef('DateTimeLikeObject')] = None
- `parse_day_first`: <class 'bool'> = False

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.data_view.getdate',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### today

**描述**: 无描述

**API路径**: `product_sales_planning.api.v1.data_view.today`

**参数**: 无

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.data_view.today',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### validate_page_params

**描述**: 验证分页参数

Args:
        page: 页码
        page_size: 每页大小
        max_size: 最大页面大小（可选）

Returns:
        tuple: (page, page_size) 验证后的值

**API路径**: `product_sales_planning.api.v1.data_view.validate_page_params`

**参数**:
- `page`: Any
- `page_size`: Any
- `max_size`: Any = None

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.data_view.validate_page_params',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

### validate_sort_params

**描述**: 验证排序参数

Args:
        sort_by: 排序字段
        sort_order: 排序方向
        allowed_fields: 允许的排序字段列表

Returns:
        tuple: (sort_by, sort_order) 验证后的值

Raises:
        frappe.ValidationError: 如果参数无效

**API路径**: `product_sales_planning.api.v1.data_view.validate_sort_params`

**参数**:
- `sort_by`: Any
- `sort_order`: Any
- `allowed_fields`: Any

**调用示例**:
```python
frappe.call({
    method: 'product_sales_planning.api.v1.data_view.validate_sort_params',
    args: {
        // 参数
    },
    callback: function(r) {
        console.log(r.message);
    }
});
```

---

