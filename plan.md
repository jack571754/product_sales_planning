# 审批流系统实现计划

## 需求概述

基于当前的产品销售计划系统，实现一个多级审批流功能，支持店铺和任务维度的审批管理。

### 用户需求确认

1. **审批层级**: 可配置多级（2-5级，通过Approval Workflow配置）
2. **退回机制**:
   - 支持退回上一级
   - 支持退回提交人
   - 退回时需要填写原因
   - 退回后当前步骤负责人可以修改数据
3. **审批维度**: 基于店铺+任务（每个店铺在每个任务中独立审批）
4. **审批人配置**: 混合方式
   - 第一级：基于店铺属性（从Store List读取负责人）
   - 后续级别：基于角色权限（拥有特定角色的用户可审批）
5. **通知功能**: 暂不实现（后续扩展）

## 当前系统分析

### 现有数据结构

1. **Schedule tasks** (计划任务)
   - 字段: type, start_date, end_date, status
   - 子表: set_store (Tasks Store)

2. **Tasks Store** (任务-店铺关联表，子表)
   - 字段: store_name, user, status, approval_status, sub_time, approval_time
   - 已有字段: status (未开始/已提交), approval_status (待审批/已通过/已驳回)

3. **Store List** (店铺主数据)
   - 字段: id, shop_name, channel, shop_type, user1 (店铺负责人)

4. **Commodity Schedule** (商品计划数据)
   - 字段: store_id, task_id, code, quantity, sub_date
   - 这是实际的计划数据

### 现有功能

- planning_dashboard: 展示所有任务和店铺的状态
- store_detail: 店铺详情页，用于编辑商品计划数据
- 已有基础的提交状态和审批状态字段

## 实现方案设计

### 核心架构

#### 1. 新增DocType

**Approval Workflow** (审批流程定义)
- 用于定义不同场景下的审批流程配置
- 字段:
  - workflow_name: 流程名称 (Data)
  - task_type: 适用任务类型 (Link to Schedule tasks.type) - MON/PRO
  - store_type: 适用店铺类型 (Link to Store List.shop_type) - 可选
  - is_active: 是否启用 (Check)
  - is_default: 是否默认流程 (Check)
  - approval_steps: 子表 (Approval Workflow Step)

**Approval Workflow Step** (审批步骤，子表)
- 定义审批流程的各个层级
- 字段:
  - step_order: 步骤顺序 (Int)
  - step_name: 步骤名称 (Data) - 如"区域经理审批"
  - approver_role: 审批人角色 (Link to Role)
  - approver_type: 审批人类型 (Select: "基于角色"/"基于店铺属性")
  - store_field: 店铺字段 (Data) - 当approver_type="基于店铺属性"时，指定Store List的字段名（如user1）
  - is_final: 是否最终审批 (Check)
  - can_reject_to_submitter: 是否可以退回提交人 (Check)

**Approval History** (审批历史记录)
- 记录每次审批操作的详细信息
- 字段:
  - reference_doctype: 关联文档类型 (固定为 "Tasks Store")
  - reference_name: 关联文档名称
  - store_id: 店铺ID
  - task_id: 任务ID
  - approval_step: 当前审批步骤
  - approver: 审批人
  - action: 操作类型 (提交/通过/退回上级/退回提交人)
  - comments: 审批意见/退回原因
  - action_time: 操作时间

#### 2. 修改现有DocType

**Tasks Store** (扩展字段)
- current_approval_step: 当前审批步骤 (Int) - 默认0，0表示未提交
- workflow_id: 关联的审批流程 (Link to Approval Workflow)
- submitted_by: 提交人 (Link to User)
- can_edit: 是否可编辑 (Check) - 默认1，退回后为True
- rejection_reason: 退回原因 (Text) - 最近一次退回的原因
- current_approver: 当前审批人 (Link to User) - 用于混合模式下指定具体审批人

#### 3. 角色定义和权限

需要创建以下角色:
- **Store Manager** (店铺负责人) - 提交计划，查看自己店铺的数据
- **Regional Manager** (区域经理) - 一级审批，查看区域内店铺数据
- **Director** (总监) - 二级审批，查看所有数据
- **Planning Admin** (计划管理员) - 配置审批流程，查看所有数据

权限设计:
- Store Manager: 只能编辑和提交自己负责的店铺计划
- Regional Manager: 可以审批分配给自己的任务
- Director: 可以审批所有到达该层级的任务
- Planning Admin: 可以配置审批流程，查看所有审批记录

### 工作流程

