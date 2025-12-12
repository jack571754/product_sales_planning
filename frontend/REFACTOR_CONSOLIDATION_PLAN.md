
# 前端架构优化重构方案 - 减少过度拆分，提高内聚性

**重构目标**: 针对小型项目，减少过度拆分，提高代码内聚性和可维护性  
**重构日期**: 2025-12-12  
**项目规模**: 小型（3-5个核心页面，10-15个组件）

---

## 📋 重构原则

### 核心理念
> **"简单优于复杂，内聚优于分散"**

1. **适度拆分** - 只在真正需要复用时才拆分组件
2. **就近原则** - 相关代码放在一起，减少跳转
3. **单文件完整** - 优先保证单个文件的完整性和可读性
4. **实用主义** - 避免为了"最佳实践"而过度工程化

### 文件大小指导原则

| 文件类型 | 建议行数 | 最大行数 | 处理方式 |
|---------|---------|---------|---------|
| 页面组件 | 200-400 | 600 | 超过600行考虑拆分 |
| 通用组件 | 50-150 | 300 | 超过300行考虑拆分 |
| Composable | 200-400 | 800 | 按功能域合并，不按函数拆分 |
| 工具函数 | 100-200 | 400 | 按类型合并（format、validate等） |

---

## 1. Composables 合并方案

### 当前项目实际情况

```
src/composables/
├── useStoreDetail.js       (638 行) ✅ 保持
├── useColumnSettings.js    (约 100 行) → 合并到 useStoreDetail.js
└── useHandsontable.js      (已废弃) → 删除
```

### 重构方案：保持 1-2 个核心 Composable

