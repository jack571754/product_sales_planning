<template>
  <div class="min-h-screen bg-gray-50 p-6 md:p-8">
    <div class="mx-auto max-w-7xl space-y-6">
      
      <!-- 页面标题 -->
      <div class="flex flex-col gap-1">
        <h1 class="text-3xl font-bold text-gray-900">Handsontable 示例</h1>
        <p class="text-gray-500">展示 Handsontable 表格组件的功能和用法</p>
      </div>

      <!-- 功能说明卡片 -->
      <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div class="flex items-center gap-2 mb-3 text-gray-900 font-medium">
          <FeatherIcon name="info" class="h-4 w-4 text-blue-500" />
          <span>功能特性</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-gray-600">
          <div class="flex items-center gap-2">
            <FeatherIcon name="check-circle" class="h-4 w-4 text-green-500" />
            <span>支持单元格编辑</span>
          </div>
          <div class="flex items-center gap-2">
            <FeatherIcon name="check-circle" class="h-4 w-4 text-green-500" />
            <span>列排序和筛选</span>
          </div>
          <div class="flex items-center gap-2">
            <FeatherIcon name="check-circle" class="h-4 w-4 text-green-500" />
            <span>固定列（左侧3列）</span>
          </div>
          <div class="flex items-center gap-2">
            <FeatherIcon name="check-circle" class="h-4 w-4 text-green-500" />
            <span>右键菜单操作</span>
          </div>
          <div class="flex items-center gap-2">
            <FeatherIcon name="check-circle" class="h-4 w-4 text-green-500" />
            <span>复制粘贴功能</span>
          </div>
          <div class="flex items-center gap-2">
            <FeatherIcon name="check-circle" class="h-4 w-4 text-green-500" />
            <span>中文语言支持</span>
          </div>
        </div>
      </div>

      <!-- 操作按钮区 -->
      <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div class="flex flex-wrap items-center gap-3">
          <Button
            variant="solid"
            theme="blue"
            @click="addRow"
            :disabled="loading"
          >
            <template #prefix><FeatherIcon name="plus" class="h-4 w-4" /></template>
            添加行
          </Button>

          <Button
            variant="solid"
            theme="red"
            @click="deleteSelectedRows"
            :disabled="loading || selectedRows.length === 0"
          >
            <template #prefix><FeatherIcon name="trash-2" class="h-4 w-4" /></template>
            删除选中 ({{ selectedRows.length }})
          </Button>

          <Button
            variant="solid"
            theme="green"
            @click="exportData"
            :disabled="loading"
          >
            <template #prefix><FeatherIcon name="download" class="h-4 w-4" /></template>
            导出数据
          </Button>

          <Button
            variant="subtle"
            theme="gray"
            @click="refreshData"
            :disabled="loading"
          >
            <template #prefix><FeatherIcon name="refresh-cw" class="h-4 w-4" /></template>
            刷新
          </Button>

          <div class="ml-auto flex items-center gap-2 text-sm text-gray-600">
            <FeatherIcon name="database" class="h-4 w-4" />
            <span>共 {{ tableData.length }} 条数据</span>
          </div>
        </div>
      </div>

      <!-- 表格容器 -->
      <div class="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div class="border-b border-gray-100 px-5 py-3 bg-gray-50">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-gray-900 font-medium">
              <FeatherIcon name="table" class="h-4 w-4 text-gray-500" />
              <span>数据表格</span>
            </div>
            <Badge v-if="loading" theme="blue" variant="subtle">
              <template #prefix>
                <div class="h-3 w-3 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600"></div>
              </template>
              加载中...
            </Badge>
            <Badge v-else-if="error" theme="red" variant="subtle">
              <template #prefix><FeatherIcon name="alert-circle" class="h-3 w-3" /></template>
              {{ error }}
            </Badge>
            <Badge v-else theme="green" variant="subtle">
              <template #prefix><FeatherIcon name="check" class="h-3 w-3" /></template>
              就绪
            </Badge>
          </div>
        </div>

        <!-- Handsontable 容器 -->
        <div class="p-4">
          <div 
            ref="tableContainer" 
            class="handsontable-container"
            style="height: 600px; overflow: hidden;"
          ></div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="rounded-lg border border-blue-100 bg-blue-50 p-5">
        <div class="flex items-start gap-3">
          <FeatherIcon name="book-open" class="h-5 w-5 text-blue-600 mt-0.5" />
          <div class="space-y-2 text-sm text-blue-900">
            <p class="font-medium">使用提示：</p>
            <ul class="list-disc list-inside space-y-1 text-blue-800">
              <li>双击单元格可以编辑内容</li>
              <li>点击列标题可以排序</li>
              <li>右键单击可以查看更多操作选项</li>
              <li>使用 Ctrl+C / Ctrl+V 可以复制粘贴数据</li>
              <li>拖动列边界可以调整列宽</li>
              <li>左侧前3列为固定列，横向滚动时保持可见</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { Button, FeatherIcon, Badge } from 'frappe-ui'
