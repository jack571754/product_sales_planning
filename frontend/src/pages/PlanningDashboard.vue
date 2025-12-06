<template>
  <div class="p-5 max-w-[1400px] mx-auto bg-gray-50 min-h-screen font-sans">
    
    <div class="flex justify-between items-center mb-5">
      <div>
        <h1 class="text-xl font-bold text-gray-900">计划任务看板</h1>
        <p class="text-xs text-gray-500 mt-1">实时监控任务执行与审批状态</p>
      </div>
      <div class="flex gap-2">
        <Button icon-left="table" variant="outline" size="sm" @click="goToDataView">
          数据查看
        </Button>
        <Button 
          icon-left="refresh-cw" 
          variant="outline" 
          size="sm"
          :loading="dashboardResource.loading" 
          @click="dashboardResource.reload()"
        >
          刷新
        </Button>
      </div>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-5">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        
        <div class="md:col-span-4 space-y-1">
          <label class="text-xs font-medium text-gray-500">店铺筛选</label>
          <Autocomplete
            v-if="options.stores.length"
            placeholder="选择店铺 (可多选)..."
            :options="options.stores"
            v-model="filters.store_ids"
            multiple
            size="sm"
          />
        </div>
        
        <div class="md:col-span-4 space-y-1">
          <label class="text-xs font-medium text-gray-500">计划任务</label>
          <Autocomplete
            v-if="options.tasks.length"
            placeholder="选择任务 (可多选)..."
            :options="options.tasks"
            v-model="filters.task_ids"
            multiple
            size="sm"
          />
        </div>

        <div class="md:col-span-2 space-y-1">
           <label class="text-xs font-medium text-gray-500">审批状态</label>
           <select 
             v-model="filters.approval_status"
             class="form-select block w-full text-sm border-gray-200 rounded-md focus:border-blue-500 focus:ring-blue-500 h-[34px]"
             :disabled="currentTab === 'completed'"
           >
             <option value="">全部状态</option>
             <option value="待审批">待审批</option>
             <option value="已通过">已通过</option>
             <option value="已驳回">已驳回</option>
           </select>
        </div>

        <div class="md:col-span-2 flex gap-2">
          <Button 
            variant="solid" 
            class="w-full justify-center"
            size="sm"
            @click="applyFilters"
          >
            查询
          </Button>
          <Button 
            icon="x" 
            variant="ghost" 
            size="sm"
            @click="clearFilters" 
            title="清空筛选"
          />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6" v-if="stats">
      <div class="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center">
        <div class="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-4 shrink-0">
          <FeatherIcon name="folder" class="w-6 h-6" />
        </div>
        <div>
          <div class="text-2xl font-bold text-gray-900">{{ stats.ongoing || 0 }}</div>
          <div class="text-xs text-gray-500 mt-1">进行中计划</div>
        </div>
      </div>

      <div class="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex items-center">
        <div class="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mr-4 shrink-0">
          <FeatherIcon name="check-square" class="w-6 h-6" />
        </div>
        <div>
          <div class="text-2xl font-bold text-gray-900">{{ stats.tasks_count || 0 }}</div>
          <div class="text-xs text-gray-500 mt-1">待处理店铺</div>
        </div>
      </div>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div class="border-b border-gray-200 px-5">
        <nav class="flex space-x-6" aria-label="Tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="switchTab(tab.id)"
            class="py-3 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors"
            :class="currentTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            {{ tab.name }}
            <span class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
              {{ tab.count }}
            </span>
          </button>
        </nav>
      </div>

      <div class="p-0 min-h-[300px]">
        <div v-if="dashboardResource.loading" class="flex flex-col items-center justify-center py-16 text-gray-400">
          <LoadingIndicator class="mb-2" />
          <span class="text-sm">加载中...</span>
        </div>

        <div v-else-if="taskList.length === 0" class="flex flex-col items-center justify-center py-16 text-gray-400">
          <FeatherIcon name="inbox" class="w-8 h-8 text-gray-300 mb-2" />
          <p class="text-sm">暂无数据</p>
        </div>

        <div v-else class="divide-y divide-gray-100">
          <div 
            v-for="task in taskList" 
            :key="task.row_id"
            @click="openStoreDetail(task)"
            class="p-4 hover:bg-gray-50 cursor-pointer group flex items-center justify-between transition-colors"
          >
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-500 shrink-0 group-hover:bg-white group-hover:text-blue-600 border border-transparent group-hover:border-blue-100 transition-all">
                {{ task.title.charAt(0) }}
              </div>
              
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="text-sm font-bold text-gray-900">{{ task.title }}</h3>
                  <Badge theme="gray" size="sm">{{ task.channel }}</Badge>
                  <Badge v-if="task.is_urgent" theme="red" size="sm">急</Badge>
                </div>
                <div class="flex items-center text-xs text-gray-400 gap-3">
                  <span class="flex items-center gap-1">
                    <FeatherIcon name="user" class="w-3 h-3" />
                    {{ task.user }}
                  </span>
                  <span>•</span>
                  <span>{{ task.plan_type }}</span>
                </div>
              </div>
            </div>

            <div class="text-right">
              <div class="text-xs text-gray-400 mb-1">截止 {{ task.deadline }}</div>
              <div class="flex justify-end gap-2">
                 <Badge :theme="getStatusTheme(task.child_status, 'sub')">{{ task.child_status }}</Badge>
                 <Badge :theme="getStatusTheme(task.approval_status, 'app')">{{ task.approval_status }}</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted, watch } from 'vue'