#### 提交流程
1. 店铺负责人在 store_detail 页面编辑商品计划
2. 点击"提交审批"按钮
3. 系统根据店铺和任务类型匹配审批流程
4. 更新 Tasks Store 的状态为"已提交"，approval_status为"待审批"
5. 创建 Approval History 记录
6. 锁定 Commodity Schedule 数据（不可编辑）

#### 审批流程
1. 审批人在 planning_dashboard 看到待审批任务
2. 点击进入审批页面，查看商品计划详情
3. 可以选择:
   - **通过**: 进入下一审批步骤或完成审批
   - **退回上一级**: 退回到上一个审批步骤
   - **退回提交人**: 直接退回到店铺负责人
4. 退回时必须填写退回原因
5. 记录审批历史

#### 退回后修改
1. 被退回后，Tasks Store 的 can_edit 设为 True
2. 店铺负责人可以修改 Commodity Schedule 数据
3. 修改后重新提交，重新开始审批流程

### API设计

#### 新增API方法

**提交和审批相关**:
1. `submit_for_approval(task_id, store_id)` - 提交审批
   - 验证数据完整性
   - 匹配审批流程
   - 锁定Commodity Schedule数据
   - 创建审批历史记录
   - 返回: {status, workflow_id, next_approver_role}

2. `approve_task(task_id, store_id, action, comments)` - 审批操作
   - action: "approve" | "reject_to_previous" | "reject_to_submitter"
   - 验证审批权限
   - 更新审批状态和步骤
   - 记录审批历史
   - 返回: {status, message, next_step}

3. `get_approval_history(task_id, store_id)` - 获取审批历史
   - 返回完整的审批记录链
   - 包含每个步骤的审批人、时间、操作、意见

4. `get_pending_approvals(filters)` - 获取待审批列表
   - 根据当前用户角色筛选
   - 支持按任务类型、店铺等筛选
   - 返回待审批的任务列表

5. `get_workflow_for_task(task_id, store_id)` - 获取适用的审批流程
   - 根据任务类型和店铺类型匹配
   - 返回完整的审批步骤配置

6. `check_can_edit(task_id, store_id)` - 检查是否可编辑
   - 验证当前用户是否有编辑权限
   - 检查审批状态

7. `resubmit_after_rejection(task_id, store_id)` - 退回后重新提交
   - 重置审批流程
   - 清除退回原因
   - 重新开始审批

### 前端改造

#### planning_dashboard 页面
- 添加"待我审批"筛选器
- 显示当前审批步骤
- 添加审批操作按钮

#### store_detail 页面
- 添加"提交审批"按钮
- 根据审批状态控制数据是否可编辑
- 显示审批历史和当前状态
- 添加审批操作界面（通过/退回）

## 关键文件清单

### 需要创建的文件

1. DocType定义:
   - `product_sales_planning/planning_system/doctype/approval_workflow/`
   - `product_sales_planning/planning_system/doctype/approval_workflow_step/`
   - `product_sales_planning/planning_system/doctype/approval_history/`

2. Python控制器:
   - `approval_workflow.py` - 审批流程逻辑
   - `approval_history.py` - 审批历史记录
   - `approval_api.py` - 审批相关API

### 需要修改的文件

1. DocType:
   - `product_sales_planning/planning_system/doctype/tasks_store/tasks_store.json` - 添加字段

2. Python:
   - `product_sales_planning/planning_system/page/planning_dashboard/planning_dashboard.py` - 添加审批相关查询
   - `product_sales_planning/planning_system/page/store_detail/store_detail.py` - 添加提交和审批API

3. JavaScript:
   - `product_sales_planning/planning_system/page/planning_dashboard/planning_dashboard.js` - 添加审批UI
   - `product_sales_planning/planning_system/page/store_detail/store_detail.js` - 添加提交和审批UI

4. Hooks:
   - `product_sales_planning/hooks.py` - 注册新的API方法

## 实施步骤

### 阶段1: 数据模型和基础架构 (预计2-3小时)

**1.1 创建 Approval Workflow DocType**
- 使用 `bench new-doctype` 或 Frappe UI 创建
- 配置字段: workflow_name, task_type, store_type, is_active, is_default
- 设置子表字段: approval_steps (Table - Approval Workflow Step)
- 配置权限: Planning Admin 可以创建和修改

**1.2 创建 Approval Workflow Step DocType (子表)**
- 标记为 istable: 1
- 配置字段: step_order, step_name, approver_role, is_final, can_reject_to_submitter
- 设置 approver_role 为 Link to Role

**1.3 创建 Approval History DocType**
- 配置字段: reference_doctype, reference_name, store_id, task_id, approval_step, approver, action, comments, action_time
- 设置 action 为 Select: "提交/通过/退回上级/退回提交人"
- 配置权限: 所有角色可读，系统自动创建

