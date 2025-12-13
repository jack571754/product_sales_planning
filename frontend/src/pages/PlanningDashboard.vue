<template>
  <div class="min-h-screen bg-gray-50 p-6 md:p-8">
    <div class="mx-auto max-w-7xl space-y-6">
      
      <div class="flex flex-col gap-1">
        <h1 class="text-3xl font-bold text-gray-900">计划看板</h1>
        <p class="text-gray-500">商品销售计划执行与审批概览</p>
      </div>

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
              :loading="dashboardData.loading"
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
            <div class="text-2xl font-bold text-gray-900">{{ stats.tasks_count }}</div>
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
            
          <div v-if="dashboardData.loading" class="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
             <div class="h-8 w-8 animate-spin rounded-full border-2 border-gray-100 border-t-gray-600"></div>
             <span class="text-sm">加载数据中...</span>
          </div>

          <div v-else-if="taskList.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <div class="bg-gray-50 p-4 rounded-full">
                <FeatherIcon name="inbox" class="h-8 w-8 text-gray-300" />
            </div>
            <span class="text-sm">暂无{{ currentTab === 'pending' ? '待处理' : '已完成' }}任务</span>
          </div>

          <div v-else class="space-y-2 p-2">
            <div
              v-for="task in taskList"
              :key="`${task.parent_id}-${task.store_id}`"
              @click="goToStoreDetail(task.store_id, task.parent_id)"
              class="group relative flex items-start gap-4 rounded-lg border border-gray-100 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm cursor-pointer"
              :class="{ 'opacity-50 cursor-not-allowed': !task.store_id || !task.parent_id }"
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Select, MultiSelect, FeatherIcon, createResource, Badge, toast } from 'frappe-ui'

// ==================== Router ====================
const router = useRouter()

// ==================== 状态管理 ====================
const filters = ref({ store_ids: [], task_ids: [], approval_status: '' })
const currentTab = ref('pending')

// ==================== API 辅助函数 ====================
const extractValues = (arr) => {
  if (!Array.isArray(arr)) return []
  return arr.map(item => typeof item === 'object' && item !== null ? item.value : item).filter(Boolean)
}
const extractValue = (val) => typeof val === 'object' && val !== null ? val.value || '' : val || ''

// ==================== API 资源 ====================

// 1. 筛选选项
const filterOptions = createResource({
  url: 'product_sales_planning.api.v1.dashboard.get_filter_options',
  auto: true
})

// 2. 看板数据 (使用 makeParams 保证响应式)
const dashboardData = createResource({
  url: 'product_sales_planning.api.v1.dashboard.get_dashboard_data',
  makeParams() {
    return {
      filters: JSON.stringify({
        store_ids: extractValues(filters.value.store_ids),
        task_ids: extractValues(filters.value.task_ids),
        approval_status: extractValue(filters.value.approval_status),
        tab: currentTab.value
      })
    }
  },
  auto: false
})

// 3. 全局统计 (tab 无关)
const allTabsCount = createResource({
  url: 'product_sales_planning.api.v1.dashboard.get_dashboard_data',
  makeParams() {
    return {
      filters: JSON.stringify({
        store_ids: extractValues(filters.value.store_ids),
        task_ids: extractValues(filters.value.task_ids),
        approval_status: extractValue(filters.value.approval_status)
      })
    }
  },
  auto: false
})

// ==================== 选项配置 ====================
const storeOptions = computed(() => (filterOptions.data?.stores || []).map(s => ({ label: `${s.shop_name}`, value: s.name })))
const taskOptions = computed(() => (filterOptions.data?.tasks || []).map(t => ({ label: t.name, value: t.name })))

const approvalOptions = [
  { label: '全部', value: '' },
  { label: '待审批', value: '待审批' },
  { label: '已通过', value: '已通过' },
  { label: '已驳回', value: '已驳回' }
]

