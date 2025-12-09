# 实现任务清单

## 1. 代码修改
- [x] 1.1 在 `frontend/src/pages/PlanningDashboard.vue` 的 `<script setup>` 中导入 `watch` 函数
- [x] 1.2 添加 `watch` 监听器监听 `currentTab` 的变化
- [x] 1.3 在 `watch` 回调中调用 `dashboardData.reload()` 刷新任务列表数据
- [x] 1.4 确保 `watch` 在组件挂载后生效，避免初始化时重复加载

## 2. 测试验证
- [x] 2.1 在开发环境启动 Vue 前端（`cd frontend && yarn dev`）
- [x] 2.2 访问 http://172.28.129.44:8080/planning/ 页面
- [x] 2.3 验证点击"待完成"标签页显示待完成任务列表
- [x] 2.4 验证点击"已完成"标签页自动刷新并显示已完成任务列表
- [x] 2.5 验证切换标签页时显示加载状态（loading spinner）
- [x] 2.6 验证筛选条件在标签页切换后仍然生效
- [x] 2.7 验证"已完成"标签页自动清空"审批状态"筛选条件

## 3. 构建和部署
- [x] 3.1 运行 `yarn build` 构建生产版本
- [x] 3.2 运行 `bench --site [site-name] clear-cache` 清除 Frappe 缓存
- [x] 3.3 在生产环境验证功能正常（http://172.28.129.44:8000/planning/）
