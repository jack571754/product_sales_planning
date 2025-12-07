# frappe-ui 集成使用指南

本文档记录在 Vue 3 项目中集成 frappe-ui 的关键要点和常见问题解决方案。

## 核心概念

### 1. createResource 的响应式参数

**关键发现**：`createResource` 的 `params` 必须是**函数**，返回响应式数据，才能实现自动重新加载。

#### ❌ 错误用法（参数不会更新）

```javascript
const filters = ref({
  task_type: [],
  status: [],
  store_id: []
})

const dashboardData = createResource({
  url: 'your.api.method',
  params: {
    filters: JSON.stringify(filters.value),  // ❌ 只会取初始值
    current_tab: currentTab.value             // ❌ 不会响应变化
  },
  auto: true
})
```

**问题**：`params` 是对象时，只会在创建时取一次值，后续 `filters` 或 `currentTab` 变化时不会更新。

#### ✅ 正确用法（参数自动更新）

```javascript
const filters = ref({
  task_type: [],
  status: [],
  store_id: []
})

const dashboardData = createResource({
  url: 'your.api.method',
  params: () => ({  // ✅ 使用函数返回参数
    filters: JSON.stringify(filters.value),
    current_tab: currentTab.value,
    search_text: searchText.value,
    sort_by: sortBy.value
  }),
  auto: true
})
```

**原理**：
- `params` 是函数时，frappe-ui 会在每次请求前调用该函数
- 函数内部访问 `.value`，会建立响应式依赖
- 当 `filters.value` 等变化时，下次请求会自动使用最新值

### 2. 手动触发重新加载

当筛选条件变化时，需要手动调用 `reload()` 方法：

```javascript
// 监听筛选条件变化
watch([filters, currentTab, searchText, sortBy], () => {
  dashboardData.reload()  // 触发重新加载
}, { deep: true })
```

**注意**：
- `auto: true` 只在组件挂载时自动加载一次
- 后续参数变化需要手动调用 `reload()`
- `watch` 的 `deep: true` 用于深度监听对象内部变化

### 3. MultiSelect 组件的正确用法

#### 基本用法

```vue
<MultiSelect
  v-model="filters.task_type"
  :options="taskTypeOptions"
  placeholder="选择任务类型"
/>
```

#### 选项格式

```javascript
// 简单格式（字符串数组）
const taskTypeOptions = ref(['MON', 'PRO'])

// 对象格式（带标签和值）
const statusOptions = ref([
  { label: '草稿', value: 'Draft' },
  { label: '待审批', value: 'Pending' },
  { label: '已通过', value: 'Approved' }
])
```

#### 从后端加载选项

```javascript
const filterOptions = createResource({
  url: 'your.api.get_filter_options',
  auto: true,
  onSuccess(data) {
    // 后端返回 { task_types: [...], statuses: [...], stores: [...] }
    taskTypeOptions.value = data.task_types || []
    statusOptions.value = data.statuses || []
    storeOptions.value = data.stores || []
  }
})
```

#### 自定义选项显示（使用插槽）

```vue
<MultiSelect
  v-model="filters.store_id"
  :options="storeOptions"
>
  <template #option="{ option }">
    <div class="flex items-center gap-2">
      <Avatar :label="option.label" size="sm" />
      <div>
        <div class="font-medium">{{ option.label }}</div>
        <div class="text-xs text-gray-600">{{ option.value }}</div>
      </div>
    </div>
  </template>
</MultiSelect>
```

### 4. 响应式数据的深度监听

对于嵌套对象（如 `filters`），需要使用 `deep: true`：

```javascript
const filters = ref({
  task_type: [],
  status: [],
  store_id: []
})

// ✅ 深度监听，能捕获 filters.task_type 的变化
watch(filters, () => {
  dashboardData.reload()
}, { deep: true })

// ❌ 浅层监听，只能捕获 filters 整体替换
watch(filters, () => {
  dashboardData.reload()
})
```

### 5. 防抖优化搜索

对于搜索框，使用防抖避免频繁请求：

```javascript
import { debounce } from 'lodash-es'

const searchText = ref('')

// 创建防抖函数
const debouncedReload = debounce(() => {
  dashboardData.reload()
}, 300)

// 监听搜索文本变化
watch(searchText, () => {
  debouncedReload()
})
```

## 完整示例

### PlanningDashboard.vue 核心代码

