<template>
	<Card class="commodity-table-wrapper overflow-hidden">
		<!-- 表格标题栏 -->
		<div class="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
			<div class="flex items-center gap-2">
				<FeatherIcon name="table" class="w-4 h-4 text-gray-500" />
				<span class="text-sm font-medium text-gray-900">商品明细表</span>
			</div>
			<div class="flex items-center gap-2">
				<Badge v-if="loading" theme="blue" variant="subtle">
					<template #prefix>
						<div class="h-3 w-3 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600"></div>
					</template>
					加载中...
				</Badge>
				<Badge v-else-if="error" theme="red" variant="subtle">
					<template #prefix><FeatherIcon name="alert-circle" class="h-3 w-3" /></template>
					错误
				</Badge>
				<Badge v-else-if="selectedCount > 0" theme="red" variant="subtle">
					<template #prefix><FeatherIcon name="check-square" class="h-3 w-3" /></template>
					已选 {{ selectedCount }}
				</Badge>
				<Badge v-else-if="!canEdit" theme="gray" variant="subtle">
					<template #prefix><FeatherIcon name="lock" class="h-3 w-3" /></template>
					只读
				</Badge>
				<Badge v-else theme="green" variant="subtle">
					<template #prefix><FeatherIcon name="check" class="h-3 w-3" /></template>
					就绪
				</Badge>
			</div>
		</div>

		<!-- 加载状态 -->
		<div v-if="loading" class="flex items-center justify-center py-12 text-gray-600 gap-3">
			<Spinner class="w-5 h-5 text-blue-600" />
			<span class="text-sm">正在加载表格数据...</span>
		</div>

		<!-- 错误状态 -->
		<div v-else-if="error" class="flex flex-col items-center justify-center py-12 gap-3">
			<FeatherIcon name="alert-circle" class="w-8 h-8 text-red-500" />
			<div class="text-sm text-red-600">{{ errorMessage }}</div>
		</div>

		<!-- 空状态 -->
		<div v-else-if="!normalizedData || normalizedData.length === 0" class="flex flex-col items-center justify-center py-16 gap-3">
			<FeatherIcon name="inbox" class="w-12 h-12 text-gray-300" />
			<div class="text-sm text-gray-500">暂无商品数据</div>
			<div class="text-xs text-gray-400">请使用上方按钮导入或添加商品</div>
		</div>

		<!-- Handsontable 容器 -->
		<div v-else class="handsontable-wrapper p-4">
			<div
				ref="tableContainer"
				class="handsontable-container"
				style="height: 600px; overflow: hidden;"
			></div>
		</div>

		<!-- 使用提示 -->
		<div v-if="!loading && !error && normalizedData && normalizedData.length > 0"
			class="border-t border-gray-100 px-5 py-3 bg-blue-50">
			<div class="flex items-start gap-2">
				<FeatherIcon name="info" class="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
				<div class="text-xs text-blue-800 space-y-1">
					<p class="font-medium">操作提示：</p>
					<ul class="list-disc list-inside space-y-0.5 text-blue-700">
						<li>双击单元格可编辑内容</li>
						<li>点击列标题可排序，右键列标题可筛选</li>
						<li>使用 Ctrl+C / Ctrl+V 复制粘贴数据</li>
						<li>左侧前3列为固定列，横向滚动时保持可见</li>
					</ul>
				</div>
			</div>
		</div>
	</Card>
</template>

<script setup>
import { ref, watch, computed, toRaw, nextTick } from 'vue'
import { Card, Spinner, Badge, FeatherIcon, Button } from 'frappe-ui'
import { useHandsontable } from '../../composables/useHandsontable'

// Props
const props = defineProps({
	data: {
		type: Array,
		default: () => []
	},
	columns: {
		type: Array,
		default: () => []
	},
	headers: {
		type: Array,
		default: () => []
	},
	canEdit: {
		type: Boolean,
		default: false
	},
	loading: {
		type: Boolean,
		default: false
	},
	error: {
		type: [String, Object],
		default: null
	},
	selectedCount: {
		type: Number,
		default: 0
	}
})

// Emits
const emit = defineEmits(['dataChange', 'selection', 'selectionChange', 'refresh'])

// Refs
const tableContainer = ref(null)

// 规范化数据，避免将 Vue Proxy 直接传入 Handsontable
const normalizedData = computed(() => {
	const data = props.data
	
	console.log('🔄 Normalizing data:', {
		hasData: !!data,
		isArray: Array.isArray(data),
		length: data?.length,
		dataType: typeof data,
		sampleRow: data?.[0]
	})
	
	if (!data) {
		console.warn('⚠️ Data is null or undefined')
		return []
	}
	
	if (!Array.isArray(data)) {
		console.warn('⚠️ Data is not an array:', typeof data, data)
		return []
	}
	
	if (data.length === 0) {
		console.log('ℹ️ Data array is empty')
		return []
	}
	
	// 深度清理响应式包装
	const normalized = data.map(row => {
		const rawRow = toRaw(row)
		const plainRow = {}
		for (const key in rawRow) {
			if (Object.prototype.hasOwnProperty.call(rawRow, key)) {
				plainRow[key] = toRaw(rawRow[key])
			}
		}
		return plainRow
	})
	
	console.log('✅ Normalized data for table:', {
		rowCount: normalized.length,
		columnCount: Object.keys(normalized[0] || {}).length,
		firstRow: normalized[0]
	})
	
	return normalized
})

const normalizedColumns = computed(() => {
	const cols = props.columns
	if (!Array.isArray(cols)) {
		console.warn('⚠️ Columns is not an array:', cols)
		return []
	}
	return cols.map(col => ({ ...toRaw(col) }))
})

