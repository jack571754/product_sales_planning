# 前端重构实施指南

## 📦 完整代码实现

本文档包含所有需要创建和修改的文件的完整代码。

---

## 1. API服务层

### `src/services/api/dashboard.js`

```javascript
/**
 * Dashboard API 服务
 * 封装所有Dashboard相关的API调用
 */
import { createResource } from 'frappe-ui'

export const dashboardApi = {
  /**
   * 获取看板数据
   * @param {Object} filters - 筛选条件
   * @param {string} searchText - 搜索文本
   * @param {string} sortBy - 排序字段
   * @param {string} sortOrder - 排序方向
   */
  getDashboardData(filters = {}, searchText = '', sortBy = 'deadline', sortOrder = 'asc') {
    return createResource({
      url: 'product_sales_planning.api.v1.dashboard.get_dashboard_data',
      params: {
        filters: filters,
        search_text: searchText,
        sort_by: sortBy,
        sort_order: sortOrder
      },
      transform(data) {
        // 数据转换和格式化
        return {
          stats: data?.stats || {
            ongoing: 0,
            closed: 0,
            types: 0,
            urgent_count: 0,
            submitted_count: 0,
            approved_count: 0,
            rejected_count: 0,
            pending_count: 0,
            completed_count: 0
          },
          tasks: data?.tasks || [],
          filter_options: data?.filter_options || {}
        }
      }
    })
  },

  /**
   * 获取过滤选项
   */
  getFilterOptions() {
    return createResource({
      url: 'product_sales_planning.api.v1.dashboard.get_filter_options',
      auto: true,
      transform(data) {
        return {
          channels: data?.channels || [],
          users: data?.users || [],
          statuses: data?.statuses || [],
          approval_statuses: data?.approval_statuses || [],
          plan_types: data?.plan_types || [],
          stores: data?.stores || [],
          tasks: data?.tasks || []
        }
      }
    })
  }
}
```

### `src/services/api/store.js`

```javascript
/**
 * Store API 服务
 */
import { createResource } from 'frappe-ui'

export const storeApi = {
  /**
   * 获取店铺过滤选项
   */
  getFilterOptions() {
    return createResource({
      url: 'product_sales_planning.api.v1.store.get_filter_options',
      auto: true
    })
  },

  /**
   * 获取任务店铺状态
   */
  getTasksStoreStatus(taskId, storeId) {
    return createResource({
      url: 'product_sales_planning.api.v1.store.get_tasks_store_status',
      params: {
        task_id: taskId,
        store_id: storeId
      }
    })
  }
}
```

### `src/services/api/index.js`

```javascript
/**
 * API服务统一导出
 */
export { dashboardApi } from './dashboard'
export { storeApi } from './store'

// 通用API工具函数
export const apiUtils = {
  /**
   * 提取选项值
   */
  extractValues(arr) {
    if (!Array.isArray(arr)) return []
    return arr.map(item => 
      typeof item === 'object' && item !== null ? item.value : item
    ).filter(Boolean)
  },

  /**
   * 提取单个值
   */
  extractValue(val) {
    return typeof val === 'object' && val !== null ? val.value || '' : val || ''
  },

  /**
   * 格式化日期
   */
  formatDate(date) {
    if (!date) return ''
    return new Date(date).toLocaleDateString('zh-CN')
  },

  /**
   * 计算剩余天数
   */
  getDaysRemaining(deadline) {
    if (!deadline) return 0
    const today = new Date()
    const end = new Date(deadline)
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24))
    return diff
  }
}
```

---

## 2. Composables

### `src/composables/useDashboard.js`

