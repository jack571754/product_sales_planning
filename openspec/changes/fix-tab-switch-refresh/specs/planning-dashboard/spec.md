# Planning Dashboard - 计划看板

## MODIFIED Requirements

### Requirement: 标签页切换自动刷新
计划看板 SHALL 在用户切换"待完成"和"已完成"标签页时自动刷新任务列表数据，无需用户手动点击查询按钮。

#### Scenario: 切换到待完成标签页
- **GIVEN** 用户当前在"已完成"标签页
- **WHEN** 用户点击"待完成"标签页
- **THEN** 系统自动加载待完成任务列表
- **AND** 显示加载状态指示器
- **AND** 加载完成后显示待完成任务数据

#### Scenario: 切换到已完成标签页
- **GIVEN** 用户当前在"待完成"标签页
- **WHEN** 用户点击"已完成"标签页
- **THEN** 系统自动加载已完成任务列表
- **AND** 自动清空"审批状态"筛选条件（已完成任务不需要审批状态筛选）
- **AND** 显示加载状态指示器
- **AND** 加载完成后显示已完成任务数据

#### Scenario: 标签页切换保持筛选条件
- **GIVEN** 用户已选择店铺和计划任务筛选条件
- **WHEN** 用户切换标签页
- **THEN** 店铺和计划任务筛选条件保持不变
- **AND** 新标签页的数据根据保留的筛选条件进行过滤

#### Scenario: 重复点击同一标签页
- **GIVEN** 用户当前在"待完成"标签页
- **WHEN** 用户再次点击"待完成"标签页
- **THEN** 系统不触发数据刷新
- **AND** 保持当前显示的任务列表

## ADDED Requirements

### Requirement: 响应式标签页状态追踪
系统 SHALL 使用 Vue 的 `watch` 机制监听标签页状态变化，确保标签页切换时数据刷新的可靠性。

#### Scenario: 标签页状态变化触发数据加载
- **GIVEN** 计划看板组件已挂载
- **WHEN** `currentTab` 响应式变量的值发生变化
- **THEN** 自动触发 `dashboardData.reload()` 方法
- **AND** 使用最新的 `currentTab` 值作为 API 请求参数

#### Scenario: 避免初始化时重复加载
- **GIVEN** 计划看板组件正在初始化
- **WHEN** `onMounted` 生命周期钩子触发初始数据加载
- **THEN** `watch` 监听器不触发额外的数据加载
- **AND** 仅执行一次初始数据请求
