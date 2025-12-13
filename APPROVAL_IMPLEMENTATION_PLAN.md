# 店铺详情页面审批功能实现规划

## 📋 概述

本文档详细规划了在店铺详情页面（`http://192.168.28.227:8001/planning/store-detail/SC-5-744/2025-12-MON-745`）中实现审批提交功能的完整方案。

## 🎯 实现目标

1. **审批状态展示**：通过状态卡片清晰展示当前审批状态和流程进度
2. **审批操作**：提供提交审批、撤回、审批通过/驳回等操作
3. **审批历史**：通过弹窗查看完整的审批历史记录
4. **权限控制**：根据用户角色动态显示可用操作
5. **实时反馈**：操作后立即更新状态并提供用户反馈

## 🏗️ 架构设计

### 1. 组件结构

```
StoreDetail.vue (主页面)
├── ApprovalStatusCard.vue (审批状态卡片)
│   ├── 状态展示区域
│   ├── 流程进度展示
│   ├── 操作按钮组
│   └── 审批历史对话框
└── useApproval.js (审批逻辑 Composable)
    ├── 状态管理
    ├── API 调用
    └── 业务逻辑
```

### 2. 数据流

```
用户操作 → ApprovalStatusCard → useApproval → API调用 → 后端处理
                ↓                      ↓
            UI更新 ← 状态刷新 ← API响应 ← 数据库更新
```

## 📦 需要创建的文件

### 1. `useApproval.js` - 审批逻辑 Composable

**路径**: `apps/product_sales_planning/frontend/src/composables/useApproval.js`

**功能**:
- 管理审批状态数据
- 提供审批操作方法（提交、撤回、审批）
- 处理审批历史数据
- 权限判断逻辑

**主要方法**:
```javascript
- fetchApprovalStatus()      // 获取审批状态
- fetchApprovalHistory()     // 获取审批历史
- submitForApproval(comment) // 提交审批
- withdrawApproval(comment)  // 撤回审批
- approveTask(action, comment) // 审批操作
- refreshApprovalData()      // 刷新数据
```

**状态管理**:
```javascript
- approvalStatus: ref(null)     // 审批状态
- approvalHistory: ref([])      // 审批历史
- submitting: ref(false)        // 提交中
- approving: ref(false)         // 审批中
- withdrawing: ref(false)       // 撤回中
```

**计算属性**:
```javascript
- currentStatus      // 当前审批状态
- canSubmit          // 是否可提交
- canWithdraw        // 是否可撤回
- canApprove         // 是否可审批
- currentStep        // 当前步骤
- workflowSteps      // 流程步骤列表
- hasWorkflow        // 是否有审批流程
- rejectionReason    // 驳回原因
```

### 2. `ApprovalStatusCard.vue` - 审批状态卡片组件

**路径**: `apps/product_sales_planning/frontend/src/components/store-detail/ApprovalStatusCard.vue`

**功能**:
- 展示当前审批状态
- 显示审批流程进度
- 提供审批操作按钮
- 展示审批历史（弹窗）

**UI 结构**:

```
┌─────────────────────────────────────────┐
│ 📋 审批状态              [查看历史]     │
├─────────────────────────────────────────┤
│                                         │
│  当前状态: [待审批] 🔵                  │
│                                         │
│  审批流程:                              │
│  ● 第一级审批 (店长) ✓                 │
│  ● 第二级审批 (区域经理) ← 当前        │
│  ○ 第三级审批 (总监)                   │
│                                         │
│  [提交审批] [撤回审批]                  │
│  [审批通过] [驳回 ▼]                   │
│                                         │
└─────────────────────────────────────────┘
```

**操作按钮逻辑**:

| 状态 | 角色 | 显示按钮 |
|------|------|----------|
| 未提交/已驳回 | 店铺负责人 | 提交审批 |
| 待审批 | 提交人 | 撤回审批 |
| 待审批 | 当前审批人 | 审批通过、驳回 |
| 已通过 | 所有人 | 无操作按钮 |

**对话框**:
1. **提交审批对话框**: 输入提交说明
2. **撤回审批对话框**: 输入撤回原因 + 确认提示
3. **审批通过对话框**: 输入审批意见
4. **驳回对话框**: 选择驳回类型（退回上级/退回提交人）+ 输入驳回原因（必填）
5. **审批历史对话框**: 时间线展示所有审批记录