```javascript
/**
 * Dashboard业务逻辑
 */
import { ref, computed, watch, onMounted } from 'vue'
import { dashboardApi, apiUtils } from '@/services/api'

export function useDashboard() {
  // ==================== 状态 ====================
  const filters = ref({
    store_ids: [],
    task_ids: [],
    approval_status: ''
  })

  const searchText = ref('')
  const sortBy = ref('deadline')
  const sortOrder = ref('asc')
  const currentTab = ref('pending')

  // ==================== API资源 ====================
  const filterOptions = dashboardApi.getFilterOptions()
  
  const dashboardData = dashboardApi.getDashboardData()

  // ==================== 计算属性 ====================
  const stats = computed(() => dashboardData.data?.stats || {})
  const tasks = computed(() => dashboardData.data?.tasks || [])
  const isLoading = computed(() => dashboardData.loading)

  // 选项配置
  const storeOptions = computed(() => 
    (filterOptions.data?.stores || []).map(s => ({
      label: s.shop_name,
      value: s.name
    }))
  )

  const taskOptions = computed(() =>
    (filterOptions.data?.tasks || []).map(t => ({
      label: t.name,
      value: t.name
    }))
  )

  const approvalOptions = [
    { label: '全部', value: '' },
    { label: '待审批', value: '待审批' },
    { label: '已通过', value: '已通过' },
    { label: '已驳回', value: '已驳回' }
  ]

  const tabs = computed(() => [
    { 
      label: '待完成', 
      value: 'pending', 
      count: stats.value.pending_count || 0 
    },
    { 
      label: '已完成', 
      value: 'completed', 
      count: stats.value.completed_count || 0 
    }
  ])

  // ==================== 方法 ====================
  const loadData = () => {
    const params = {
      filters: {
        store_ids: apiUtils.extractValues(filters.value.store_ids),
        task_ids: apiUtils.extractValues(filters.value.task_ids),
        approval_status: apiUtils.extractValue(filters.value.approval_status),
        tab: currentTab.value
      },
      search_text: searchText.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value
    }
    
    dashboardData.params = params
    dashboardData.reload()
  }

  const applyFilters = () => {
    loadData()
  }

  const clearFilters = () => {
    filters.value = {
      store_ids: [],
      task_ids: [],
      approval_status: ''
    }
    searchText.value = ''
    currentTab.value = 'pending'
    loadData()
  }

  const switchTab = (tab) => {
    if (currentTab.value === tab) return
    currentTab.value = tab
    
    // 切换到已完成时清空审批状态筛选
    if (tab === 'completed') {
      filters.value.approval_status = ''
    }
    
    loadData()
  }

  const search = (text) => {
    searchText.value = text
    loadData()
  }

  const sort = (field, order = 'asc') => {
    sortBy.value = field
    sortOrder.value = order
    loadData()
  }

  // ==================== 监听 ====================
  watch(currentTab, () => {
    loadData()
  })

  // ==================== 生命周期 ====================
  onMounted(() => {
    loadData()
  })

  // ==================== 返回 ====================
  return {
    // 状态
    filters,
    searchText,
    sortBy,
    sortOrder,
    currentTab,
    
    // 数据
    stats,
    tasks,
    filterOptions: computed(() => filterOptions.data),
    storeOptions,
    taskOptions,
    approvalOptions,
    tabs,
    
    // 加载状态
    isLoading,
    
    // 方法
    loadData,
    applyFilters,
    clearFilters,
    switchTab,
    search,
    sort
  }
}
```

---

## 3. 重构后的主页面

### `src/pages/PlanningDashboard.vue`