**1.4 修改 Tasks Store DocType**
- 添加字段: current_approval_step (Int, 默认0)
- 添加字段: workflow_id (Link to Approval Workflow)
- 添加字段: submitted_by (Link to User)
- 添加字段: can_edit (Check, 默认1)
- 添加字段: rejection_reason (Text)
- 运行 `bench migrate` 应用更改

**1.5 创建角色**
- 在 Frappe UI 中创建: Store Manager, Regional Manager, Director, Planning Admin
- 配置各 DocType 的角色权限

### 阶段2: 后端API实现 (预计4-5小时)

**2.1 创建审批API模块**
- 创建文件: `product_sales_planning/planning_system/doctype/approval_workflow/approval_api.py`
- 实现核心函数:
  - `get_applicable_workflow(task_id, store_id)` - 匹配审批流程
  - `validate_approval_permission(user, role, task_id, store_id)` - 验证权限

**2.2 实现提交审批API**
- 在 `store_detail.py` 中添加 `submit_for_approval(task_id, store_id)`
- 逻辑:
  1. 验证用户是否为店铺负责人
  2. 检查是否有商品计划数据
  3. 匹配审批流程
  4. 更新 Tasks Store: status="已提交", approval_status="待审批", current_approval_step=1
  5. 创建 Approval History 记录
  6. 返回成功信息和下一步审批人角色

**2.3 实现审批操作API**
- 在 `store_detail.py` 中添加 `approve_task(task_id, store_id, action, comments)`
- 逻辑:
  1. 验证用户角色是否匹配当前审批步骤
  2. 根据 action 执行不同操作:
     - "approve": current_approval_step++, 如果是最后一步则 approval_status="已通过"
     - "reject_to_previous": current_approval_step--, approval_status="已驳回", can_edit=True
     - "reject_to_submitter": current_approval_step=0, approval_status="已驳回", can_edit=True
  3. 记录 rejection_reason
  4. 创建 Approval History 记录
  5. 返回操作结果

**2.4 实现查询API**
- `get_approval_history(task_id, store_id)` - 查询审批历史
- `get_pending_approvals(filters)` - 获取待审批列表
  - 根据当前用户角色筛选
  - 返回 current_approval_step 匹配用户角色的任务
- `check_can_edit(task_id, store_id)` - 检查是否可编辑
  - 检查 can_edit 字段和用户权限

**2.5 注册API到 hooks.py**
- 添加所有新API方法到 `api_methods` 列表

### 阶段3: 前端UI实现 (预计4-5小时)

**3.1 store_detail 页面改造**
- 在操作按钮区域添加:
  - "提交审批" 按钮 (仅店铺负责人可见，且 status="未开始")
  - "通过" 按钮 (仅审批人可见，且当前步骤匹配)
  - "退回上一级" 按钮 (仅审批人可见)
  - "退回提交人" 按钮 (仅审批人可见，且配置允许)
- 添加审批状态显示区域:
  - 当前审批步骤
  - 审批流程进度条
  - 退回原因显示 (如果被退回)
- 根据 can_edit 字段控制表格是否可编辑
- 实现退回原因对话框 (使用 frappe.prompt)

**3.2 planning_dashboard 页面改造**
- 在筛选器区域添加:
  - "待我审批" 快捷筛选按钮
  - 审批状态筛选器
- 在任务卡片中显示:
  - 当前审批步骤 (如 "区域经理审批中")
  - 审批进度图标
- 点击任务卡片时:
  - 如果是待审批任务，跳转到 store_detail 并显示审批操作按钮
  - 如果是普通任务，正常跳转

**3.3 审批历史组件**
- 在 store_detail 页面添加"审批历史"标签页或折叠面板
- 显示时间线格式的审批记录:
  - 操作时间
  - 操作人
  - 操作类型 (提交/通过/退回)
  - 审批意见/退回原因
- 使用 Frappe 的 Timeline 组件或自定义实现

**3.4 交互优化**
- 提交审批前确认对话框
- 审批操作后刷新页面状态
- 错误提示和成功提示
- 加载状态指示器

### 阶段4: 测试和优化 (预计2-3小时)

**4.1 创建测试数据**
- 创建测试角色和用户:
  - 店铺负责人用户 (Store Manager 角色)
  - 区域经理用户 (Regional Manager 角色)
  - 总监用户 (Director 角色)
- 创建审批流程配置:
  - 月度计划流程: 店铺负责人 → 区域经理 → 总监
  - 促销活动流程: 店铺负责人 → 总监
- 创建测试任务和店铺数据

