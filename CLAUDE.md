# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Frappe Framework (v15) 开发的产品销售规划系统，用于管理商品计划、店铺分配和审批流程。系统支持月度常规计划(MON)和专项促销活动(PRO)的创建、审批和执行跟踪。

## 开发环境与命令

### 常用 Bench 命令

```bash
# 启动开发服务器
bench start

# 数据库迁移（修改 DocType 后必须执行）
bench --site [site-name] migrate

# 构建前端资源（修改 JS/CSS 后执行）
bench build --app product_sales_planning

# 清除缓存
bench --site [site-name] clear-cache

# 运行测试
bench --site [site-name] test product_sales_planning

# 运行单个测试
bench --site [site-name] test product_sales_planning.planning_system.doctype.commodity_schedule.test_commodity_schedule

# 代码质量检查
ruff check .
eslint .
```

### 开发工作流

1. 修改 Python 代码后：无需重启，Frappe 会自动重载
2. 修改 DocType JSON 后：运行 `bench migrate`
3. 修改 JS/CSS 后：运行 `bench build --app product_sales_planning`
4. 提交代码前：确保 pre-commit hooks 通过（ruff, eslint, prettier, pyupgrade）

## 核心架构

### 目录结构

```
product_sales_planning/
├── planning_system/
│   ├── doctype/              # 自定义文档类型（核心数据模型）
│   │   ├── approval_workflow/        # 审批工作流配置
│   │   ├── approval_workflow_step/   # 审批步骤（子表）
│   │   ├── approver_store_assignment/ # 审批人-店铺分配关系
│   │   ├── commodity_schedule/       # 商品计划（核心业务数据）
│   │   ├── product_list/             # 产品主数据
│   │   ├── product_mechanism/        # 产品机制配置
│   │   ├── schedule_tasks/           # 计划任务（父级文档）
│   │   ├── store_list/               # 店铺主数据
│   │   └── tasks_store/              # 任务-店铺关联（子表）
│   └── page/                 # 自定义页面（单页应用）
│       ├── planning_dashboard/       # 计划看板（任务总览）
│       ├── store_detail/             # 店铺详情（商品规划编辑）
│       └── data_view/                # 数据查看（多维度查询）
├── services/                 # 业务逻辑服务层
│   └── commodity_service.py          # 商品计划服务（封装复杂业务逻辑）
├── utils/                    # 工具类
│   ├── response_utils.py             # API 响应格式化
│   ├── validation_utils.py           # 参数验证
│   └── date_utils.py                 # 日期处理
├── fixtures/                 # 测试数据生成脚本
└── public/                   # 静态资源
    ├── css/                  # 全局样式
    ├── js/                   # 全局 JS
    └── vue-test/             # Vue 组件测试项目
```

### 关键设计模式

1. **服务层模式**: 复杂业务逻辑封装在 `services/` 中，避免 API 层代码臃肿
2. **工具类模式**: 通用功能（验证、响应格式化）抽取到 `utils/` 中复用
3. **子表关联**: Schedule Tasks 通过 `set_store` 子表关联多个店铺，形成一对多关系
4. **审批工作流**: 基于角色、店铺属性或店铺范围的多级审批流程

### 数据流

```
用户操作 (Page JS)
    ↓
API 调用 (frappe.call)
    ↓
白名单方法 (@frappe.whitelist)
    ↓
服务层 (CommodityScheduleService)
    ↓
Frappe ORM / SQL
    ↓
MariaDB
```

## 核心 DocType 说明

### Schedule Tasks (计划任务)
- **作用**: 父级文档，定义计划任务的基本信息
- **关键字段**: task_type (MON/PRO), start_date, end_date, status
- **子表**: set_store (关联多个店铺)
- **命名规则**: 自动生成（如 TASK-2024-001）

### Commodity Schedule (商品计划)
- **作用**: 存储具体商品的销售计划数据
- **关键字段**: task_id, store_id, commodity_code, commodity_name, quantity, mechanism
- **索引**: task_id + store_id（高频查询组合）
- **注意**: 批量操作时使用 SQL 优化性能

### Approval Workflow (审批工作流)
- **作用**: 定义多级审批流程
- **子表**: approval_steps (审批步骤)
- **审批人分配方式**:
  - 基于角色 (role_based)
  - 基于店铺属性 (store_attribute_based)
  - 基于店铺范围 (store_range_based)

### Tasks Store (任务店铺关联)
- **作用**: Schedule Tasks 的子表，关联任务和店铺
- **关键字段**: store_id, approval_status (Draft/Pending/Approved/Rejected)
- **状态流转**: Draft → Pending → Approved/Rejected

## API 设计规范

### 统一响应格式

所有 API 必须使用 `utils/response_utils.py` 中的标准格式：

```python
# 成功响应
return success_response(data={...}, message="操作成功")

# 错误响应
return error_response(message="错误信息")
```

### 参数验证

使用 `utils/validation_utils.py` 中的验证函数：