```vue
<template>
  <div class="min-h-screen bg-gray-50 p-6 md:p-8">
    <div class="mx-auto max-w-7xl space-y-6">
      
      <!-- 页面标题 -->
      <div class="flex flex-col gap-1">
        <h1 class="text-3xl font-bold text-gray-900">计划看板</h1>
        <p class="text-gray-500">商品销售计划执行与审批概览</p>
      </div>

      <!-- 筛选器 -->
      <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
        <div class="flex items-center gap-2 mb-4 text-gray-900 font-medium">
          <FeatherIcon name="filter" class="h-4 w-4 text-gray-500" />
          <span>筛选条件</span>
        </div>
        
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4 items-end">
          <div class="space-y-1.5">
            <label class="text-xs font-medium text-gray-500">店铺</label>
            <MultiSelect
              v-model="filters.store_ids"
              :options="storeOptions"
              placeholder="选择店铺..."
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-medium text-gray-500">计划任务</label>
            <MultiSelect
              v-model="filters.task_ids"
              :options="taskOptions"
              placeholder="选择任务..."
            />
          </div>

          <div v-show="currentTab === 'pending'" class="space-y-1.5">
            <label class="text-xs font-medium text-gray-500">审批状态</label>
            <Select
              v-model="filters.approval_status"
              :options="approvalOptions"
              placeholder="全部状态"
            />
          </div>

          <div class="flex gap-2">
            <Button
              variant="solid"
              theme="gray"
              class="w-full md:w-auto"
              @click.stop="applyFilters"
              :loading="isLoading"
            >
              <template #prefix><FeatherIcon name="search" class="h-4 w-4" /></template>
              查询
            </Button>

            <Button
              variant="subtle"
              theme="gray"
              class="w-full md:w-auto"
              @click.stop="clearFilters"
            >
              重置
            </Button>
          </div>
        </div>
      </div>

      <!-- 统计卡片 -->
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <FeatherIcon name="activity" class="h-6 w-6" />
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ stats.ongoing }}</div>
            <div class="text-xs text-gray-500">进行中计划</div>
          </div>
        </div>

        <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-600">
            <FeatherIcon name="clock" class="h-6 w-6" />
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ tasks.length }}</div>
            <div class="text-xs text-gray-500">待处理店铺</div>
          </div>
        </div>
        
        <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-50 text-yellow-600">
            <FeatherIcon name="file-text" class="h-6 w-6" />
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ stats.pending_count }}</div>
            <div class="text-xs text-gray-500">总待完成</div>
          </div>
        </div>

        <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
            <FeatherIcon name="check-circle" class="h-6 w-6" />
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900">{{ stats.completed_count }}</div>
            <div class="text-xs text-gray-500">总已完成</div>
          </div>
        </div>
      </div>

      <!-- 标签页和任务列表 -->
      <div class="rounded-lg border border-gray-200 bg-white shadow-sm min-h-[500px]">
        <div class="border-b border-gray-100 px-5 pt-4">
          <div class="flex gap-6">
            <button
              v-for="tab in tabs"
              :key="tab.value"
              @click="switchTab(tab.value)"
              class="pb-3 text-sm font-medium transition-colors border-b-2"
              :class="[
                currentTab === tab.value
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              {{ tab.label }}
              <span 
                class="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                :class="{ 'bg-gray-900 text-white': currentTab === tab.value }"
              >
                {{ tab.count }}
              </span>
            </button>
          </div>
        </div>

        <div class="p-2">
          <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-100 border-t-gray-600"></div>
            <span class="text-sm">加载数据中...</span>
          </div>

          <div v-else-if="tasks.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <div class="bg-gray-50 p-4 rounded-full">
              <FeatherIcon name="inbox" class="h-8 w-8 text-gray-300" />
            </div>
            <span class="text-sm">暂无{{ currentTab === 'pending' ? '待处理' : '已完成' }}任务</span>
          </div>

          <div v-else class="space-y-2 p-2">
            <div
              v-for="task in tasks"
              :key="`${task.parent_id}-${task.store_id}`"
              @click="goToStoreDetail(task.store_id, task.parent_id)"
              class="group relative flex items-start gap-4 rounded-lg border border-gray-100 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm cursor-pointer"
            >
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100 border border-gray-200 text-sm font-bold text-gray-600 group-hover:bg-white">
                {{ getAvatar(task.title) }}
              </div>

              <div class="flex flex-1 flex-col gap-1.5 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="truncate font-semibold text-gray-900">{{ task.title }}</span>
                  <Badge theme="gray" size="sm">{{ task.channel }}</Badge>
                  <Badge v-if="task.is_urgent" theme="red" size="sm" variant="solid">紧急</Badge>
                </div>

                <div class="flex items-center gap-3 text-xs text-gray-500">
                  <div class="flex items-center gap-1" title="负责人">
                    <FeatherIcon name="user" class="h-3 w-3" />
                    {{ task.user }}
                  </div>
                  <div class="h-1 w-1 rounded-full bg-gray-300"></div>
                  <div title="计划类型">{{ task.plan_type }}</div>
                </div>
              </div>

              <div class="flex shrink-0 flex-col items-end gap-2 text-right">
                <div 
                  class="flex items-center gap-1 text-xs"
                  :class="task.is_urgent ? 'text-red-600 font-medium' : 'text-gray-500'"
                >
                  <FeatherIcon name="calendar" class="h-3 w-3" />
                  <span>截止 {{ task.deadline }}</span>
                </div>

                <div class="flex items-center gap-1.5">
                  <Badge 
                    v-if="shouldShowStatus(task.child_status)" 
                    :theme="getSubmitStatusTheme(task.child_status)"
                    variant="subtle"
                    size="sm"
                  >
                    {{ task.child_status }}
                  </Badge>

                  <Badge 
                    v-if="shouldShowStatus(task.approval_status)" 
                    :theme="getApprovalStatusTheme(task.approval_status)" 
                    variant="subtle"
                    size="sm"
                  >
                    {{ task.approval_status }}
                  </Badge>
                  
                  <Badge 
                    v-if="task.current_approval_step > 0" 
                    theme="blue" 
                    variant="outline"
                    size="sm"
                  >
                    {{ task.current_approval_step }}级
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Button, Select, MultiSelect, FeatherIcon, Badge } from 'frappe-ui'
import { useDashboard } from '@/composables/useDashboard'

// ==================== Router ====================
const router = useRouter()

// ==================== 使用Composable ====================
const {
  filters,
  currentTab,
  stats,
  tasks,
  storeOptions,
  taskOptions,
  approvalOptions,
  tabs,
  isLoading,
  applyFilters,
  clearFilters,
  switchTab
} = useDashboard()

// ==================== 事件处理 ====================
const goToStoreDetail = (storeId, parentId) => {
  router.push({
    name: 'StoreDetail',
    params: { storeId, taskId: parentId }
  })
}

// ==================== UI 辅助 ====================
const getAvatar = (title) => title ? title.charAt(0) : '店'

const shouldShowStatus = (status) => status && status !== '-' && status !== '未开始'

const getSubmitStatusTheme = (status) => {
  if (['已提交', 'Submitted'].some(k => status?.includes(k))) return 'blue'
  if (['草稿', 'Draft'].some(k => status?.includes(k))) return 'orange'
  return 'gray'
}

const getApprovalStatusTheme = (status) => {
  if (['通过', 'Approved'].some(k => status?.includes(k))) return 'green'
  if (['驳回', 'Rejected'].some(k => status?.includes(k))) return 'red'
  if (['审核', '待审批', 'Pending'].some(k => status?.includes(k))) return 'orange'
  return 'gray'
}
</script>
```