```vue
<script setup>
import { ref, computed, watch } from 'vue'
import { createResource } from 'frappe-ui'
import { debounce } from 'lodash-es'

// 响应式状态
const currentTab = ref('pending')
const searchText = ref('')
const sortBy = ref('creation_desc')
const filters = ref({
  task_type: [],
  status: [],
  store_id: []
})

// 筛选选项
const taskTypeOptions = ref([])
const statusOptions = ref([])
const storeOptions = ref([])

// 加载筛选选项
const filterOptions = createResource({
  url: 'product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_filter_options',
  auto: true,
  onSuccess(data) {
    taskTypeOptions.value = data.task_types || []
    statusOptions.value = data.statuses || []
    storeOptions.value = data.stores || []
  }
})

// 加载看板数据（关键：params 使用函数）
const dashboardData = createResource({
  url: 'product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_dashboard_data',
  params: () => ({
    filters: JSON.stringify(filters.value),
    current_tab: currentTab.value,
    search_text: searchText.value,
    sort_by: sortBy.value
  }),
  auto: true
})

// 防抖重新加载
const debouncedReload = debounce(() => {
  dashboardData.reload()
}, 300)

// 监听筛选条件变化
watch([filters, currentTab, sortBy], () => {
  dashboardData.reload()
}, { deep: true })

// 监听搜索文本变化（防抖）
watch(searchText, () => {
  debouncedReload()
})

// 计算属性
const tasks = computed(() => dashboardData.data?.tasks || [])
const statistics = computed(() => dashboardData.data?.statistics || {})
</script>

<template>
  <div class="p-6">
    <!-- 筛选器 -->
    <div class="flex gap-4 mb-6">
      <MultiSelect
        v-model="filters.task_type"
        :options="taskTypeOptions"
        placeholder="任务类型"
      />
      <MultiSelect
        v-model="filters.status"
        :options="statusOptions"
        placeholder="状态"
      />
      <MultiSelect
        v-model="filters.store_id"
        :options="storeOptions"
        placeholder="店铺"
      />
    </div>

    <!-- 加载状态 -->
    <div v-if="dashboardData.loading" class="text-center py-8">
      <LoadingIndicator />
    </div>

    <!-- 任务列表 -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="task in tasks" :key="task.name" class="border rounded-lg p-4">
        <h3 class="font-semibold">{{ task.task_name }}</h3>
        <p class="text-sm text-gray-600">{{ task.task_type }}</p>
      </div>
    </div>
  </div>
</template>
```

## 常见问题

### Q1: 筛选器选择后数据不更新？

**原因**：`params` 使用了对象而不是函数。

**解决**：将 `params: { ... }` 改为 `params: () => ({ ... })`

### Q2: watch 监听不到 filters 内部变化？

**原因**：缺少 `deep: true` 选项。

**解决**：
```javascript
watch(filters, () => {
  dashboardData.reload()
}, { deep: true })  // 添加 deep: true
```

### Q3: 搜索框输入时请求过于频繁？

**原因**：每次输入都触发请求。

**解决**：使用 lodash 的 `debounce` 函数：
```javascript
import { debounce } from 'lodash-es'

const debouncedReload = debounce(() => {
  dashboardData.reload()
}, 300)

watch(searchText, () => {
  debouncedReload()
})
```

### Q4: MultiSelect 选项不显示？

**原因**：选项格式不正确或未加载。

**解决**：
1. 确保选项是数组格式
2. 使用 `createResource` 的 `onSuccess` 回调设置选项
3. 检查后端返回的数据格式

### Q5: 后端收到的 filters 是空对象？

**原因**：前端传递的是 `filters` 对象引用，而不是序列化后的字符串。

**解决**：使用 `JSON.stringify()` 序列化：
```javascript
params: () => ({
  filters: JSON.stringify(filters.value)  // 序列化为 JSON 字符串
})
```

## 最佳实践

### 1. 参数传递规范

- ✅ 使用函数返回参数：`params: () => ({ ... })`
- ✅ 序列化复杂对象：`JSON.stringify(filters.value)`
- ✅ 访问响应式数据的 `.value` 属性

### 2. 性能优化

- ✅ 搜索框使用防抖（300ms）
- ✅ 使用 `computed` 计算派生数据
- ✅ 避免在模板中直接调用函数

### 3. 错误处理

```javascript
const dashboardData = createResource({
  url: 'your.api.method',
  params: () => ({ ... }),
  auto: true,
  onError(error) {
    console.error('加载失败:', error)
    // 显示错误提示
  }
})
```

### 4. 加载状态显示

```vue
<template>
  <div v-if="dashboardData.loading">
    <LoadingIndicator />
  </div>
  <div v-else-if="dashboardData.error">
    <ErrorMessage :message="dashboardData.error" />
  </div>
  <div v-else>
    <!-- 正常内容 -->
  </div>
</template>
```

## 参考资源

- frappe-ui 官方文档: https://ui.frappe.io/
- Vue 3 响应式 API: https://vuejs.org/api/reactivity-core.html
- createResource 源码: `node_modules/frappe-ui/src/resources/resources.js`

## 更新日志

- 2025-12-07: 初始版本，记录 createResource 参数响应式问题的解决方案