// ==================== 计算属性 ====================
const stats = computed(() => ({
  ongoing: dashboardData.data?.stats?.ongoing || 0,
  tasks_count: dashboardData.data?.tasks?.length || 0,
  pending_count: allTabsCount.data?.stats?.pending_count || 0,
  completed_count: allTabsCount.data?.stats?.completed_count || 0
}))

const taskList = computed(() => {
  const tasks = dashboardData.data?.tasks || []
  
  // 验证数据完整性
  if (tasks.length > 0) {
    const invalidTasks = tasks.filter(t => !t.store_id || !t.parent_id)
    if (invalidTasks.length > 0) {
      console.warn('⚠️ 发现无效任务数据:', invalidTasks)
    }
  }
  
  return tasks
})

const tabs = computed(() => [
  { label: '待完成', value: 'pending', count: stats.value.pending_count },
  { label: '已完成', value: 'completed', count: stats.value.completed_count }
])

// ==================== 操作逻辑 ====================
const isLoading = ref(false)

const applyFilters = () => {
  if (isLoading.value) return
  isLoading.value = true

  dashboardData.reload()
  allTabsCount.reload()

  setTimeout(() => {
    isLoading.value = false
  }, 500)
}

const clearFilters = () => {
  if (isLoading.value) return
  filters.value = { store_ids: [], task_ids: [], approval_status: '' }
  currentTab.value = 'pending'
  applyFilters()
}

const switchTab = (tab) => {
  if (currentTab.value === tab) return
  currentTab.value = tab
  if (tab === 'completed') filters.value.approval_status = ''
  applyFilters() // reload 会自动调用 makeParams
}

const goToStoreDetail = async (storeId, parentId) => {
  // 验证参数
  if (!storeId || !parentId) {
    console.error('❌ 跳转失败：缺少必要参数', { storeId, parentId })
    toast.error('数据异常，无法跳转到店铺详情')
    return
  }

  // 确保参数是字符串类型
  const safeStoreId = String(storeId).trim()
  const safeTaskId = String(parentId).trim()

  // 再次验证处理后的参数
  if (!safeStoreId || !safeTaskId || safeStoreId === 'undefined' || safeTaskId === 'undefined') {
    console.error('❌ 跳转失败：参数无效', { safeStoreId, safeTaskId })
    toast.error('数据异常，无法跳转到店铺详情')
    return
  }

  console.log('🔄 准备跳转到店铺详情:', { storeId: safeStoreId, taskId: safeTaskId })

  try {
    // 使用命名路由跳转
    await router.push({
      name: 'StoreDetail',
      params: {
        storeId: safeStoreId,
        taskId: safeTaskId
      }
    })
    console.log('✅ 路由跳转成功')
  } catch (error) {
    console.error('❌ 路由跳转失败:', error)
    
    // 检查是否是导航重复错误（可以忽略）
    if (error.name === 'NavigationDuplicated') {
      console.log('⚠️ 导航重复，已在目标页面')
      return
    }
    
    // 显示错误提示
    toast.error('页面跳转失败，请重试')
    
    // 尝试使用路径方式跳转作为备用方案
    try {
      console.log('🔄 尝试备用路由方式...')
      await router.push(`/store-detail/${safeStoreId}/${safeTaskId}`)
      console.log('✅ 备用路由跳转成功')
    } catch (fallbackError) {
      console.error('❌ 备用路由也失败:', fallbackError)
      toast.error('页面跳转异常，请刷新页面后重试')
    }
  }
}

// ==================== UI 辅助 ====================
const getAvatar = (title) => title ? title.charAt(0) : '店'

const shouldShowStatus = (status) => status && status !== '-' && status !== '未开始'

// 使用 Frappe UI Badge 主题映射
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

// ==================== 响应式监听 ====================
// 监听 currentTab 变化，自动刷新数据
watch(currentTab, () => {
  dashboardData.reload()
})

// ==================== 生命周期 ====================
onMounted(() => {
  allTabsCount.reload()
  dashboardData.reload()
})
</script>