## 🔌 API 接口

### 使用的后端接口

1. **获取审批状态**
```javascript
product_sales_planning.api.v1.approval.get_approval_status
参数: { task_id, store_id }
返回: { workflow, history, can_edit, can_approve, user_roles }
```

2. **提交审批**
```javascript
product_sales_planning.api.v1.approval.submit_for_approval
参数: { task_id, store_id, comment }
返回: { status, message, workflow_id, next_approver_role }
```

3. **撤回审批**
```javascript
product_sales_planning.api.v1.approval.withdraw_approval
参数: { task_id, store_id, comment }
返回: { status, message }
```

4. **审批操作**
```javascript
product_sales_planning.api.v1.approval.approve_task_store
参数: { task_id, store_id, action, comments }
action: "approve" | "reject_to_previous" | "reject_to_submitter"
返回: { status, message }
```

5. **获取审批历史**
```javascript
product_sales_planning.api.v1.approval.get_approval_history
参数: { task_id, store_id }
返回: { status, data: [...] }
```

## 🔄 集成到现有页面

### 修改 `StoreDetail.vue`

1. **导入审批组件和 Composable**
```vue
import ApprovalStatusCard from '../components/store-detail/ApprovalStatusCard.vue'
import { useApproval } from '../composables/useApproval'
```

2. **初始化审批功能**
```javascript
const {
  approvalStatus,
  approvalHistory,
  canSubmit,
  canWithdraw,
  canApprove,
  currentStatus,
  currentStep,
  workflowSteps,
  hasWorkflow,
  rejectionReason,
  submitting,
  withdrawing,
  approving,
  historyLoading,
  submitForApproval,
  withdrawApproval,
  approveTask,
  fetchApprovalStatus,
  fetchApprovalHistory,
  refreshApprovalData
} = useApproval(props.storeId, props.taskId)
```

3. **在页面中添加审批状态卡片**
```vue
<!-- 在 StatsCards 和 FilterPanel 之间插入 -->
<ApprovalStatusCard
  v-if="hasWorkflow"
  :has-workflow="hasWorkflow"
  :current-status="currentStatus"
  :can-submit="canSubmit"
  :can-withdraw="canWithdraw"
  :can-approve="canApprove"
  :current-step="currentStep"
  :workflow-steps="workflowSteps"
  :rejection-reason="rejectionReason"
  :approval-history="approvalHistory"
  :history-loading="historyLoading"
  :submitting="submitting"
  :withdrawing="withdrawing"
  :approving="approving"
  @submit="handleSubmitApproval"
  @withdraw="handleWithdrawApproval"
  @approve="handleApproveTask"
  @refresh-history="fetchApprovalHistory"
  class="approval-section"
/>
```

4. **添加事件处理方法**
```javascript
const handleSubmitApproval = async (comment) => {
  const result = await submitForApproval(comment)
  if (result.success) {
    toast.success(result.message)
    await refreshData() // 刷新商品数据
  } else {
    toast.error(result.message)
  }
}

const handleWithdrawApproval = async (comment) => {
  const result = await withdrawApproval(comment)
  if (result.success) {
    toast.success(result.message)
    await refreshData()
  } else {
    toast.error(result.message)
  }
}

const handleApproveTask = async (action, comment) => {
  const result = await approveTask(action, comment)
  if (result.success) {
    toast.success(result.message)
    await refreshData()
  } else {
    toast.error(result.message)
  }
}
```

5. **在页面加载时获取审批状态**
```javascript
onMounted(async () => {
  await fetchApprovalStatus()
  await fetchApprovalHistory()
})
```

### 修改 `useStoreDetail.js`

在 `canEdit` 计算属性中集成审批状态：

```javascript
const canEdit = computed(() => {
  // 原有逻辑
  const baseCanEdit = commodityData.data?.can_edit || false
  
  // 如果有审批流程，需要检查审批状态
  if (approvalStatus.value) {
    const state = approvalStatus.value.workflow?.current_state
    // 审批中不可编辑
    if (state?.status === '已提交' && !state?.can_edit) {
      return false
    }
  }
  
  return baseCanEdit
})
```

