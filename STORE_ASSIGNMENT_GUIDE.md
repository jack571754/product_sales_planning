# 审批人店铺范围分配功能使用指南

## 功能概述

本功能实现了基于店铺范围的动态审批人分配机制,允许不同的审批人负责不同的店铺范围。

### 使用场景

- A角色负责1-10号店铺的审批
- B角色负责11-13号店铺的审批
- 当不同店铺提交审批时,自动路由到对应的审批人

## 核心组件

### 1. Approver Store Assignment (审批人店铺分配)

新增的DocType,用于管理审批人与店铺范围的对应关系。

**字段说明:**
- `approver`: 审批人(Link to User)
- `approver_role`: 审批角色(Link to Role)
- `is_active`: 是否启用
- `stores`: 负责的店铺列表(子表)

### 2. Approver Store Assignment Item (审批人店铺分配项)

子表DocType,存储具体的店铺分配。

**字段说明:**
- `store_id`: 店铺ID(Link to Store List)
- `store_name`: 店铺名称(自动填充)

### 3. Approval Workflow Step 增强

在审批流程步骤中新增了第三种审批人类型:

- **基于角色**: 所有拥有该角色的用户都可以审批
- **基于店铺属性**: 从店铺记录中读取指定字段的用户作为审批人
- **基于店铺范围分配** (新增): 根据店铺分配表查找对应的审批人

## 使用步骤

### 步骤1: 创建审批人店铺分配

1. 访问 `/app/approver-store-assignment`
2. 点击 "New" 创建新的分配记录
3. 填写以下信息:
   - 审批人: 选择用户
   - 审批角色: 选择角色(如 Regional Manager)
   - 是否启用: 勾选
   - 负责的店铺: 添加店铺列表

**示例:**
```
审批人: regional.manager.a@test.com
审批角色: Regional Manager
负责的店铺: STORE-001, STORE-002, ..., STORE-010
```

### 步骤2: 配置审批流程

1. 访问 `/app/approval-workflow`
2. 创建或编辑审批流程
3. 在审批步骤中:
   - 审批人类型: 选择 "基于店铺范围分配"
   - 审批角色: 选择对应的角色(如 Regional Manager)

### 步骤3: 测试审批流程

当店铺提交审批时,系统会:
1. 根据店铺ID查找对应的审批人
2. 自动分配给负责该店铺的审批人
3. 只有负责该店铺的审批人可以审批

## 测试脚本

### 创建测试数据

```bash
# 创建测试用户和店铺分配
bench --site mysite.local execute product_sales_planning.fixtures.create_store_assignment.create_test_assignments
```

### 运行功能测试

```bash
# 运行所有测试
bench --site mysite.local execute product_sales_planning.fixtures.test_store_assignment.run_all_tests
```

## API 说明

### get_approver_by_store_assignment(role, store_id)

根据店铺ID和审批角色查找对应的审批人。

**参数:**
- `role`: 审批角色名称
- `store_id`: 店铺ID

**返回:**
- 审批人用户名,如果未找到则返回 None

**示例:**
```python
from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import get_approver_by_store_assignment

approver = get_approver_by_store_assignment("Regional Manager", "STORE-005")
# 返回: "regional.manager.a@test.com"
```

### get_approver_for_role(role, store_id=None, workflow_step=None)

获取指定角色的审批人,支持多种审批人类型。

**参数:**
- `role`: 角色名称
- `store_id`: 店铺ID(可选)
- `workflow_step`: 审批步骤对象(可选)

**返回:**
- 审批人用户名或 None

**示例:**
```python
from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import get_approver_for_role

# 基于店铺范围分配
approver = get_approver_for_role(
    "Regional Manager",
    store_id="STORE-005",
    workflow_step=workflow_step
)
```

## 数据验证

### 验证规则

1. **审批人角色验证**: 审批人必须拥有指定的审批角色
2. **店铺唯一性**: 同一店铺在同一审批级别只能分配给一个审批人
3. **店铺名称自动填充**: 系统会自动从 Store List 中获取店铺名称

### 重复分配检查

系统会在保存时检查店铺是否已被其他审批人分配,如果发现重复分配会显示警告信息。

## 权限配置

### DocType 权限

- **System Manager**: 完全权限
- **Planning Admin**: 完全权限
- 其他角色: 只读权限

### 审批权限

- 系统管理员可以审批所有流程
- 审批人必须拥有指定的审批角色
- 使用店铺范围分配时,只有负责该店铺的审批人可以审批

## 注意事项

1. **店铺分配冲突**: 同一店铺在同一审批级别只能分配给一个审批人
2. **审批人角色验证**: 审批人必须拥有指定的审批角色
3. **数据迁移**: 如果已有审批流程在运行,需要先配置好店铺分配
4. **性能优化**: 如果店铺数量很大,建议为查询添加索引

## 故障排查

### 问题1: 提交审批时未找到审批人

**可能原因:**
- 店铺未分配给任何审批人
- 审批人分配记录未启用
- 审批流程配置错误

**解决方法:**
1. 检查 Approver Store Assignment 中是否有该店铺的分配
2. 确认分配记录的 `is_active` 字段为 1
3. 检查审批流程步骤的审批人类型是否为"基于店铺范围分配"

### 问题2: 审批人无法审批

**可能原因:**
- 审批人没有对应的角色
- 审批人不负责该店铺
- 审批流程状态不正确

**解决方法:**
1. 检查审批人是否拥有指定的审批角色
2. 确认审批人在 Approver Store Assignment 中负责该店铺
3. 检查 Tasks Store 的 `approval_status` 是否为"待审批"

## 相关文件

### DocType 定义
- `product_sales_planning/planning_system/doctype/approver_store_assignment/`
- `product_sales_planning/planning_system/doctype/approver_store_assignment_item/`
- `product_sales_planning/planning_system/doctype/approval_workflow_step/approval_workflow_step.json`

### Python 控制器
- `product_sales_planning/planning_system/doctype/approval_workflow/approval_api.py`
  - `get_approver_for_role()` 函数(第620-661行)
  - `get_approver_by_store_assignment()` 函数(第664-699行)
  - `can_approve()` 函数(第580-617行)

### 测试脚本
- `product_sales_planning/fixtures/create_store_assignment.py`
- `product_sales_planning/fixtures/test_store_assignment.py`

## 更新日志

### 2025-12-03
- 创建 Approver Store Assignment 和 Approver Store Assignment Item DocType
- 修改 Approval Workflow Step 增加"基于店铺范围分配"审批人类型
- 实现审批人查找逻辑和权限验证
- 创建测试数据生成脚本和功能测试脚本
- 运行数据库迁移

## 支持

如有问题,请联系系统管理员或查看以下资源:
- 计划文件: `/home/frappe/.claude/plans/reactive-enchanting-hennessy.md`
- 实现总结: `APPROVAL_IMPLEMENTATION_SUMMARY.md`
