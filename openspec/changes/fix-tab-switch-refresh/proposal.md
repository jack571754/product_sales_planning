# Change: 修复计划看板标签页切换时数据不自动刷新的问题

## Why

在 http://172.28.129.44:8000/planning/ 页面中，用户点击"待完成"和"已完成"标签页切换时，任务列表没有自动刷新显示对应标签页的数据。这导致用户需要手动点击"查询"按钮才能看到正确的数据，影响用户体验。

根本原因：
- `switchTab()` 函数虽然调用了 `applyFilters()` 来触发数据重新加载
- 但 `dashboardData` 使用 `makeParams()` 依赖 `currentTab.value` 的响应式更新
- Vue 的响应式更新是异步的，可能导致 `reload()` 时读取到旧的 `currentTab` 值
- 缺少明确的响应式依赖追踪机制来确保标签页切换时数据正确刷新

## What Changes

- 在 `frontend/src/pages/PlanningDashboard.vue` 中添加 Vue 的 `watch` 监听器
- 监听 `currentTab` 的变化，当标签页切换时自动触发数据刷新
- 确保 `dashboardData.reload()` 在 `currentTab` 更新后执行
- 保持现有的 `applyFilters()` 逻辑不变，作为手动刷新的入口

## Impact

- 受影响的文件：`frontend/src/pages/PlanningDashboard.vue`
- 受影响的功能：计划看板标签页切换
- 用户体验改进：标签页切换时自动显示对应数据，无需手动点击查询按钮
- 向后兼容：不影响现有的筛选、查询、重置功能
