<template>
    <div class="h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div class="border-b border-gray-100 p-3 bg-gray-50">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <h2 class="text-base font-semibold text-gray-800">商品计划数据</h2>
                    
                    <div class="h-4 w-px bg-gray-300 mx-1"></div>

                    <Dropdown :options="batchActions" placement="bottom-start">
                        <template #default="{ open }">
                            <Button 
                                variant="subtle" 
                                theme="gray" 
                                size="sm"
                                :disabled="!hasData"
                            >
                                <template #prefix>
                                    <FeatherIcon name="check-square" class="h-4 w-4" />
                                </template>
                                批量选择
                                <template #suffix>
                                    <FeatherIcon :name="open ? 'chevron-up' : 'chevron-down'" class="h-4 w-4" />
                                </template>
                            </Button>
                        </template>
                    </Dropdown>

                    <transition name="fade">
                        <Badge v-if="selectedCount > 0" theme="blue" variant="subtle" class="ml-1">
                            已选 {{ selectedCount }} 项
                        </Badge>
                    </transition>
                </div>

                <div class="flex items-center gap-2">
                    <span v-if="lastSaveTime" class="text-xs text-green-600 flex items-center gap-1 mr-2">
                        <FeatherIcon name="check" class="h-3 w-3" />
                        {{ formatSaveTime(lastSaveTime) }} 已保存
                    </span>

                    <Dropdown :options="columnMenuOptions" placement="bottom-end">
                        <template #default="{ open }">
                            <Button variant="outline" theme="gray" size="sm">
                                <template #prefix>
                                    <FeatherIcon name="columns" class="h-4 w-4" />
                                </template>
                                列设置
                            </Button>
                        </template>
                    </Dropdown>
                </div>
            </div>
        </div>

        <div class="flex-1 relative w-full overflow-hidden">
             <div ref="hotTableContainer" class="hot-table-wrapper h-full w-full absolute inset-0"></div>
        </div>

        <div class="bg-gray-50 border-t border-gray-100 px-3 py-1.5 text-xs text-gray-500 flex justify-between items-center">
            <div>
                <span class="font-medium text-gray-600">快捷键：</span>
                <span class="bg-gray-200 px-1 rounded mx-1">Ctrl+C/V</span> 复制粘贴
                <span class="bg-gray-200 px-1 rounded mx-1 ml-2">Double Click</span> 编辑
            </div>
            <div>
                共 {{ props.data.length }} 条数据
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Button, Badge, Dropdown, FeatherIcon, toast } from 'frappe-ui'
import Handsontable from 'handsontable'
import 'handsontable/dist/handsontable.full.min.css'
import { debounce } from '../../utils/helpers'

// ==================== Props ====================
const props = defineProps({
    data: {
        type: Array,
        required: true,
        default: () => []
    },
    columns: {
        type: Array,
        required: true,
        default: () => []
    },
    readOnly: { type: Boolean, default: false },
    canEdit: { type: Boolean, default: true },
    hiddenColumns: { type: Array, default: () => [] }
})

// ==================== Emits ====================
const emit = defineEmits(['update:data', 'change', 'selection-change', 'toggle-column'])

// ==================== Refs ====================
const hotTableContainer = ref(null)
const hotInstance = ref(null)
const selectedRows = ref(new Set())
const lastSaveTime = ref(null)
const isUpdating = ref(false)

// ==================== Computed ====================
const selectedCount = computed(() => selectedRows.value.size)
const hasData = computed(() => props.data.length > 0)

// 批量操作菜单配置
const batchActions = computed(() => [
    {
        label: '全选所有行',
        icon: 'check-circle',
        onClick: selectAll
    },
    {
        label: '反向选择',
        icon: 'refresh-cw',
        onClick: invertSelection
    },
    {
        label: '清除选择',
        icon: 'x',
        onClick: clearSelection
    }
])

// 列菜单选项
const columnMenuOptions = computed(() => {
    return props.columns
        .filter(col => col.data !== '__selected')
        .map(col => ({
            label: col.title,
            icon: props.hiddenColumns.includes(col.data) ? 'eye-off' : 'eye',
            onClick: () => toggleColumn(col.data)
        }))
})

// ==================== Methods ====================