```javascript
// composables/useStoreDetail.js (约 700 行)
/**
 * 店铺详情管理 - 完整的业务逻辑
 * 包含：数据加载、筛选、分页、保存、导出、删除等所有功能
 */
import { ref, computed, watch } from 'vue'
import { createResource, call } from 'frappe-ui'

export function useStoreDetail(storeId, taskId) {
  // ==================== 状态管理 ====================
  const filters = ref({ search: '', category: '' })
  const pagination = ref({ currentPage: 1, pageSize: 50, pageSizeOptions: [20, 50, 100, 200] })
  const columnSettings = ref({ hiddenColumns: [] })
  const isSaving = ref(false)
  const saveError = ref(null)
  const lastSaveTime = ref(null)
  const selectedRows = ref(new Set())
  const selectedCodes = ref(new Set())

  // ==================== API 资源 ====================
  const commodityData = createResource({
    url: 'product_sales_planning.api.v1.commodity.get_store_commodity_data',
    params: () => ({
      store_id: storeId,
      task_id: taskId,
      view_mode: 'multi',
      start: (pagination.value.currentPage - 1) * pagination.value.pageSize,
      page_length: pagination.value.pageSize,
      search_term: filters.value.search || null,
      category: filters.value.category || null
    }),
    auto: true,
    transform: (data) => ({
      commodities: data.data || [],
      months: data.months || [],
      store_info: data.store_info || {},
      task_info: data.task_info || {},
      can_edit: data.can_edit !== undefined ? data.can_edit : true,
      total_count: data.total_count || 0
    })
  })

  // ==================== 计算属性 ====================
  const storeInfo = computed(() => commodityData.data?.store_info || {})
  const taskInfo = computed(() => commodityData.data?.task_info || {})
  const canEdit = computed(() => commodityData.data?.can_edit || false)
  const totalCount = computed(() => commodityData.data?.total_count || 0)
  const totalPages = computed(() => Math.ceil(totalCount.value / pagination.value.pageSize) || 1)
  const months = computed(() => commodityData.data?.months || [])
  const rawCommodities = computed(() => commodityData.data?.commodities || [])
  
  const statistics = computed(() => {
    const commodities = rawCommodities.value
    let totalQuantity = 0
    commodities.forEach(item => {
      if (item.months) {
        Object.values(item.months).forEach(monthData => {
          totalQuantity += Number(monthData?.quantity || 0)
        })
      }
    })
    return {
      totalSKU: commodities.length,
      totalQuantity: totalQuantity,
      plannedSKU: commodities.filter(item => {
        if (!item.months) return false
        return Object.values(item.months).some(monthData => (monthData?.quantity || 0) > 0)
      }).length
    }
  })

  const filterOptions = computed(() => {
    const commodities = rawCommodities.value
    const categories = new Set()
    commodities.forEach(item => {
      if (item.category) categories.add(item.category)
    })
    return {
      categories: Array.from(categories).sort()
    }
  })

  const selectedCount = computed(() => selectedCodes.value.size)
  const hasSelection = computed(() => selectedCodes.value.size > 0)

  // ==================== 表格数据转换 ====================
  const generateColumns = () => {
    const columns = [
      { data: '__selected', title: '', type: 'checkbox', width: 50, className: 'htCenter htMiddle' },
      { data: 'name1', title: '商品名称', readOnly: true, width: 250, className: 'htLeft htMiddle' },
      { data: 'code', title: '编码', readOnly: true, width: 120 },
      { data: 'specifications', title: '规格', readOnly: true, width: 100 },
      { data: 'brand', title: '品牌', readOnly: true, width: 100 },
      { data: 'category', title: '类别', readOnly: true, width: 100 }
    ]
    months.value.forEach(month => {
      columns.push({
        data: month,
        title: month,
        type: 'numeric',
        readOnly: !canEdit.value,
        width: 100,
        numericFormat: { pattern: '0,0' }
      })
    })
    return columns
  }

  const generateHeaders = () => {
    const headers = ['选择', '商品名称', '编码', '规格', '品牌', '类别']
    months.value.forEach(month => headers.push(month))
    return headers
  }

  const transformDataForTable = () => {
    return rawCommodities.value.map((item, index) => {
      const row = {
        __selected: selectedRows.value.has(index),
        name1: item.commodity_name || item.name1,
        code: item.commodity_code || item.code,
        specifications: item.specifications || '',
        brand: item.brand || '',
        category: item.category || ''
      }
      months.value.forEach(month => {
        const monthData = item.months?.[month]
        row[month] = monthData?.quantity ?? 0
      })
      return row
    })
  }

  // ==================== 方法 ====================
  async function refreshData() {
    await commodityData.reload()
  }

  function updateFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
    pagination.value.currentPage = 1
    clearSelection()
    commodityData.reload()
  }

  function updatePagination(newPagination) {
    pagination.value = { ...pagination.value, ...newPagination }
    clearSelection()
    commodityData.reload()
  }

  async function batchSaveChanges(changes) {
    isSaving.value = true
    saveError.value = null
    try {
      const fixedColumnCount = 6
      const updates = changes
        .map(([row, col, oldValue, newValue]) => {
          const commodity = rawCommodities.value[row]
          const monthIndex = col - fixedColumnCount
          if (!commodity || monthIndex < 0 || monthIndex >= months.value.length) return null
          return {
            code: commodity.commodity_code || commodity.code,
            month: months.value[monthIndex],
            quantity: newValue
          }
        })
        .filter(Boolean)

      const response = await call(
        'product_sales_planning.api.v1.commodity.batch_update_month_quantities',
        { store_id: storeId, task_id: taskId, updates: JSON.stringify(updates) }
      )

      if (response?.status === 'success') {
        lastSaveTime.value = new Date()
        return { success: true, message: '保存成功' }
      }
      saveError.value = response?.message || '保存失败'
      return { success: false, message: response?.message || '保存失败' }
    } catch (error) {
      console.error('保存失败:', error)
      saveError.value = error.message || '保存失败'
      return { success: false, message: error.message || '保存失败' }
    } finally {
      isSaving.value = false
    }
  }

  async function exportToExcel() {
    try {
      const response = await call(
        'product_sales_planning.api.v1.import_export.export_commodity_data',
        { store_id: storeId, task_id: taskId }
      )
      if (response?.status === 'success') {
        window.open(response.file_url, '_blank')
        return { success: true, message: `成功导出 ${response.record_count} 条记录` }
      }
      return { success: false, message: response?.message || '导出失败' }
    } catch (error) {
      return { success: false, message: error.message || '导出失败' }
    }
  }

  function updateSelectedRows(rowIndices) {
    selectedRows.value = new Set(rowIndices)
    const codes = new Set()
    rowIndices.forEach(rowIndex => {
      const commodity = rawCommodities.value[rowIndex]
      if (commodity) {
        const code = commodity.commodity_code || commodity.code
        if (code) codes.add(code)
      }
    })
    selectedCodes.value = codes
  }

  function clearSelection() {
    selectedRows.value = new Set()
    selectedCodes.value = new Set()
  }

  async function batchDeleteSelected() {
    if (selectedCodes.value.size === 0) {
      return { success: false, message: '请先选择要删除的商品' }
    }
    try {
      const codes = Array.from(selectedCodes.value)
      const response = await call(
        'product_sales_planning.api.v1.commodity.batch_delete_by_codes',
        { store_id: storeId, task_id: taskId, codes: JSON.stringify(codes) }
      )
      if (response?.status === 'success') {
        clearSelection()
        await refreshData()
        return { success: true, message: response.message || `成功删除 ${response.count} 条记录` }
      }
      return { success: false, message: response?.message || '删除失败' }
    } catch (error) {
      return { success: false, message: error.message || '删除失败' }
    }
  }

  // ==================== 返回 ====================
  return {
    // 状态
    filters,
    pagination,
    columnSettings,
    selectedRows,
    selectedCodes,
    isSaving,
    saveError,
    lastSaveTime,
    // 数据
    storeInfo,
    taskInfo,
    canEdit,
    statistics,
    totalCount,
    totalPages,
    months,
    rawCommodities,
    filterOptions,
    selectedCount,
    hasSelection,
    // 加载状态
    loading: computed(() => commodityData.loading),
    error: computed(() => commodityData.error),
    // 表格相关
    generateColumns,
    generateHeaders,
    transformDataForTable,
    // 方法
    refreshData,
    updateFilters,
    updatePagination,
    batchSaveChanges,
    exportToExcel,
    updateSelectedRows,
    clearSelection,
    batchDeleteSelected
  }
}
```

