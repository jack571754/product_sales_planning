<template>
  <div class="min-h-screen bg-gray-50/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight">计划任务看板</h1>
          <p class="text-sm text-gray-500 mt-1">实时监控各店铺计划执行进度与审批状态</p>
        </div>
        <div class="flex items-center gap-3">
          <Button variant="outline" theme="gray" @click="router.push('/demo')">
            <template #prefix><FeatherIcon name="layout" class="w-4 h-4" /></template>
            组件演示
          </Button>
          <Button variant="solid" theme="gray" @click="refreshData" :loading="dashboardData.loading">
            <template #prefix><FeatherIcon name="refresh-cw" class="w-4 h-4" /></template>
            刷新
          </Button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div v-for="(stat, index) in statCards" :key="index" 
          class="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 relative overflow-hidden group">
          <div class="flex justify-between items-start z-10 relative">
            <div>
              <p class="text-sm font-medium text-gray-500 mb-1">{{ stat.label }}</p>
              <h3 class="text-3xl font-bold text-gray-900 tracking-tight">{{ stat.value || 0 }}</h3>
            </div>
            <div :class="['p-3 rounded-lg bg-opacity-10 transition-colors', stat.bgClass, stat.textClass]">
              <FeatherIcon :name="stat.icon" class="w-5 h-5" />
            </div>
          </div>
          <div :class="['absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 group-hover:scale-110 transition-transform duration-500', stat.bgClass]"></div>
        </div>
      </div>

      <div class="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 sticky top-4 z-20 backdrop-blur-sm bg-opacity-90">
        <div class="p-2 flex flex-col lg:flex-row items-center justify-between gap-4">
          
          <div class="flex bg-gray-100/80 p-1 rounded-lg w-full lg:w-auto">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="switchTab(tab.id)"
              class="flex-1 lg:flex-none px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
              :class="currentTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'"
            >
              <FeatherIcon :name="tab.icon" class="w-4 h-4" />
              {{ tab.label }}
              <span v-if="tab.count" class="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600" :class="currentTab === tab.id ? 'bg-gray-100' : 'bg-gray-200'">{{ tab.count }}</span>
            </button>
          </div>

          <div class="flex items-center gap-2 w-full lg:w-auto">
            <div class="relative flex-1 lg:w-64">
              <FeatherIcon name="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                v-model="searchText"
                type="text" 
                placeholder="搜索任务、店铺..." 
                class="w-full pl-9 pr-4 py-2 bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 focus:ring-0 rounded-lg text-sm transition-all"
              >
            </div>
            
            <div class="relative">
              <Button @click="showFilters = !showFilters" :variant="hasActiveFilters ? 'subtle' : 'ghost'" theme="gray">
                <template #prefix><FeatherIcon name="filter" class="w-4 h-4" /></template>
                <span class="hidden sm:inline">筛选</span>
              </Button>
              <div v-if="hasActiveFilters" class="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full border border-white"></div>
            </div>
            
            <div class="h-4 w-px bg-gray-200 mx-1"></div>
            
            <Select
              v-model="sortBy"
              :options="sortOptions"
              class="w-32"
            />
          </div>
        </div>

        <div v-show="showFilters" class="border-t border-gray-100 p-4 bg-gray-50/50 rounded-b-xl animate-fade-in-down">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1.5 block">店铺范围</label>
              <MultiSelect v-model="filters.store_ids" :options="storeOptions" placeholder="选择店铺" />
            </div>
            <div>
              <label class="text-xs font-medium text-gray-500 mb-1.5 block">审批流转</label>
              <Select v-model="filters.approval_status" :options="approvalOptions" placeholder="全部状态" />
            </div>
          </div>
          <div class="flex justify-end mt-4 pt-3 border-t border-gray-100 gap-2">
            <Button variant="ghost" size="sm" @click="clearFilters">重置</Button>
            <Button variant="solid" size="sm" @click="applyFilters">应用筛选</Button>
          </div>
        </div>
      </div>

      <div v-if="dashboardData.loading" class="flex flex-col items-center justify-center py-20">
        <div class="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p class="mt-4 text-sm text-gray-400">正在同步数据...</p>
      </div>

      <div v-else-if="filteredTasks.length === 0" class="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
        <div class="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <FeatherIcon name="inbox" class="w-8 h-8 text-gray-400" />
        </div>
        <h3 class="text-gray-900 font-medium">暂无相关任务</h3>
        <p class="text-gray-500 text-sm mt-1">尝试调整筛选条件或搜索关键词</p>
        <Button variant="outline" size="sm" class="mt-4" @click="clearFilters" v-if="hasActiveFilters">清除所有筛选</Button>
      </div>

      <div v-else class="space-y-3">
        <div 
          v-for="task in paginatedTasks" 
          :key="task.row_id"
          @click="goToDetail(task)"
          class="group bg-white rounded-xl border border-gray-200 p-4 sm:p-5 hover:border-blue-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer relative"
        >
          <div class="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            
            <div class="flex items-start gap-4 flex-1">
              <div class="hidden sm:block">
                <Avatar :label="task.title" size="xl" shape="square" class="rounded-lg" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {{ task.title }}
                  </h3>
                  <Badge v-if="task.is_urgent" theme="red" variant="subtle" size="sm" class="flex-shrink-0">
                    紧急
                  </Badge>
                </div>
                
                <div class="flex flex-wrap items-center gap-y-1 gap-x-3 text-sm text-gray-500">
                  <span class="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded text-xs">
                    <FeatherIcon name="monitor" class="w-3 h-3" />
                    {{ task.channel }}
                  </span>
                  <span class="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <span class="flex items-center gap-1">
                    <FeatherIcon name="user" class="w-3 h-3" />
                    {{ task.user }}
                  </span>
                  <span class="w-1 h-1 bg-gray-300 rounded-full"></span>
                  <span>{{ task.plan_type }}</span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2 sm:justify-end min-w-[140px]">
               <div class="flex flex-col items-end gap-1">
                 <Badge :theme="getStatusTheme(task.child_status)" variant="outline" size="md">
                   {{ task.child_status }}
                 </Badge>
                 <div class="flex items-center gap-1">
                    <span class="text-xs text-gray-400">审批:</span>
                    <span :class="['text-xs font-medium', getApprovalColorClass(task.approval_status)]">
                      {{ task.approval_status }}
                    </span>
                 </div>
               </div>
            </div>

            <div class="flex items-center justify-between sm:justify-end sm:gap-4 sm:w-48 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100">
               <div class="text-right">
                 <div class="text-sm font-medium text-gray-900">{{ task.deadline }}</div>
                 <div class="text-xs text-gray-400 mt-0.5">截止日期</div>
               </div>
               <div class="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                 <FeatherIcon name="chevron-right" class="w-4 h-4" />
               </div>
            </div>

          </div>
        </div>
      </div>

      <div v-if="filteredTasks.length > 0" class="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <div>
          显示第 <span class="font-medium text-gray-900">{{ (currentPage - 1) * pageSize + 1 }}</span> 
          至 <span class="font-medium text-gray-900">{{ Math.min(currentPage * pageSize, filteredTasks.length) }}</span> 项结果
        </div>
        
        <div class="flex bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
           <button 
             @click="currentPage--" 
             :disabled="currentPage === 1"
             class="p-2 hover:bg-gray-100 rounded disabled:opacity-50 transition-colors"
           >
             <FeatherIcon name="chevron-left" class="w-4 h-4" />
           </button>
           <span class="px-4 py-2 border-x border-gray-100 font-medium text-gray-700 min-w-[3rem] text-center">
             {{ currentPage }}
           </span>
           <button 
             @click="currentPage++" 
             :disabled="currentPage === totalPages"
             class="p-2 hover:bg-gray-100 rounded disabled:opacity-50 transition-colors"
           >
             <FeatherIcon name="chevron-right" class="w-4 h-4" />
           </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Button,
  Select,
  MultiSelect,
  Badge,
  Avatar,
  FeatherIcon,
  createResource
} from 'frappe-ui'