const initHandsontable = () => {
    if (!hotTableContainer.value || hotInstance.value) return

    try {
        const columns = props.columns.map(col => {
            const config = {
                data: col.data,
                title: col.title || col.data,
                readOnly: props.readOnly || !props.canEdit || col.readOnly,
                className: col.className || 'htCenter htMiddle'
            }
            if (col.type === 'checkbox') {
                config.type = 'checkbox'
                config.className = 'htCenter htMiddle checkbox-column'
            } else if (col.type === 'numeric') {
                config.type = 'numeric'
                config.numericFormat = col.numericFormat || { pattern: '0,0', culture: 'zh-CN' }
            }
            if (col.width) config.width = col.width
            return config
        })

        const hiddenColumnsPlugin = {
            columns: props.hiddenColumns.map(colName => 
                props.columns.findIndex(col => col.data === colName)
            ).filter(index => index !== -1)
        }

        hotInstance.value = new Handsontable(hotTableContainer.value, {
            data: props.data,
            columns: columns,
            // --- 核心优化配置 ---
            colHeaders: true,
            rowHeaders: true,
            width: '100%',
            height: '100%', // 配合 flex 布局撑满
            maxRows: props.data.length,
            stretchH: 'all',
            autoWrapRow: true,
            autoWrapCol: true,
            licenseKey: 'non-commercial-and-evaluation',
            
            // 冻结列：冻结前2列（复选框 + 商品名称/编码），根据实际情况调整数字
            fixedColumnsStart: 2, 
            
            // UI 优化
            rowHeights: 36, // 统一行高，更整洁
            headerTooltips: true,
            
            contextMenu: true,
            manualColumnResize: true,
            columnSorting: true,
            sortIndicator: true,
            copyPaste: { enabled: true, pasteMode: 'overwrite' },
            undo: true,
            hiddenColumns: hiddenColumnsPlugin,
            
            cells: function(row, col) {
                const cellProperties = {}
                const colData = columns[col]
                
                if (colData?.data === '__selected') {
                    cellProperties.className = 'htCenter htMiddle checkbox-cell'
                }
                // 商品名称强制不换行，用省略号
                else if (colData?.data === 'product_name' || colData?.data === 'item_name') {
                    cellProperties.className = 'htLeft htMiddle text-ellipsis-cell'
                }
                else if (colData?.readOnly) {
                    cellProperties.className = 'htDimmed'
                }
                return cellProperties
            },
            
            afterChange: handleAfterChange,
            afterSelection: handleAfterSelection,
            afterDeselect: handleAfterDeselect,
        })
		// 新增：强制刷新一次布局，解决某些情况下初始高度为0的问题
		requestAnimationFrame(() => {
            if (hotInstance.value) {
                hotInstance.value.render()
            }
        })
    } catch (error) {
        console.error('❌ Handsontable 初始化失败:', error)
        toast.error('表格初始化失败')
    }
}

// ... (保留原有的 handleAfterChange, handleAfterSelection 等逻辑代码，无需修改) ...
// 注意：为了篇幅，我省略了未修改的逻辑函数（handleAfterChange, selectAll 等），
// 请确保在你的实际文件中保留它们，或者直接复制你原来文件中的 methods 部分到这里。

// 下面是补充的辅助函数（如果原文件没有的话）
const handleAfterChange = (changes, source) => {
    if (!changes || source === 'loadData' || isUpdating.value) return
    changes.forEach(([row, prop, oldValue, newValue]) => {
        if (prop === '__selected') {
            newValue ? selectedRows.value.add(row) : selectedRows.value.delete(row)
        }
    })
    emit('change', changes, source)
    if (source === 'edit' || source === 'CopyPaste.paste') debouncedSave(changes)
}

const handleAfterSelection = debounce((row, column, row2, column2) => {
    if (isUpdating.value) return
    const checkboxColIndex = props.columns.findIndex(col => col.data === '__selected')
    if (column !== checkboxColIndex && column2 !== checkboxColIndex) return
    
    const startRow = Math.min(row, row2)
    const endRow = Math.max(row, row2)
    for (let i = startRow; i <= endRow; i++) {
        const data = hotInstance.value.getDataAtRow(i)
        if (data && data[0]) selectedRows.value.add(i)
    }
    emit('selection-change', Array.from(selectedRows.value))
}, 200)

const handleAfterDeselect = () => {}
const debouncedSave = debounce((changes) => { lastSaveTime.value = new Date() }, 1000)

const selectAll = () => {
    if (!hotInstance.value) return
    const data = hotInstance.value.getData()
    data.forEach((_, index) => {
        hotInstance.value.setDataAtRowProp(index, '__selected', true)
        selectedRows.value.add(index)
    })
    emit('selection-change', Array.from(selectedRows.value))
}