---

## 4. 实施步骤

### 步骤1: 创建目录结构

```bash
cd apps/product_sales_planning/frontend/src

# 创建API服务目录
mkdir -p services/api

# 创建组件目录(如果不存在)
mkdir -p components/dashboard
```

### 步骤2: 创建API服务文件

按照上面的代码创建以下文件:
- `src/services/api/dashboard.js`
- `src/services/api/store.js`
- `src/services/api/index.js`

### 步骤3: 创建Composable

创建文件:
- `src/composables/useDashboard.js`

### 步骤4: 更新主页面

替换 `src/pages/PlanningDashboard.vue` 的内容

### 步骤5: 测试

```bash
# 启动开发服务器
cd apps/product_sales_planning/frontend
yarn dev

# 或
npm run dev
```

---

## 5. 主要改进点

### ✅ API层改进
1. **统一的API服务层**: 所有API调用集中管理
2. **数据转换**: 在API层处理数据格式化
3. **错误处理**: 统一的错误处理机制

### ✅ 业务逻辑改进
1. **Composable模式**: 业务逻辑可复用
2. **响应式设计**: 自动追踪依赖变化
3. **清晰的职责分离**: 数据、逻辑、UI分离

### ✅ 代码质量改进
1. **更好的可维护性**: 代码结构清晰
2. **更好的可测试性**: 逻辑独立易测试
3. **更好的可扩展性**: 易于添加新功能