const normalizedHeaders = computed(() => {
	const headers = props.headers
	if (!Array.isArray(headers)) {
		console.warn('⚠️ Headers is not an array:', headers)
		return []
	}
	return [...headers]
})
const errorMessage = computed(() => {
	if (!props.error) return ''
	if (typeof props.error === 'string') return props.error
	return props.error?.message || '加载失败'
})

// 数据变化处理
const handleDataChange = (changes, source) => {
	console.log('Table data changed:', changes, source)
	emit('dataChange', changes, source)
}

// 选择变化处理
const handleSelection = (row, col, row2, col2) => {
	emit('selection', row, col, row2, col2)
}

// 选择变化处理（新增）
const handleSelectionChange = (selectedRowIndices) => {
	console.log('Selection changed:', selectedRowIndices)
	emit('selectionChange', selectedRowIndices)
}

// 初始化 Handsontable
const {
	hotInstance,
	loading: hotLoading,
	updateColumns,
	updateData,
	getSelectedRows,
	clearSelection,
	selectAllRows
} = useHandsontable(tableContainer, {
	data: normalizedData,
	columns: normalizedColumns,
	colHeaders: normalizedHeaders,
	rowHeaders: true,
	fixedColumnsLeft: 3,
	contextMenu: true,
	dropdownMenu: true,
	filters: true,
	columnSorting: true,
	onDataChange: handleDataChange,
	onSelection: handleSelection,
	onSelectionChange: handleSelectionChange,
	config: {
		readOnly: computed(() => !props.canEdit)
	}
})

// 🔧 移除重复的 watch - useHandsontable 内部已经有 watch 监听数据变化
// 重复的 watch 会导致时序问题，因为 CommodityTable 的 watch 可能在 Handsontable 实例创建之前触发
// useHandsontable 的 watch 会在实例准备好后自动更新数据

// 监听列变化，保持表格配置同步
watch(
	() => normalizedColumns.value,
	(newColumns) => {
		console.log('📊 Columns changed, updating table:', newColumns?.length, 'columns')
		if (newColumns && newColumns.length > 0 && hotInstance.value && !hotLoading.value) {
			nextTick(() => {
				updateColumns(newColumns)
			})
		}
	},
	{ deep: false }
)

// 监听表头变化，保持列头同步
watch(
	() => normalizedHeaders.value,
	(newHeaders) => {
		console.log('📊 Headers changed, updating table:', newHeaders?.length, 'headers')
		if (newHeaders && newHeaders.length > 0 && hotInstance.value && !hotLoading.value) {
			nextTick(() => {
				hotInstance.value.updateSettings({ colHeaders: newHeaders })
			})
		}
	},
	{ deep: false }
)

// 暴露方法给父组件
defineExpose({
	hotInstance,
	updateData,
	getSelectedRows,
	clearSelection,
	selectAllRows
})
</script>

<style scoped>
.commodity-table-wrapper {
	width: 100%;
	overflow: hidden;
	position: relative;
}

.handsontable-wrapper {
	width: 100%;
	position: relative;
	background: white;
}

.handsontable-container {
	width: 100%;
}

/* Handsontable 样式优化 - 参照 HandsontableDemo */
:deep(.handsontable) {
	font-size: 13px;
	position: relative;
}

/* 表格单元格样式 */
:deep(.handsontable td) {
	border-color: #e5e7eb;
	padding: 6px 8px;
}

/* 表头样式 */
:deep(.handsontable th) {
	background-color: #f9fafb;
	font-weight: 600;
	color: #374151;
	border-color: #e5e7eb;
}

/* 行标题样式 */
:deep(.handsontable .ht__highlight) {
	background-color: #eff6ff;
}

/* 选中单元格样式 */
:deep(.handsontable .area) {
	background-color: rgba(59, 130, 246, 0.1);
}

/* 当前选中单元格边框 */
:deep(.handsontable .current.area) {
	border: 2px solid #3b82f6;
}

/* 固定列分隔线 */
:deep(.handsontable .ht_clone_left) {
	border-right: 2px solid #d1d5db;
}

/* 只读单元格样式 */
:deep(.handsontable .htDimmed) {
	color: #9ca3af;
	background-color: #f9fafb;
}

/* 下拉菜单和右键菜单 z-index 控制 */
:deep(.handsontable .htDropdownMenu),
:deep(.handsontable .htContextMenu) {
	z-index: 999 !important;
	box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* 筛选图标样式 */
:deep(.handsontable .changeType) {
	color: #3b82f6;
}

/* 排序指示器样式 */
:deep(.handsontable .columnSorting) {
	color: #3b82f6;
}

/* 隔离层叠上下文，避免与 Dialog 冲突 */
:deep(.handsontable) {
	isolation: isolate;
}

/* 滚动条样式优化 */
:deep(.handsontable .wtHolder) {
	scrollbar-width: thin;
	scrollbar-color: #d1d5db #f3f4f6;
}

:deep(.handsontable .wtHolder::-webkit-scrollbar) {
	width: 8px;
	height: 8px;
}

:deep(.handsontable .wtHolder::-webkit-scrollbar-track) {
	background: #f3f4f6;
	border-radius: 4px;
}

:deep(.handsontable .wtHolder::-webkit-scrollbar-thumb) {
	background: #d1d5db;
	border-radius: 4px;
}

:deep(.handsontable .wtHolder::-webkit-scrollbar-thumb:hover) {
	background: #9ca3af;
}

/* 复制粘贴区域样式 */
:deep(.handsontable .copyBorder) {
	border: 2px dashed #3b82f6;
}

/* 填充手柄样式 */
:deep(.handsontable .wtBorder.corner) {
	background-color: #3b82f6;
	border: 1px solid #2563eb;
}
</style>