const router = useRouter()

// 状态管理
const showFilters = ref(false)
const filters = ref({
  store_ids: [],
  approval_status: ''
})
const searchText = ref('')
const sortBy = ref('deadline')
const currentTab = ref('pending')
const currentPage = ref(1)
const pageSize = ref(10)

// 资源加载
const filterOptions = createResource({
  url: 'product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_filter_options',
  auto: true
})

const dashboardData = createResource({
  url: 'product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_dashboard_data',
  params: () => ({
    filters: JSON.stringify({
      store_ids: filters.value.store_ids,
      approval_status: filters.value.approval_status,
      tab: currentTab.value
    }),
    search_text: searchText.value,
    sort_by: sortBy.value,
    sort_order: 'asc'
  }),
  auto: true
})

// 计算属性：统计卡片配置
const stats = computed(() => dashboardData.data?.stats || {})
const statCards = computed(() => [
  {
    label: '进行中计划',
    value: stats.value.ongoing,
    icon: 'activity',
    bgClass: 'bg-blue-500',
    textClass: 'text-blue-500'
  },
  {
    label: '已结束计划',
    value: stats.value.closed,
    icon: 'archive',
    bgClass: 'bg-gray-500',
    textClass: 'text-gray-500'
  },
  {
    label: '待完成店铺',
    value: stats.value.pending_count,
    icon: 'clock',
    bgClass: 'bg-amber-500',
    textClass: 'text-amber-500'
  },
  {
    label: '已完成店铺',
    value: stats.value.completed_count,
    icon: 'check-circle',
    bgClass: 'bg-emerald-500',
    textClass: 'text-emerald-500'
  }
])

