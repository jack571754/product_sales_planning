<template>
	<div class="h-full w-full relative overflow-hidden">
		<div ref="hotTableContainer" class="hot-table-wrapper absolute inset-0"></div>
	</div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { toast } from 'frappe-ui'
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
const emit = defineEmits(['change', 'selection-change'])

// ==================== Refs ====================
const hotTableContainer = ref(null)
const hotInstance = ref(null)
const selectedRows = ref(new Set())
const isUpdating = ref(false)

// ==================== Methods ====================

const getCheckboxColIndex = () => props.columns.findIndex((col) => col.data === '__selected')

const buildHotSettings = () => {
	const colHeaders = props.columns.map((col) => (col.title === undefined ? col.data : col.title))
	const columns = props.columns.map((col) => {
		const config = {
			data: col.data,
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

	return { colHeaders, columns }
}

const applyHiddenColumns = () => {
	const hot = hotInstance.value
	if (!hot) return

	const plugin = hot.getPlugin('hiddenColumns')
	if (!plugin) return

	plugin.showColumns(plugin.getHiddenColumns())
	const indexes = (props.hiddenColumns || [])
		.map((c) => props.columns.findIndex((col) => col.data === c))
		.filter((i) => i !== -1)
	if (indexes.length) plugin.hideColumns(indexes)
	hot.render?.()
}

const withBatch = (fn) => {
	const hot = hotInstance.value
	if (!hot) return
	if (typeof hot.batch === 'function') return hot.batch(fn)
	return fn()
}

const withSuspendRender = (fn) => {
	const hot = hotInstance.value
	if (!hot) return
	if (typeof hot.suspendRender !== 'function' || typeof hot.resumeRender !== 'function') return fn()
	hot.suspendRender()
	try {
		return fn()
	} finally {
		hot.resumeRender()
	}
}

const initHandsontable = () => {
	if (!hotTableContainer.value || hotInstance.value) return

	try {
		const { colHeaders, columns } = buildHotSettings()

		const hiddenColumnsPlugin = {
			columns: props.hiddenColumns
				.map((colName) => props.columns.findIndex((col) => col.data === colName))
				.filter((index) => index !== -1)
		}

		hotInstance.value = new Handsontable(hotTableContainer.value, {
			data: props.data,
			columns,
			colHeaders,
			rowHeaders: true,
			width: '100%',
			height: '100%',
			stretchH: 'all',
			autoWrapRow: true,
			autoWrapCol: true,
			licenseKey: 'non-commercial-and-evaluation',

			fixedColumnsStart: 2,
			rowHeights: 36,
			headerTooltips: true,

			contextMenu: true,
			manualColumnResize: true,
			columnSorting: true,
			sortIndicator: true,
			copyPaste: { enabled: true, pasteMode: 'overwrite' },
			undo: true,
			hiddenColumns: hiddenColumnsPlugin,

			cells(row, col) {
				const cellProperties = {}
				const colData = columns[col]

				if (colData?.data === '__selected') {
					cellProperties.className = 'htCenter htMiddle checkbox-cell'
				} else if (
					['product_name', 'item_name', 'name1', 'commodity_name', 'product_title'].includes(colData?.data)
				) {
					cellProperties.className = 'htLeft htMiddle text-ellipsis-cell'
				} else if (colData?.readOnly) {
					cellProperties.className = 'htDimmed'
				}
				return cellProperties
			},

			afterChange: handleAfterChange,
			afterSelection: handleAfterSelection,
			afterDeselect: handleAfterDeselect,
			afterOnCellMouseDown: handleCellMouseDown
		})

			syncSelectionFromData(props.data)

			requestAnimationFrame(() => {
				hotInstance.value?.render?.()
			})
	} catch (error) {
		console.error('❌ Handsontable 初始化失败:', error)
		toast.error('表格初始化失败')
	}
}

const handleAfterChange = (changes, source) => {
	if (!changes || source === 'loadData' || isUpdating.value) return

	let selectionChanged = false
	const dataChanges = []

	changes.forEach(([row, prop, oldValue, newValue]) => {
		// 勾选列只更新选择状态，不触发保存逻辑
		if (prop === '__selected') {
			selectionChanged = true
			newValue ? selectedRows.value.add(row) : selectedRows.value.delete(row)
			return
		}

		const colIndex = typeof prop === 'number' ? prop : props.columns.findIndex((col) => col.data === prop)
		if (colIndex === -1) return
		dataChanges.push([row, colIndex, oldValue, newValue])
	})

	if (selectionChanged) emit('selection-change', Array.from(selectedRows.value))
	if (dataChanges.length) emit('change', dataChanges, source)
}

const handleAfterSelection = debounce((row, column, row2, column2) => {
	if (isUpdating.value) return
	const checkboxColIndex = getCheckboxColIndex()
	if (column !== checkboxColIndex && column2 !== checkboxColIndex) return

	const startRow = Math.min(row, row2)
	const endRow = Math.max(row, row2)
	for (let i = startRow; i <= endRow; i++) {
		const checked = hotInstance.value?.getDataAtRowProp(i, '__selected')
		if (checked) selectedRows.value.add(i)
	}
	emit('selection-change', Array.from(selectedRows.value))
}, 200)

const handleCellMouseDown = (event, coords) => {
	if (!hotInstance.value || isUpdating.value) return
	if (!coords || coords.row < 0) return

	// 点击行号（row header）时切换勾选状态，避免“点击无反应”
	if (coords.col === -1) {
		const current = !!hotInstance.value.getDataAtRowProp(coords.row, '__selected')
		hotInstance.value.setDataAtRowProp(coords.row, '__selected', !current, 'selection')
	}
}

const handleAfterDeselect = () => {}

const applySelectionChanges = (rowValues) => {
	const hot = hotInstance.value
	if (!hot || !Array.isArray(rowValues) || rowValues.length === 0) return

	const changes = rowValues.map(([row, value]) => [row, '__selected', value])

	isUpdating.value = true
	try {
		withBatch(() =>
			withSuspendRender(() => {
				// setDataAtRowProp 支持批量形式（不同版本如不支持则 fallback）
				try {
					hot.setDataAtRowProp(changes, 'selection')
				} catch (err) {
					const checkboxColIndex = getCheckboxColIndex()
					if (checkboxColIndex >= 0 && typeof hot.setDataAtCell === 'function') {
						const cellChanges = rowValues.map(([row, value]) => [row, checkboxColIndex, value])
						hot.setDataAtCell(cellChanges, 'selection')
					} else {
						rowValues.forEach(([row, value]) => {
							hot.setDataAtRowProp(row, '__selected', value, 'selection')
						})
					}
				}
			})
		)
	} finally {
		isUpdating.value = false
	}

	hot.render?.()
}

const selectAll = () => {
	const hot = hotInstance.value
	if (!hot) return

	const rowCount = hot.countRows?.() ?? props.data.length
	const nextSelected = new Set()
	const rowValues = []

	for (let i = 0; i < rowCount; i++) {
		nextSelected.add(i)
		rowValues.push([i, true])
	}

	applySelectionChanges(rowValues)
	selectedRows.value = nextSelected
	emit('selection-change', Array.from(selectedRows.value))
}

const invertSelection = () => {
	const hot = hotInstance.value
	if (!hot) return

	const rowCount = hot.countRows?.() ?? props.data.length
	const checkboxColIndex = getCheckboxColIndex()
	const currentValues =
		checkboxColIndex >= 0 && typeof hot.getDataAtCol === 'function' ? hot.getDataAtCol(checkboxColIndex) : []

	const nextSelected = new Set()
	const rowValues = []

	for (let i = 0; i < rowCount; i++) {
		const current = !!(currentValues?.[i] ?? hot.getDataAtRowProp?.(i, '__selected'))
		const next = !current
		rowValues.push([i, next])
		if (next) nextSelected.add(i)
	}

	applySelectionChanges(rowValues)
	selectedRows.value = nextSelected
	emit('selection-change', Array.from(selectedRows.value))
}

const clearSelection = () => {
	const hot = hotInstance.value
	if (!hot) return

	const rowCount = hot.countRows?.() ?? props.data.length
	const rowValues = []
	for (let i = 0; i < rowCount; i++) rowValues.push([i, false])

	applySelectionChanges(rowValues)
	selectedRows.value = new Set()
	emit('selection-change', [])
}

const syncSelectionFromData = (data) => {
	const nextSelected = new Set()
	;(data || []).forEach((row, index) => {
		if (row && row.__selected) nextSelected.add(index)
	})
	const prevSelected = selectedRows.value
	const isSame =
		prevSelected.size === nextSelected.size && Array.from(prevSelected).every((index) => nextSelected.has(index))

	if (isSame) return

	selectedRows.value = nextSelected
	emit('selection-change', Array.from(selectedRows.value))
}

const updateData = (newData) => {
	if (!hotInstance.value) return
	const safeData = Array.isArray(newData) ? newData : []
	isUpdating.value = true
	try {
		hotInstance.value.loadData(safeData)
		syncSelectionFromData(safeData)
	} finally {
		setTimeout(() => (isUpdating.value = false), 0)
	}
}

const getSelectedRows = () => Array.from(selectedRows.value).map(i => hotInstance.value.getDataAtRow(i))

// ==================== Watchers & Lifecycle ====================
watch(
	() => props.data,
	(newData) => {
		if (!hotInstance.value) return
		updateData(newData)
	}
)

watch(
	() => [props.columns, props.readOnly, props.canEdit],
	() => {
		const hot = hotInstance.value
		if (!hot) return
		const { colHeaders, columns } = buildHotSettings()

		isUpdating.value = true
		try {
			withBatch(() =>
				withSuspendRender(() => {
					hot.updateSettings({ colHeaders, columns })
				})
			)
			applyHiddenColumns()
		} finally {
			setTimeout(() => (isUpdating.value = false), 0)
		}
	},
	{ deep: true }
)

watch(() => props.hiddenColumns, (newCols) => {
	if (!hotInstance.value) return
	applyHiddenColumns()
}, { deep: true })

onMounted(async () => { await nextTick(); initHandsontable() })
onBeforeUnmount(() => {
	try {
		hotInstance.value?.destroy?.()
	} finally {
		hotInstance.value = null
	}
})

defineExpose({ updateData, getSelectedRows, selectAll, invertSelection, clearSelection, hotInstance })
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
}

/* 淡入动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
