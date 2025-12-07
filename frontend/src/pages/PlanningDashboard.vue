<template>
  <div class="max-w-7xl mx-auto p-6 space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">计划任务看板</h1>
      <div class="flex gap-2">
        <Button variant="subtle" @click="router.push('/demo')">
          <FeatherIcon name="grid" class="w-4 h-4 mr-1" />
          组件演示
        </Button>
        <Button variant="solid" @click="refreshData" :loading="dashboardData.loading">
          <FeatherIcon name="refresh-cw" class="w-4 h-4 mr-1" />
          刷新
        </Button>
      </div>
    </div>

    <!-- 筛选器区域 -->
    <Card class="p-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="text-sm font-medium text-gray-700 mb-1 block">店铺</label>
          <MultiSelect
            v-model="filters.store_ids"
            :options="storeOptions"
            placeholder="选择店铺"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 mb-1 block">计划任务</label>
          <MultiSelect
            v-model="filters.task_ids"
            :options="taskOptions"
            placeholder="选择任务"
          />
        </div>
        <div>
          <label class="text-sm font-medium text-gray-700 mb-1 block">审批状态</label>
          <Select
            v-model="filters.approval_status"
            :options="approvalOptions"
            placeholder="全部"
          />
        </div>
        <div class="flex items-end gap-2">
          <Button variant="solid" @click="applyFilters" class="flex-1">查询</Button>
          <Button variant="subtle" @click="clearFilters">清空</Button>
        </div>
      </div>
    </Card>

    <!-- 搜索和排序 -->
    <div class="flex items-center gap-4">
      <Input
        v-model="searchText"
        placeholder="搜索店铺名称、负责人、渠道..."
        class="flex-1"
      >
        <template #prefix>
          <FeatherIcon name="search" class="w-4 h-4 text-gray-400" />
        </template>
      </Input>
      <Select
        v-model="sortBy"
        :options="sortOptions"
        placeholder="排序方式"
        class="w-48"
      />
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <FeatherIcon name="folder" class="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div class="text-3xl font-bold text-gray-900">{{ stats.ongoing || 0 }}</div>
            <div class="text-sm text-gray-600">进行中计划</div>
          </div>
        </div>
      </Card>
      <Card class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
            <FeatherIcon name="check-square" class="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div class="text-3xl font-bold text-gray-900">{{ stats.tasks_count || 0 }}</div>
            <div class="text-sm text-gray-600">待处理店铺</div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Tab 切换 -->
    <div class="flex items-center justify-between border-b">
      <div class="flex gap-4">
        <button
          @click="switchTab('pending')"
          :class="[
            'px-4 py-2 font-medium border-b-2 transition-colors',
            currentTab === 'pending'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          待完成
          <Badge class="ml-2">{{ stats.pending_count || 0 }}</Badge>
        </button>
        <button
          @click="switchTab('completed')"
          :class="[
            'px-4 py-2 font-medium border-b-2 transition-colors',
            currentTab === 'completed'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          ]"
        >
          已完成
          <Badge class="ml-2">{{ stats.completed_count || 0 }}</Badge>
        </button>
      </div>

      <!-- 批量操作 -->
      <div v-if="selectedTasks.length > 0" class="flex items-center gap-2">
        <span class="text-sm text-gray-600">已选 {{ selectedTasks.length }} 项</span>
        <Button variant="subtle" size="sm" @click="batchExport">
          <FeatherIcon name="download" class="w-3 h-3 mr-1" />
          批量导出
        </Button>
        <Button variant="subtle" size="sm" @click="clearSelection">取消选择</Button>
      </div>
    </div>

    <!-- 任务列表 -->
    <div v-if="dashboardData.loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-500">加载中...</p>
    </div>

    <div v-else-if="dashboardData.error" class="text-center py-12">
      <FeatherIcon name="alert-circle" class="w-16 h-16 text-red-300 mx-auto mb-4" />
      <p class="text-red-500">{{ dashboardData.error.message }}</p>
      <Button variant="subtle" class="mt-4" @click="dashboardData.reload()">重试</Button>
    </div>

    <div v-else class="space-y-3">
      <Card
        v-for="task in filteredTasks"
        :key="task.row_id"
        class="p-4 hover:shadow-md transition-shadow cursor-pointer"
        @click="goToDetail(task)"
      >
        <div class="flex items-center gap-4">
          <!-- 复选框 -->
          <div @click.stop>
            <Checkbox
              v-model="selectedTasks"
              :value="task.row_id"
            />
          </div>

          <!-- 店铺头像 -->
          <Avatar :label="task.title" size="lg" />

          <!-- 任务信息 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="font-semibold text-gray-900 truncate">{{ task.title }}</h3>
              <Badge theme="gray" size="sm">{{ task.channel }}</Badge>
              <Badge v-if="task.is_urgent" theme="red" size="sm">急</Badge>
            </div>
            <div class="flex items-center gap-3 text-sm text-gray-600">
              <span class="flex items-center gap-1">
                <FeatherIcon name="user" class="w-3 h-3" />
                {{ task.user }}
              </span>
              <span>•</span>
              <span>{{ task.plan_type }}</span>
            </div>
          </div>

          <!-- 状态和截止日期 -->
          <div class="text-right space-y-2">
            <div
              class="flex items-center gap-1 text-sm"
              :class="task.is_urgent ? 'text-red-600 font-semibold' : 'text-gray-600'"
            >
              <FeatherIcon name="calendar" class="w-3 h-3" />
              截止 {{ task.deadline }}
            </div>
            <div class="flex items-center gap-2">
              <Badge :theme="getStatusTheme(task.child_status)">
                {{ task.child_status }}
              </Badge>
              <Badge :theme="getApprovalTheme(task.approval_status)">
                {{ task.approval_status }}
              </Badge>
              <Badge v-if="task.current_approval_step > 0" theme="blue" size="sm">
                第{{ task.current_approval_step }}级
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      <!-- 空状态 -->
      <div v-if="filteredTasks.length === 0" class="text-center py-12">
        <FeatherIcon name="inbox" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p class="text-gray-500">暂无任务</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Button,
  Input,
  Select,
  MultiSelect,
  Card,
  Badge,
  Avatar,
  FeatherIcon,
  Checkbox,
  createResource
} from 'frappe-ui'