**优势**：
- ✅ 所有店铺详情逻辑在一个文件中（700行，可接受）
- ✅ 减少文件跳转，提高开发效率
- ✅ 易于理解完整的业务流程
- ✅ 仍然保持良好的代码组织（通过注释分区）

---

## 2. 组件合并方案

### 2.1 当前项目实际情况

```
src/components/
├── Sidebar.vue              (108 行) ✅ 保持
├── TopBar.vue               (21 行) ✅ 保持
├── UserMenu.vue             (未列出) ✅ 保持
└── store-detail/
    ├── ColumnSettings.vue   (未使用) → 删除
    ├── CommodityTable.vue   (未使用) → 删除
    ├── FilterPanel.vue      (126 行) ✅ 保持
    ├── PaginationControls.vue (未列出) ✅ 保持
    ├── SaveIndicator.vue    (未列出) ✅ 保持
    ├── StatsCards.vue       (未列出) ✅ 保持
    └── dialogs/
        ├── ProductAddDialog.vue    ✅ 保持
        └── ProductImportDialog.vue ✅ 保持
```

### 2.2 简化后的组件结构

```
src/
├── components/
│   ├── common/              # 通用组件（新增）
│   │   ├── StatusBadge.vue  # 状态徽章
│   │   ├── LoadingSpinner.vue # 加载动画
│   │   └── EmptyState.vue   # 空状态
│   ├── layout/              # 布局组件
│   │   ├── Sidebar.vue
│   │   ├── TopBar.vue
│   │   └── UserMenu.vue
│   └── store-detail/        # 店铺详情组件
│       ├── FilterPanel.vue
│       ├── StatsCards.vue
│       ├── PaginationControls.vue
│       ├── SaveIndicator.vue
│       └── dialogs/
│           ├── ProductAddDialog.vue
│           └── ProductImportDialog.vue
│
├── pages/
│   ├── PlanningDashboard.vue  # 看板页面（376行）
│   └── StoreDetail.vue        # 店铺详情页面（简化后约400行）
│
└── composables/
    └── useStoreDetail.js      # 店铺详情逻辑（700行）
```

**组件数量**: 从潜在的 30+ 个减少到 15 个 ✅

### 2.3 StoreDetail.vue 简化版本