```python
# 解析 JSON 参数
data = parse_json_param(json_str, "data")

# 验证必填参数
validate_required_params({"task_id": task_id, "store_id": store_id})

# 验证正整数
validate_positive_integer(quantity, "quantity")

# 验证 DocType 存在
validate_doctype_exists("Store List", store_id)
```

### 错误处理

```python
try:
    # 业务逻辑
    pass
except Exception as e:
    frappe.log_error(title="操作失败", message=str(e))
    return error_response(message=str(e))
```

## 前端开发规范

### Page 结构

每个 Page 包含三个文件：
- `page_name.json`: 页面配置
- `page_name.js`: 前端逻辑
- `page_name.py`: 后端 API

### API 调用

```javascript
frappe.call({
    method: "product_sales_planning.planning_system.page.store_detail.store_detail.get_store_commodity_data",
    args: {
        store_id: store_id,
        task_id: task_id
    },
    callback: function(r) {
        if (r.message.status === "success") {
            // 处理数据
        }
    }
});
```

### UI 组件

- **表格**: 使用 handsontable 进行大数据量展示和编辑
- **样式**: 全局样式在 `public/css/common-styles.css`
- **图标**: 使用 Frappe 内置图标系统

## 数据库操作最佳实践

### 优先使用 ORM

```python
# 推荐：使用 Frappe ORM
doc = frappe.get_doc("Commodity Schedule", name)
doc.quantity = new_quantity
doc.save()

# 批量查询
items = frappe.get_all(
    "Commodity Schedule",
    filters={"task_id": task_id, "store_id": store_id},
    fields=["name", "commodity_code", "quantity"]
)
```

### 性能优化场景使用 SQL

```python
# 批量更新（性能关键场景）
frappe.db.sql("""
    UPDATE `tabCommodity Schedule`
    SET quantity = %(quantity)s
    WHERE task_id = %(task_id)s AND store_id = %(store_id)s
""", {"quantity": quantity, "task_id": task_id, "store_id": store_id})

frappe.db.commit()  # 显式提交
```

### 避免 N+1 查询

```python
# 错误：N+1 查询
for task in tasks:
    stores = frappe.get_all("Tasks Store", filters={"parent": task.name})

# 正确：一次性获取
all_stores = frappe.get_all(
    "Tasks Store",
    filters={"parent": ["in", [t.name for t in tasks]]},
    fields=["parent", "store_id"]
)
```

## 审批流程逻辑

### 状态流转

1. **Draft**: 初始状态，可编辑
2. **Pending**: 提交审批后，等待审批
3. **Approved**: 审批通过，不可编辑
4. **Rejected**: 审批退回，可重新编辑

### 权限检查

```python
# 检查是否可编辑
from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import check_can_edit

can_edit = check_can_edit(task_id, store_id)
```

### 审批操作

- `submit_for_approval`: 提交审批
- `approve_task_store`: 审批通过/退回
- `withdraw_approval`: 撤回审批（仅提交人可操作）

## 测试数据生成

使用 `fixtures/` 中的脚本生成测试数据：

```bash
# 生成测试数据
bench --site [site-name] execute product_sales_planning.fixtures.generate_test_data.generate_all_test_data

# 创建审批工作流
bench --site [site-name] execute product_sales_planning.fixtures.create_test_approval_workflow.create_test_workflow

# 创建店铺分配
bench --site [site-name] execute product_sales_planning.fixtures.create_store_assignment.create_assignments
```

## 常见问题排查

### 页面加载慢
- 检查 SQL 查询是否有索引
- 使用 `frappe.db.sql` 的 `debug=1` 参数查看执行计划
- 考虑分页加载或懒加载

### 审批流程不工作
- 检查 Approval Workflow 是否正确配置
- 检查 Approver Store Assignment 是否分配
- 检查用户角色权限

### 数据导入失败
- 检查 Excel 模板格式是否匹配
- 检查必填字段是否完整
- 查看错误日志：`bench --site [site-name] logs`

## 代码风格

### Python
- 使用 Tab 缩进（Frappe 标准）
- 行长度限制 110 字符
- 变量命名：snake_case
- DocType 命名：Title Case with Spaces

### JavaScript
- 使用 Tab 缩进
- 遵循 ESLint 规则
- 使用 ES6+ 语法

## 重要提醒

1. **不要写兼容代码**: 直接使用最新的 Frappe v15 API
2. **不要重复执行改动**: 每次改动只执行一次，避免数据重复
3. **优先使用 ORM**: 除非性能必要，否则不使用 Raw SQL
4. **权限检查**: 所有 API 默认检查权限（`ignore_permissions=False`）
5. **用中文回答**: 所有交互使用中文
6. **每次有重大更新记得更新文档**：每次有重大更新及时修改更新CLAUDE.md文档 

## 页面路由

- 计划看板: `/planning-dashboard`
- 店铺详情: `/store-detail`
- 数据查看: `/data-view`

## 相关文档

- Frappe Framework 文档: https://frappeframework.com/docs
- ERPNext 文档: https://docs.erpnext.com
- 项目详细说明: 参考 `IFLOW.md`