const router = useRouter()

// 筛选器状态
const filters = ref({
  store_ids: [],
  task_ids: [],
  approval_status: ''
})

// 搜索和排序
const searchText = ref('')
const sortBy = ref('deadline')
const currentTab = ref('pending')
const selectedTasks = ref([])

// 获取筛选器选项
const filterOptions = createResource({
  url: 'product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_filter_options',
  auto: true
})

// 获取看板数据
const dashboardData = createResource({
  url: 'product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_dashboard_data',
  params: () => ({
    filters: {
      store_ids: filters.value.store_ids,
      task_ids: filters.value.task_ids,
      approval_status: filters.value.approval_status
    },
    tab: currentTab.value
  }),
  auto: true
})

// 计算属性
const stats = computed(() => dashboardData.data?.stats || {})
const tasks = computed(() => dashboardData.data?.tasks || [])

// 筛选器选项
const storeOptions = computed(() => {
  const stores = filterOptions.data?.stores || []
  return stores.map(s => ({
    label: `${s.shop_name} (${s.name})`,
    value: s.name
  }))
})

const taskOptions = computed(() => {
  const taskList = filterOptions.data?.tasks || []
  return taskList.map(t => {
    const dateRange = (t.start_date && t.end_date)
      ? `${t.start_date} ~ ${t.end_date}`
      : (t.start_date || t.end_date || '无日期')
    return {
      label: `${t.name} (${dateRange})`,
      value: t.name
    }
  })
})

const approvalOptions = [
  { label: '全部', value: '' },
  { label: '待审批', value: '待审批' },
  { label: '已通过', value: '已通过' },
  { label: '已驳回', value: '已驳回' }
]

const sortOptions = [
  { label: '按截止日期', value: 'deadline' },
  { label: '按店铺名称', value: 'title' },
  { label: '按渠道', value: 'channel' }
]

// 前端过滤和排序
const filteredTasks = computed(() => {
  let result = [...tasks.value]

  // 搜索过滤
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(task =>
      task.title?.toLowerCase().includes(search) ||
      task.user?.toLowerCase().includes(search) ||
      task.channel?.toLowerCase().includes(search)
    )
  }

  // 排序
  if (sortBy.value) {
    result.sort((a, b) => {
      if (sortBy.value === 'deadline') {
        return (a.days_remaining || 999) - (b.days_remaining || 999)
      } else if (sortBy.value === 'title') {
        return (a.title || '').localeCompare(b.title || '')
      } else if (sortBy.value === 'channel') {
        return (a.channel || '').localeCompare(b.channel || '')
      }
      return 0
    })
  }

  return result
})

// 方法
const applyFilters = () => {
  dashboardData.reload()
}

const clearFilters = () => {
  filters.value = {
    store_ids: [],
    task_ids: [],
    approval_status: ''
  }
  searchText.value = ''
  dashboardData.reload()
}

const refreshData = () => {
  dashboardData.reload()
  filterOptions.reload()
}

const switchTab = (tab) => {
  if (currentTab.value !== tab) {
    currentTab.value = tab
    selectedTasks.value = []
    dashboardData.reload()
  }
}

const goToDetail = (task) => {
  // 跳转到店铺详情页
  window.location.href = `/app/store-detail?store_id=${task.store_id}&task_id=${task.parent_id}`
}

const batchExport = () => {
  // 批量导出功能
  console.log('导出任务:', selectedTasks.value)
  alert(`准备导出 ${selectedTasks.value.length} 个任务`)
}

const clearSelection = () => {
  selectedTasks.value = []
}

// 状态主题映射
const getStatusTheme = (status) => {
  if (!status) return 'gray'
  if (status === '已提交') return 'blue'
  if (status === '草稿') return 'orange'
  return 'gray'
}

const getApprovalTheme = (status) => {
  if (!status) return 'gray'
  if (status === '已通过') return 'green'
  if (status === '已驳回') return 'red'
  if (status === '待审批') return 'yellow'
  return 'gray'
}

// 监听 tab 切换，自动刷新数据
watch(currentTab, () => {
  dashboardData.reload()
})
</script>