```vue
<!-- pages/StoreDetail.vue - 简化版（约 400 行） -->
<template>
  <div class="store-detail-page min-h-screen bg-gray-50 p-4 lg:p-6">
    <div class="max-w-[1920px] mx-auto space-y-4">
      
      <!-- 头部 - 直接在页面中实现 -->
      <Card class="p-4 lg:p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-start gap-3">
            <Button variant="ghost" theme="gray" size="sm" @click="goBack">
              <template #prefix>
                <FeatherIcon name="arrow-left" class="h-4 w-4" />
              </template>
              返回看板
            </Button>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-xl font-semibold text-gray-900">
                  {{ storeInfo.shop_name || storeInfo.name || '店铺详情' }}
                </h1>
                <Badge v-if="taskInfo.task_type" theme="blue" size="sm">
                  {{ taskInfo.task_type }}
                </Badge>
              </div>
              <div class="text-sm text-gray-500 flex items-center gap-2 mt-1">
                <FeatherIcon name="calendar" class="w-4 h-4" />
                <span>{{ taskInfo.task_name || taskInfo.name || '任务信息加载中' }}</span>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <Button v-if="canEdit" variant="outline" theme="blue" @click="showImportDialog = true">
              <template #prefix><FeatherIcon name="upload" class="h-4 w-4" /></template>
              单品导入
            </Button>
            <Button v-if="canEdit" variant="outline" theme="purple" @click="showAddDialog = true">
              <template #prefix><FeatherIcon name="plus" class="h-4 w-4" /></template>
              添加商品
            </Button>
            <Button variant="outline" theme="green" :loading="exporting" @click="handleExport">
              <template #prefix><FeatherIcon name="download" class="h-4 w-4" /></template>
              导出Excel
            </Button>
            <Button variant="ghost" theme="gray" @click="handleRefresh">
              <template #prefix><FeatherIcon name="refresh-cw" class="h-4 w-4" /></template>
              刷新
            </Button>
          </div>
        </div>
      </Card>

      <!-- 错误提示 -->
      <Alert v-if="error" theme="red" title="加载失败">
        {{ errorText }}
      </Alert>

      <!-- 加载状态 -->
      <Card v-if="loading" class="p-6 flex items-center justify-center">
        <div class="flex items-center gap-3 text-gray-600">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"></div>
          <span>正在加载数据...</span>
        </div>
      </Card>

      <!-- 主内容 -->
      <template v-else>
        <!-- 统计卡片 - 使用独立组件 -->
        <StatsCards :statistics="statistics" />

        <!-- 筛选面板 - 使用独立组件 -->
        <FilterPanel
          :filters="filters"
          :filter-options="filterOptions"
          :loading="loading"
          @update:filters="updateFilters"
        />

        <!-- 操作栏 - 直接在页面中实现 -->
        <Card class="p-4">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="flex items-center gap-3">
              <Button
                v-if="canEdit && hasSelection"
                variant="solid"
                theme="red"
                size="sm"
                @click="showDeleteDialog = true"
              >
                <template #prefix><FeatherIcon name="trash-2" class="h-4 w-4" /></template>
                删除选中 ({{ selectedCount }})
              </Button>
              <Badge v-if="hasSelection" theme="blue" variant="subtle">
                已选择 {{ selectedCount }} 项
              </Badge>
            </div>
            <div class="text-sm text-gray-500">
              共 {{ totalCount }} 条数据
            </div>
          </div>
        </Card>

        <!-- 数据表格 - 直接在页面中实现简单表格 -->
        <Card class="overflow-hidden">
          <div class="border-b border-gray-100 px-5 py-3 bg-gray-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-gray-900 font-medium">
                <FeatherIcon name="table" class="h-4 w-4 text-gray-500" />
                <span>商品计划数据</span>
              </div>
              <Badge v-if="isSaving" theme="blue" variant="subtle">
                <template #prefix>
                  <div class="h-3 w-3 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600"></div>
                </template>
                保存中...
              </Badge>
            </div>
          </div>

          <div class="p-4">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                  <tr>
                    <th v-for="header in tableHeaders" :key="header" 
                        class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {{ header }}
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="(row, rowIndex) in tableData" :key="rowIndex" class="hover:bg-gray-50">
                    <td v-for="(col, colIndex) in tableColumns" :key="colIndex"
                        class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {{ row[col.data] || '-' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="!tableData || tableData.length === 0" class="text-center py-12 text-gray-500">
              暂无数据
            </div>
          </div>
        </Card>

        <!-- 分页 - 使用独立组件 -->
        <PaginationControls
          :current-page="pagination.currentPage"
          :page-size="pagination.pageSize"
          :total-items="totalCount"
          :total-pages="totalPages"
          :page-size-options="pagination.pageSizeOptions"
          @update:current-page="updatePagination({ currentPage: $event })"
          @update:page-size="updatePagination({ pageSize: $event })"
        />
      </template>

      <!-- 对话框 -->
      <ProductImportDialog
        :show="showImportDialog"
        :store-id="storeId"
        :task-id="taskId"
        @close="showImportDialog = false"
        @success="handleImportSuccess"
      />

      <ProductAddDialog
        :show="showAddDialog"
        :store-id="storeId"
        :task-id="taskId"
        :existing-products="rawCommodities"
        @close="showAddDialog = false"
        @success="handleImportSuccess"
      />

      <Dialog v-model="showDeleteDialog" title="确认批量删除">
        <template #body-content>
          <div class="space-y-3">
            <p class="text-sm text-gray-600">
              确定删除选中的 <strong class="text-gray-900">{{ selectedCount }}</strong> 个商品的所有计划记录吗？
            </p>
            <div class="p-3 bg-red-50 rounded-lg border border-red-100">
              <div class="flex items-start gap-2">
                <FeatherIcon name="alert-triangle" class="h-4 w-4 text-red-600 mt-0.5" />
                <p class="text-sm text-red-800">该操作不可撤销，请谨慎操作！</p>
              </div>
            </div>
          </div>
        </template>
        <template #actions>
          <Button variant="subtle" theme="gray" @click="showDeleteDialog = false">取消</Button>
          <Button variant="solid" theme="red" :loading="deleting" @click="handleBatchDelete">确认删除</Button>
        </template>
      </Dialog>

      <!-- 保存指示器 - 使用独立组件 -->
      <SaveIndicator
        :is-saving="isSaving"
        :save-error="saveError"
        :last-save-time="lastSaveTime"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Badge, FeatherIcon, Card, Dialog, Alert, toast } from 'frappe-ui'
import { useStoreDetail } from '@/composables/useStoreDetail'
import FilterPanel from '@/components/store-detail/FilterPanel.vue'
import StatsCards from '@/components/store-detail/StatsCards.vue'
import PaginationControls from '@/components/store-detail/PaginationControls.vue'
import ProductImportDialog from '@/components/store-detail/dialogs/ProductImportDialog.vue'
import ProductAddDialog from '@/components/store-detail/dialogs/ProductAddDialog.vue'
import SaveIndicator from '@/components/store-detail/SaveIndicator.vue'

// Props
const props = defineProps({
  storeId: { type: String, required: true },
  taskId: { type: String, required: true }
})

// Router
const router = useRouter()

// 业务逻辑（从 composable 获取）
const {
  filters,
  pagination,
  storeInfo,
  taskInfo,
  canEdit,
  statistics,
  totalCount,
  totalPages,
  loading,
  error,
  filterOptions,
  isSaving,
  saveError,
  lastSaveTime,
  selectedCount,
  hasSelection,
  rawCommodities,
  generateColumns,
  generateHeaders,
  transformDataForTable,
  refreshData,
  updateFilters,
  updatePagination,
  exportToExcel,
  batchDeleteSelected
} = useStoreDetail(props.storeId, props.taskId)

// UI 状态
const showImportDialog = ref(false)
const showAddDialog = ref(false)
const showDeleteDialog = ref(false)
const exporting = ref(false)
const deleting = ref(false)

// 表格数据
const tableColumns = computed(() => generateColumns())
const tableHeaders = computed(() => generateHeaders())
const tableData = computed(() => transformDataForTable())

const errorText = computed(() => {
  if (!error.value) return ''
  if (typeof error.value === 'string') return error.value
  return error.value?.message || '加载失败'
})

// 事件处理
const goBack = () => router.push({ name: 'PlanningDashboard' })

const handleRefresh = async () => {
  await refreshData()
  toast.info('数据已刷新')
}

const handleImportSuccess = async () => {
  await refreshData()
  toast.success('导入成功，数据已更新')
}

const handleExport = async () => {
  exporting.value = true
  try {
    const result = await exportToExcel()
    if (result.success) {
      toast.success(result.message || '导出成功')
    } else {
      toast.error(result.message || '导出失败')
    }
  } catch (error) {
    toast.error(error.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

const handleBatchDelete = async () => {
  if (selectedCount.value === 0) {
    showDeleteDialog.value = false
    return
  }
  deleting.value = true
  try {
    const result = await batchDeleteSelected()
    if (result.success) {
      toast.success(result.message || '删除成功')
      showDeleteDialog.value = false
    } else {
      toast.error(result.message || '删除失败')
    }
  } catch (error) {
    toast.error(error.message || '删除失败')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
table {
  border-collapse: collapse;
}

th {
  background-color: #f9fafb;
  font-weight: 600;
  color: #374151;
  border: 1px solid #e5e7eb;
}

td {
  border: 1px solid #e5e7eb;
  vertical-align: middle;
}

tr:hover {
  background-color: #f9fafb;
}
</style>
```

**优势**：
- ✅ 页面约 400 行，可读性好
- ✅ 头部和操作栏直接在页面中实现（简单逻辑）
- ✅ 复杂组件（FilterPanel、StatsCards）保持独立
- ✅ 减少不必要的组件拆分

---

## 3. 工具函数合并方案

### 3.1 创建统一的工具文件

```javascript
// utils/helpers.js (约 300 行)
/**
 * 通用工具函数
 * 整合所有格式化、验证、辅助函数
 */

// ==================== 格式化函数 ====================

/**
 * 格式化数字
 */
export function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined || isNaN(num)) return '-'
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

/**
 * 格式化日期
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '-'
  const d = new