import { useHandsontable } from '../composables/useHandsontable'

// ==================== 状态管理 ====================
const tableContainer = ref(null)
const tableData = ref([])
const selectedRows = ref([])

// ==================== 示例数据生成 ====================
const generateSampleData = () => {
  const categories = ['电子产品', '服装鞋帽', '食品饮料', '家居用品', '图书文具']
  const brands = ['品牌A', '品牌B', '品牌C', '品牌D', '品牌E']
  const statuses = ['在售', '缺货', '预售', '下架']
  
  return Array.from({ length: 50 }, (_, i) => ({
    id: `P${String(i + 1).padStart(4, '0')}`,
    name: `商品名称 ${i + 1}`,
    code: `SKU${String(i + 1).padStart(6, '0')}`,
    category: categories[Math.floor(Math.random() * categories.length)],
    brand: brands[Math.floor(Math.random() * brands.length)],
    price: (Math.random() * 1000 + 10).toFixed(2),
    stock: Math.floor(Math.random() * 1000),
    sales: Math.floor(Math.random() * 500),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    createDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toLocaleDateString('zh-CN')
  }))
}

// ==================== 列配置 ====================
const columns = [
  { data: 'id', title: 'ID', width: 100, readOnly: true },
  { data: 'name', title: '商品名称', width: 200 },
  { data: 'code', title: '商品编码', width: 150 },
  { data: 'category', title: '分类', width: 120, type: 'dropdown', source: ['电子产品', '服装鞋帽', '食品饮料', '家居用品', '图书文具'] },
  { data: 'brand', title: '品牌', width: 120 },
  { data: 'price', title: '价格', width: 100, type: 'numeric', numericFormat: { pattern: '0,0.00' } },
  { data: 'stock', title: '库存', width: 100, type: 'numeric' },
  { data: 'sales', title: '销量', width: 100, type: 'numeric' },
  { data: 'status', title: '状态', width: 100, type: 'dropdown', source: ['在售', '缺货', '预售', '下架'] },
  { data: 'createDate', title: '创建日期', width: 120 }
]

// ==================== Handsontable 集成 ====================
const {
  hotInstance,
  loading,
  error,
  updateData,
  getData,
  getSelectedRows,
  clearSelection
} = useHandsontable(tableContainer, {
  data: computed(() => tableData.value),
  columns: columns,
  colHeaders: true,
  rowHeaders: true,
  fixedColumnsLeft: 3,
  contextMenu: true,
  dropdownMenu: true,
  filters: true,
  columnSorting: true,
  onDataChange: (changes, source) => {
    console.log('数据变化:', changes, '来源:', source)
  },
  onSelectionChange: (rows) => {
    selectedRows.value = rows
    console.log('选中行:', rows)
  }
})

// ==================== 操作方法 ====================
const addRow = () => {
  const newRow = {
    id: `P${String(tableData.value.length + 1).padStart(4, '0')}`,
    name: '新商品',
    code: `SKU${String(tableData.value.length + 1).padStart(6, '0')}`,
    category: '电子产品',
    brand: '品牌A',
    price: '0.00',
    stock: 0,
    sales: 0,
    status: '在售',
    createDate: new Date().toLocaleDateString('zh-CN')
  }
  tableData.value.push(newRow)
  updateData(tableData.value)
}

const deleteSelectedRows = () => {
  if (selectedRows.value.length === 0) return
  
  const rowsToDelete = [...selectedRows.value].sort((a, b) => b - a)
  rowsToDelete.forEach(rowIndex => {
    tableData.value.splice(rowIndex, 1)
  })
  
  updateData(tableData.value)
  clearSelection()
}

const exportData = () => {
  const data = getData()
  const csv = [
    columns.map(col => col.title).join(','),
    ...data.map(row => row.join(','))
  ].join('\n')
  
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `handsontable_demo_${new Date().getTime()}.csv`
  link.click()
}

const refreshData = () => {
  tableData.value = generateSampleData()
  updateData(tableData.value)
  clearSelection()
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 初始化示例数据
  tableData.value = generateSampleData()
})
</script>

<style scoped>
.handsontable-container {
  width: 100%;
}

/* 确保 Handsontable 样式正确应用 */
:deep(.handsontable) {
  font-size: 13px;
}

:deep(.handsontable td) {
  border-color: #e5e7eb;
}

:deep(.handsontable th) {
  background-color: #f9fafb;
  font-weight: 600;
  color: #374151;
}
</style>