---

## 6. 迁移对照表

### API调用变化

**旧方式:**
```javascript
const dashboardData = createResource({
  url: 'product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_dashboard_data',
  makeParams() {
    return {
      filters: JSON.stringify({
        store_ids: extractValues(filters.value.store_ids),
        task_ids: extractValues(filters.value.task_ids),
        approval_status: extractValue(filters.value.approval_status),
        tab: currentTab.value
      })
    }
  }
})
```

**新方式:**
```javascript
import { dashboardApi } from '@/services/api'

const dashboardData = dashboardApi.getDashboardData()

// 使用时
dashboardData.params = {
  filters: {
    store_ids: apiUtils.extractValues(filters.value.store_ids),
    task_ids: apiUtils.extractValues(filters.value.task_ids),
    approval_status: apiUtils.extractValue(filters.value.approval_status),
    tab: currentTab.value
  }
}
dashboardData.reload()
```

### 组件使用变化

**旧方式:**
```vue
<script setup>
import { ref, computed } from 'vue'
import { createResource } from 'frappe-ui'

const filters = ref({})
const dashboardData = createResource({...})
const stats = computed(() => dashboardData.data?.stats || {})
// ... 大量业务逻辑
</script>
```

**新方式:**
```vue
<script setup>
import { useDashboard } from '@/composables/useDashboard'

const {
  filters,
  stats,
  tasks,
  applyFilters,
  clearFilters
} = useDashboard()
// 业务逻辑在Composable中
</script>
```

---

## 7. 测试清单

### 功能测试
- [ ] 页面正常加载
- [ ] 筛选功能正常
- [ ] 标签页切换正常
- [ ] 数据显示正确
- [ ] 点击跳转正常

### 性能测试
- [ ] 首屏加载时间 < 2s
- [ ] 筛选响应时间 < 500ms
- [ ] 无内存泄漏

### 兼容性测试
- [ ] Chrome浏览器
- [ ] Firefox浏览器
- [ ] Safari浏览器
- [ ] 移动端响应式

---

## 8. 常见问题

### Q1: API调用失败怎么办?
**A**: 检查以下几点:
1. API路径是否正确
2. 参数格式是否正确
3. 后端API是否正常运行
4. 查看浏览器控制台错误信息

### Q2: 数据不更新怎么办?
**A**: 检查:
1. `reload()` 方法是否被调用
2. 响应式数据是否正确设置
3. 计算属性依赖是否正确

### Q3: 如何调试?
**A**: 
1. 使用Vue DevTools查看组件状态
2. 在Composable中添加console.log
3. 检查Network面板的API请求

---

## 9. 下一步计划

### 短期目标
- [ ] 完成基础重构
- [ ] 添加单元测试
- [ ] 性能优化

### 中期目标
- [ ] 添加更多Composables
- [ ] 组件库完善
- [ ] 文档完善

### 长期目标
- [ ] TypeScript迁移
- [ ] 完整的测试覆盖
- [ ] CI/CD集成

---

## 10. 相关文档

- [重构计划](./REFACTOR_PLAN.md)
- [API文档](../product_sales_planning/docs/api_documentation.md)
- [API测试指南](../API_TEST_README.md)
- [API快速参考](../API_QUICK_REFERENCE.md)

---

**版本**: 1.0.0  
**更新时间**: 2025-12-12  
**状态**: ✅ 完成