## 🎨 UI/UX 设计要点

### 1. 状态颜色方案

| 状态 | 颜色 | Badge主题 |
|------|------|-----------|
| 未提交 | 灰色 | gray |
| 待审批 | 蓝色 | blue |
| 已通过 | 绿色 | green |
| 已驳回 | 红色 | red |

### 2. 流程进度展示

- **已完成步骤**: 绿色圆圈 + 对勾图标
- **当前步骤**: 蓝色圆圈 + 步骤数字
- **待审批步骤**: 灰色圆圈 + 步骤数字
- **连接线**: 已完成为绿色，未完成为灰色

### 3. 审批历史时间线

```
● 提交 (蓝色)
│ 操作人: 张三
│ 时间: 2025-12-13 10:30
│ 说明: 提交审批
│
● 通过 (绿色)
│ 操作人: 李四
│ 时间: 2025-12-13 11:00
│ 步骤: 第1级
│ 意见: 同意
│
● 退回提交人 (红色)
  操作人: 王五
  时间: 2025-12-13 14:00
  步骤: 第2级
  原因: 数据需要修正
```

### 4. 响应式设计

- **桌面端**: 审批状态卡片占满宽度，按钮横向排列
- **移动端**: 按钮纵向堆叠，对话框全屏显示

## 🔒 权限控制逻辑

### 1. 提交审批权限

```javascript
canSubmit = 
  用户是店铺负责人 &&
  (状态为"未开始" || 状态为"已驳回") &&
  有商品数据
```

### 2. 撤回审批权限

```javascript
canWithdraw = 
  用户是提交人 &&
  状态为"已提交" &&
  审批状态为"待审批"
```

### 3. 审批权限

```javascript
canApprove = 
  用户角色包含当前步骤要求的角色 &&
  审批状态为"待审批" &&
  (
    审批类型为"基于角色" ||
    (审批类型为"基于店铺范围" && 用户负责该店铺) ||
    (审批类型为"基于店铺属性" && 用户匹配店铺属性)
  )
```

### 4. 编辑权限

```javascript
canEdit = 
  用户是店铺负责人 &&
  (
    状态为"未开始" ||
    (状态为"已驳回" && can_edit标志为true)
  )
```

## 📝 实现步骤

### 阶段 1: 创建基础组件 ✅

1. ✅ 创建 `useApproval.js` Composable
2. ✅ 创建 `ApprovalStatusCard.vue` 组件
3. ✅ 实现基本的状态展示和按钮

### 阶段 2: 集成到主页面

1. [ ] 修改 `StoreDetail.vue`，导入审批组件
2. [ ] 添加审批状态卡片到页面布局
3. [ ] 实现事件处理方法
4. [ ] 在页面加载时获取审批数据

### 阶段 3: 实现对话框功能

1. [ ] 实现提交审批对话框
2. [ ] 实现撤回审批对话框
3. [ ] 实现审批通过对话框
4. [ ] 实现驳回对话框（含类型选择）
5. [ ] 实现审批历史对话框

### 阶段 4: 完善交互和反馈

1. [ ] 添加加载状态提示
2. [ ] 添加成功/失败提示
3. [ ] 实现操作后自动刷新
4. [ ] 添加错误处理

### 阶段 5: 测试和优化

1. [ ] 测试各种审批场景
2. [ ] 测试权限控制
3. [ ] 测试响应式布局
4. [ ] 性能优化

## 🧪 测试场景

### 1. 提交审批流程

1. 店铺负责人登录
2. 进入店铺详情页面
3. 添加商品数据
4. 点击"提交审批"
5. 输入提交说明
6. 确认提交
7. 验证状态变为"待审批"
8. 验证不可编辑

### 2. 审批通过流程

1. 审批人登录
2. 进入店铺详情页面
3. 查看审批状态卡片
4. 点击"审批通过"
5. 输入审批意见
6. 确认通过
7. 验证进入下一级或完成审批

### 3. 驳回流程

1. 审批人登录
2. 点击"驳回"下拉菜单
3. 选择"退回上一级"或"退回提交人"
4. 输入驳回原因
5. 确认驳回
6. 验证状态变为"已驳回"
7. 验证可以重新编辑