const tabs = computed(() => [
  { id: 'pending', label: '待完成', icon: 'clock', count: stats.value.pending_count },
  { id: 'completed', label: '已完成', icon: 'check-circle', count: stats.value.completed_count }
])

// 选项处理
const storeOptions = computed(() =>
  (filterOptions.data?.stores || []).map(s => ({ label: s.shop_name, value: s.name }))
)

const approvalOptions = [
  { label: '全部状态', value: '' },
  { label: '待审批', value: '待审批' },
  { label: '已通过', value: '已通过' },
  { label: '已驳回', value: '已驳回' }
]

const sortOptions = [
  { label: '按截止日期', value: 'deadline' },
  { label: '按店铺名称', value: 'title' },
  { label: '按渠道', value: 'channel' }
]

const hasActiveFilters = computed(() => {
  return filters.value.store_ids.length > 0 ||
         !!filters.value.approval_status ||
         !!searchText.value
})

// 任务数据直接从后端获取（后端已处理过滤和排序）
const tasks = computed(() => dashboardData.data?.tasks || [])
const filteredTasks = computed(() => tasks.value)

const totalPages = computed(() => Math.ceil(filteredTasks.value.length / pageSize.value))
const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredTasks.value.slice(start, start + pageSize.value)
})

// 操作方法
const refreshData = () => {
  dashboardData.reload()
  filterOptions.reload()
}

const switchTab = (tab) => {
  if (currentTab.value !== tab) {
    currentTab.value = tab
    currentPage.value = 1
    dashboardData.reload()
  }
}

const applyFilters = () => {
  currentPage.value = 1
  showFilters.value = false
  dashboardData.reload()
}

const clearFilters = () => {
  filters.value = { store_ids: [], approval_status: '' }
  searchText.value = ''
  sortBy.value = 'deadline'
  currentPage.value = 1
  showFilters.value = false
  dashboardData.reload()
}

const goToDetail = (task) => {
  window.location.href = `/app/store-detail?store_id=${task.store_id}&task_id=${task.parent_id}`
}

// 样式辅助
const getStatusTheme = (status) => {
  const map = { '已提交': 'blue', '草稿': 'orange', '进行中': 'blue' }
  return map[status] || 'gray'
}

const getApprovalColorClass = (status) => {
  const map = { '已通过': 'text-green-600', '已驳回': 'text-red-600', '待审批': 'text-amber-600' }
  return map[status] || 'text-gray-500'
}

// 监听 tab 切换，自动刷新数据
watch(currentTab, () => {
  currentPage.value = 1
  dashboardData.reload()
})

// 监听搜索文本变化，自动刷新数据（防抖）
let searchTimeout = null
watch(searchText, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    dashboardData.reload()
  }, 500)
})

// 监听排序变化，自动刷新数据
watch(sortBy, () => {
  currentPage.value = 1
  dashboardData.reload()
})
</script>

<style scoped>
/* 简单的进入动画 */
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-down {
  animation: fadeInDown 0.2s ease-out forwards;
}
</style>