const invertSelection = () => {
    if (!hotInstance.value) return
    const data = hotInstance.value.getData()
    data.forEach((_, index) => {
        const val = hotInstance.value.getDataAtRowProp(index, '__selected')
        hotInstance.value.setDataAtRowProp(index, '__selected', !val)
        !val ? selectedRows.value.add(index) : selectedRows.value.delete(index)
    })
    emit('selection-change', Array.from(selectedRows.value))
}

const clearSelection = () => {
    if (!hotInstance.value) return
    hotInstance.value.getData().forEach((_, index) => {
        hotInstance.value.setDataAtRowProp(index, '__selected', false)
    })
    selectedRows.value.clear()
    emit('selection-change', [])
}

const toggleColumn = (col) => emit('toggle-column', col)

const formatSaveTime = (time) => {
   if (!time) return ''
   const now = new Date(); const diff = Math.floor((now - time) / 1000);
   return diff < 60 ? '刚刚' : diff < 3600 ? `${Math.floor(diff/60)}分钟前` : time.toLocaleTimeString()
}

const updateData = (newData) => {
    if (!hotInstance.value) return
    isUpdating.value = true
    hotInstance.value.loadData(newData)
    setTimeout(() => isUpdating.value = false, 100)
}

const getSelectedRows = () => Array.from(selectedRows.value).map(i => hotInstance.value.getDataAtRow(i))

// ==================== Watchers & Lifecycle ====================
let lastDataHash = ''
watch(() => props.data, (newData) => {
    if (!hotInstance.value || !newData) return
    const newHash = JSON.stringify(newData)
    if (newHash === lastDataHash) return
    lastDataHash = newHash
    updateData(newData)
}, { deep: true })

watch(() => props.hiddenColumns, (newCols) => {
    if (!hotInstance.value) return
    const plugin = hotInstance.value.getPlugin('hiddenColumns')
    plugin.showColumns(plugin.getHiddenColumns())
    const indexes = newCols.map(c => props.columns.findIndex(col => col.data === c)).filter(i => i !== -1)
    if (indexes.length) plugin.hideColumns(indexes)
    hotInstance.value.render()
}, { deep: true })

onMounted(async () => { await nextTick(); initHandsontable() })
onBeforeUnmount(() => { hotInstance.value?.destroy() })

defineExpose({ updateData, getSelectedRows, selectAll, clearSelection, hotInstance })
</script>

<style scoped>
.hot-table-wrapper {
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
}

/* Handsontable 全局样式覆盖 */
:deep(.handsontable) {
    font-size: 13px;
    color: #1f2937;
}

:deep(.handsontable table) {
    border-collapse: separate; /* 更好的边框渲染 */
}

:deep(.handsontable th) {
    background-color: #f9fafb; /* 浅灰背景 */
    color: #4b5563;
    font-weight: 600;
    border-color: #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: middle;
    padding: 0 8px;
    height: 36px; /* 强制表头高度 */
}

:deep(.handsontable td) {
    border-color: #f3f4f6; /* 极浅的边框 */
    vertical-align: middle;
    padding: 0 8px;
}

/* 偶数行斑马纹 - 可选，看喜好 */
/* :deep(.handsontable tbody tr:nth-child(even) td) {
    background-color: #fafafa;
} */

:deep(.handsontable td.htDimmed) {
    color: #9ca3af;
    background-color: #fcfcfc;
}

/* 选中区域样式 - 仿 Excel 绿色/蓝色 */
:deep(.handsontable td.area) {
    background-color: rgba(59, 130, 246, 0.1) !important; /* 蓝色半透明 */
}

:deep(.handsontable td.area::before) {
    display: none; /* 移除默认的选中边框，用 CSS 可能会更好看 */
}

/* Checkbox 列 */
:deep(.handsontable th.checkbox-column),
:deep(.handsontable td.checkbox-cell) {
    text-align: center;
    background-color: #f9fafb; /* 让第一列始终有点背景色，表明它是功能列 */
    border-right: 1px solid #e5e7eb;
}

:deep(.handsontable .htCheckboxRendererInput) {
    margin: 0;
    width: 15px;
    height: 15px;
    cursor: pointer;
    accent-color: #2563eb;
}

/* 文字省略样式 */
:deep(.handsontable td.text-ellipsis-cell) {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
}

/* 冻结列的分隔线阴影 - 增强立体感 */
:deep(.handsontable .ht_clone_left) {
    box-shadow: 4px 0 8px -4px rgba(0, 0, 0, 0.1);
    z-index: 10;
}

/* 淡入动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>