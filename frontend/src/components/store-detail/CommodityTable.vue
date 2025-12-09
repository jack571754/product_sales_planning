<template>
	<div class="commodity-table-wrapper">
		<!-- 加载状态 -->
		<div v-if="loading" class="flex items-center justify-center py-12">
			<div class="text-gray-500">正在加载表格数据...</div>
		</div>

		<!-- 错误状态 -->
		<div v-else-if="error" class="flex items-center justify-center py-12">
			<div class="text-red-500">{{ error }}</div>
		</div>

		<!-- Handsontable 容器 -->
		<div v-else class="handsontable-container">
			<div ref="tableContainer" class="w-full"></div>
		</div>
	</div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
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
		type: String,
		default: null
	}
})

// Emits
const emit = defineEmits(['dataChange', 'selection'])

// Refs
const tableContainer = ref(null)

// 数据变化处理
const handleDataChange = (changes, source) => {
	console.log('Table data changed:', changes, source)
	emit('dataChange', changes, source)
}

// 选择变化处理
const handleSelection = (row, col, row2, col2) => {
	emit('selection', row, col, row2, col2)
}

// 初始化 Handsontable
const {
	hotInstance,
	loading: hotLoading,
	error: hotError,
	updateData
} = useHandsontable(tableContainer, {
	data: computed(() => props.data),
	columns: computed(() => props.columns),
	colHeaders: computed(() => props.headers),
	onDataChange: handleDataChange,
	onSelection: handleSelection,
	config: {
		readOnly: computed(() => !props.canEdit)
	}
})

// 监听数据变化
watch(() => props.data, (newData) => {
	if (newData && hotInstance.value && !hotLoading.value) {
		updateData(newData)
	}
}, { deep: true })

// 暴露方法给父组件
defineExpose({
	hotInstance,
	updateData
})
</script>

<style scoped>
.commodity-table-wrapper {
	width: 100%;
	height: 100%;
	overflow: auto;
	position: relative;
	z-index: 1; /* 设置较低的 z-index */
}

.handsontable-container {
	width: 100%;
	min-height: 400px;
	position: relative;
	z-index: 1; /* 确保表格容器在较低层级 */
}

/* Handsontable 样式调整 */
:deep(.handsontable) {
	font-size: 13px;
	position: relative;
	z-index: 1;
}

/* 确保 Handsontable 的下拉菜单和右键菜单不会超过对话框 */
:deep(.handsontable .htDropdownMenu),
:deep(.handsontable .htContextMenu) {
	z-index: 100 !important; /* 低于对话框的 9999 */
}

:deep(.handsontable td) {
	padding: 4px 6px;
}

:deep(.handsontable th) {
	background-color: #f3f4f6;
	font-weight: 600;
	color: #374151;
}

:deep(.handsontable .htDimmed) {
	color: #9ca3af;
}
</style>