import { createResource, Button, Badge, Autocomplete, FeatherIcon, LoadingIndicator } from 'frappe-ui'
import { useRouter } from 'vue-router'

const router = useRouter()

// --- 响应式状态 ---
const filters = reactive({
  store_ids: [],     // Autocomplete 返回的是对象数组 [{label, value}, ...]
  task_ids: [],      // Autocomplete 返回的是对象数组
  approval_status: '' // 简单的字符串
})

const currentTab = ref('pending')

// --- API 资源 ---

// 1. 获取选项数据
const optionsResource = createResource({
  url: 'product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_filter_options',
  auto: true
})

// 计算选项数据，适配 Autocomplete 格式
const options = computed(() => {
  const data = optionsResource.data || { stores: [], tasks: [] }
  return {
    stores: data.stores.map(s => ({ label: s.shop_name, value: s.name })),
    tasks: data.tasks.map(t => ({ 
      label: `${t.name} (${t.start_date || '无日期'})`, 
      value: t.name 
    }))
  }
})

// 2. 获取核心看板数据
const dashboardResource = createResource({
  url: 'product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_dashboard_data',
  auto: false, // 关闭自动，由我们手动触发
  makeParams() {
    // 🔥 核心修复：数据转换
    // Autocomplete 的 v-model 是对象数组，后端需要简单的 ID 数组 (Strings)
    const storeIds = filters.store_ids.map(item => item.value)
    const taskIds = filters.task_ids.map(item => item.value)

    return {
      filters: {
        store_ids: storeIds, 
        task_ids: taskIds,
        approval_status: filters.approval_status,
        tab: currentTab.value
      }
    }
  }
})

// --- Computed & Helpers ---

const stats = computed(() => dashboardResource.data?.stats || {})
const taskList = computed(() => dashboardResource.data?.tasks || [])

const tabs = computed(() => [
  { id: 'pending', name: '待完成', count: stats.value.pending_count || 0 },
  { id: 'completed', name: '已完成', count: stats.value.completed_count || 0 },
])

function getStatusTheme(status, type) {
  if (!status || status === '未开始') return 'gray'
  if (type === 'sub') {
    if (status.includes('已提交')) return 'blue'
    return 'orange'
  }
  if (type === 'app') {
    if (status.includes('通过')) return 'green'
    if (status.includes('驳回')) return 'red'
    if (status.includes('待')) return 'orange'
  }
  return 'gray'
}

// --- Actions ---

function applyFilters() {
  dashboardResource.reload()
}

function clearFilters() {
  filters.store_ids = []
  filters.task_ids = []
  filters.approval_status = ''
  dashboardResource.reload()
}

function switchTab(tab) {
  currentTab.value = tab
  if (tab === 'completed') {
    filters.approval_status = ''
  }
  dashboardResource.reload()
}

function goToDataView() {
  window.location.href = '/app/data-view'
}

function openStoreDetail(task) {
    // 假设你的路由配置了 :storeId 和 :parentId
    router.push({
        name: 'StoreDetail', // 确保 router.js 里有这个 name
        params: {
            storeId: task.store_id,
            parentId: task.parent_id // 这里对应的是任务 ID
        }
    })
}

// --- Lifecycle ---
onMounted(() => {
  dashboardResource.reload()
})
</script>