**4.2 功能测试**
- 测试提交流程:
  - 店铺负责人提交计划
  - 验证状态更新正确
  - 验证审批历史记录创建
- 测试审批流程:
  - 区域经理审批通过
  - 验证步骤推进正确
  - 总监最终审批
  - 验证状态变为"已通过"
- 测试退回流程:
  - 退回上一级
  - 退回提交人
  - 验证 can_edit 字段更新
  - 验证退回原因记录
  - 修改数据后重新提交

**4.3 权限测试**
- 验证店铺负责人只能看到自己的店铺
- 验证审批人只能审批匹配角色的任务
- 验证非审批人无法进行审批操作
- 验证审批中的数据无法编辑

**4.4 边界情况测试**
- 并发审批测试
- 流程配置缺失时的处理
- 用户角色变更时的处理
- 审批流程中途修改配置的处理

**4.5 性能优化**
- 优化审批历史查询 (添加索引)
- 优化待审批列表查询 (使用缓存)
- 前端加载优化

## 技术实现要点

### 1. 权限控制实现
```python
def validate_approval_permission(user, task_id, store_id):
    # 获取当前审批步骤
    tasks_store = frappe.get_doc("Tasks Store", {"parent": task_id, "store_name": store_id})
    workflow = frappe.get_doc("Approval Workflow", tasks_store.workflow_id)

    # 获取当前步骤的审批角色
    current_step = workflow.approval_steps[tasks_store.current_approval_step - 1]
    required_role = current_step.approver_role

    # 检查用户是否有该角色
    user_roles = frappe.get_roles(user)
    if required_role not in user_roles:
        frappe.throw("您没有权限审批此任务")
```

### 2. 数据锁定实现
- 在 Commodity Schedule 的 before_save 钩子中检查:
```python
def before_save(self):
    # 检查关联的 Tasks Store 是否在审批中
    tasks_store = frappe.db.get_value("Tasks Store",
        {"parent": self.task_id, "store_name": self.store_id},
        ["status", "can_edit"], as_dict=True)

    if tasks_store and tasks_store.status == "已提交" and not tasks_store.can_edit:
        frappe.throw("该计划正在审批中，无法修改")
```

### 3. 审批流程匹配逻辑
```python
def get_applicable_workflow(task_id, store_id):
    # 获取任务类型
    task = frappe.get_doc("Schedule tasks", task_id)
    task_type = task.type

    # 获取店铺类型
    store = frappe.get_doc("Store List", store_id)
    store_type = store.shop_type

    # 匹配审批流程 (优先匹配具体类型，其次匹配默认流程)
    workflow = frappe.db.get_value("Approval Workflow",
        {"task_type": task_type, "store_type": store_type, "is_active": 1}, "name")

    if not workflow:
        workflow = frappe.db.get_value("Approval Workflow",
            {"task_type": task_type, "is_default": 1, "is_active": 1}, "name")

    return workflow
```

### 4. 并发控制
- 使用 Frappe 的事务机制
- 在审批操作前检查当前状态
- 使用乐观锁 (检查 modified 时间戳)

### 5. 审计追踪
- 所有操作都记录到 Approval History
- 记录操作人、操作时间、操作类型、意见
- 不允许删除或修改历史记录

## 用户确认的功能范围

✅ **需要实现**:
- 动态多级审批流程
- 基于角色的审批人自动分配
- 退回上一级和退回提交人功能
- 退回原因记录
- 完整的审批历史追踪

❌ **暂不实现**:
- 审批通知功能（邮件/站内信）
- 审批委托功能
- 审批超时自动处理
- 可视化流程配置界面（使用DocType标准界面配置）

## 预期工作量

- **阶段1 (数据模型)**: 2-3小时
- **阶段2 (后端API)**: 4-5小时
- **阶段3 (前端UI)**: 4-5小时
- **阶段4 (测试优化)**: 2-3小时
- **总计**: 12-16小时

## 交付物

1. 3个新的 DocType (Approval Workflow, Approval Workflow Step, Approval History)
2. 修改后的 Tasks Store DocType
3. 7个新的 API 方法
4. 改造后的 planning_dashboard 和 store_detail 页面
5. 完整的测试数据和审批流程配置示例
6. 使用文档 (如何配置审批流程)

## 后续扩展建议

1. **通知功能**: 集成 Frappe 的通知系统，发送邮件和站内消息
2. **审批委托**: 允许审批人临时委托给其他人
3. **批量审批**: 支持一次审批多个任务
4. **审批报表**: 统计审批效率、退回率等指标
5. **移动端支持**: 优化移动端审批体验
6. **审批提醒**: 超时未审批的提醒功能