### 4. 撤回流程

1. 提交人登录
2. 在待审批状态下
3. 点击"撤回审批"
4. 确认撤回
5. 验证状态恢复为"未开始"
6. 验证可以编辑

### 5. 审批历史查看

1. 任意用户登录
2. 点击"查看历史"
3. 验证显示完整的审批记录
4. 验证时间线展示正确
5. 验证操作人和意见显示正确

## 📊 数据结构

### 审批状态响应

```javascript
{
  status: "success",
  data: {
    workflow: {
      has_workflow: true,
      workflow: {
        name: "WF-001",
        workflow_name: "月度计划审批流程",
        steps: [
          {
            step_order: 1,
            step_name: "店长审批",
            approver_role: "店长",
            is_final: false
          },
          {
            step_order: 2,
            step_name: "区域经理审批",
            approver_role: "区域经理",
            is_final: false
          },
          {
            step_order: 3,
            step_name: "总监审批",
            approver_role: "总监",
            is_final: true
          }
        ]
      },
      current_state: {
        status: "已提交",
        approval_status: "待审批",
        current_step: 2,
        can_edit: false,
        rejection_reason: null
      }
    },
    history: [...],
    can_edit: false,
    can_approve: true,
    user_roles: ["区域经理", "User"]
  }
}
```

### 审批历史记录

```javascript
[
  {
    name: "AH-001",
    task_id: "2025-12-MON-745",
    store_id: "SC-5-744",
    approval_step: 0,
    approver: "user@example.com",
    action: "提交",
    comments: "提交审批",
    action_time: "2025-12-13 10:30:00"
  },
  {
    name: "AH-002",
    task_id: "2025-12-MON-745",
    store_id: "SC-5-744",
    approval_step: 1,
    approver: "manager@example.com",
    action: "通过",
    comments: "同意",
    action_time: "2025-12-13 11:00:00"
  }
]
```

## 🚀 部署和发布

### 1. 开发环境测试

```bash
cd apps/product_sales_planning/frontend
npm run dev
```

### 2. 构建生产版本

```bash
npm run build
```

### 3. 部署到服务器

```bash
bench build --app product_sales_planning
bench restart
```

## 📚 相关文档

- [API文档](./product_sales_planning/docs/api_documentation.md)
- [审批流程说明](./CLAUDE.md#审批流程逻辑)
- [Frappe UI组件库](https://frappeui.com/)

## 🔧 故障排查

### 问题1: 审批按钮不显示

**原因**: 权限判断逻辑错误或审批状态未正确加载

**解决**: 
1. 检查 `fetchApprovalStatus()` 是否成功调用
2. 检查返回的 `can_approve` 字段
3. 检查用户角色是否正确

### 问题2: 提交审批失败

**原因**: 没有商品数据或审批流程未配置

**解决**:
1. 确保至少有一条商品计划数据
2. 检查是否配置了对应的审批流程
3. 查看后端错误日志

### 问题3: 审批历史不显示

**原因**: API调用失败或数据格式错误

**解决**:
1. 检查 `fetchApprovalHistory()` 返回值
2. 检查数据格式是否符合预期
3. 查看浏览器控制台错误

## ✅ 验收标准

1. ✅ 审批状态卡片正确显示当前状态
2. ✅ 审批流程进度正确展示
3. ✅ 根据权限正确显示操作按钮
4. ✅ 提交审批功能正常工作
5. ✅ 撤回审批功能正常工作
6. ✅ 审批通过功能正常工作
7. ✅ 驳回功能正常工作（两种类型）
8. ✅ 审批历史正确显示
9. ✅ 操作后状态实时更新
10. ✅ 错误处理和用户提示完善
11. ✅ 响应式布局在各设备上正常显示
12. ✅ 性能良好，无明显卡顿

## 📅 时间估算

- 阶段1: 2小时
- 阶段2: 1小时
- 阶段3: 2小时
- 阶段4: 1小时
- 阶段5: 2小时

**总计**: 约8小时

---

**文档版本**: 1.0
**创建日期**: 2025-12-13
**最后更新**: 2025-12-13