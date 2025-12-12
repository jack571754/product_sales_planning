<template>
	<Card class="overflow-hidden">
		<div class="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
			<div class="flex items-center gap-2 text-sm font-semibold text-gray-700">
				<FeatherIcon name="settings" class="w-4 h-4" />
				列显示设置
				<Badge v-if="hiddenCount > 0" theme="gray" size="sm">
					隐藏 {{ hiddenCount }}
				</Badge>
				<Badge v-if="hasSelection" theme="red" size="sm">
					已选 {{ selectedCount }}
				</Badge>
			</div>
			<div class="flex items-center gap-2">
				<Button
					v-if="hasSelection && canEdit"
					variant="solid"
					theme="red"
					size="sm"
					icon-left="trash"
					@click="handleBatchDelete"
				>
					批量删除
				</Button>
				<Button
					variant="outline"
					theme="gray"
					size="sm"
					icon-left="sliders"
					@click="togglePanel"
				>
					{{ isPanelOpen ? '收起' : '管理列' }}
				</Button>
			</div>
		</div>

		<transition
			enter-active-class="transition-all duration-200 ease-out"
			enter-from-class="max-h-0 opacity-0"
			enter-to-class="max-h-[480px] opacity-100"
			leave-active-class="transition-all duration-200 ease-in"
			leave-from-class="max-h-[480px] opacity-100"
			leave-to-class="max-h-0 opacity-0"
		>
			<div v-show="isPanelOpen" class="p-4 overflow-hidden">
				<div class="mb-3 pb-3 border-b border-gray-100 flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Checkbox
							:model-value="allColumnsVisible"
							@change="toggleAllColumns"
						/>
						<span class="text-sm font-semibold text-gray-700">全选/取消全选</span>
					</div>
					<Button variant="ghost" theme="gray" size="sm" icon-left="refresh-ccw" @click="resetSettings">
						重置
					</Button>
				</div>

				<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
					<div
						v-for="column in visibleColumns"
						:key="column.originalIndex"
						class="flex items-center gap-2 p-2 border border-gray-100 rounded hover:bg-gray-50"
					>
						<Checkbox
							:model-value="!isColumnHidden(column.originalIndex)"
							@change="toggleColumn(column.originalIndex)"
						/>
						<span class="text-xs text-gray-700 truncate">{{ column.title || column.data }}</span>
					</div>
				</div>

				<div class="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
					<Button variant="subtle" theme="gray" size="sm" @click="closePanel">
						完成
					</Button>
				</div>
			</div>
		</transition>
	</Card>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Card, Button, Checkbox, FeatherIcon, Badge } from 'frappe-ui'
import { useColumnSettings } from '../../composables/useColumnSettings'

// Props
const props = defineProps({
	columns: {
		type: Array,
		required: true,
		default: () => []
	},
	hasSelection: {
		type: Boolean,
		default: false
	},
	selectedCount: {
		type: Number,
		default: 0
	},
	canEdit: {
		type: Boolean,
		default: false
	}
})

// Emits
const emit = defineEmits(['update:hidden-columns', 'batch-delete'])

// 使用列设置 composable
const {
	hiddenColumns,
	toggleColumn: toggleColumnSetting,
	isColumnHidden,
	showAllColumns,
	hideAllColumns,
	resetColumnSettings
} = useColumnSettings()

// 面板展开状态
const isPanelOpen = ref(false)

// 计算属性：过滤掉内部使用的列（如 __selected）
const visibleColumns = computed(() => {
	return props.columns
		.map((column, index) => ({
			...column,
			originalIndex: index
		}))
		.filter(column => {
			// 过滤掉内部使用的列
			const data = column.data
			return data !== '__selected' && !data?.startsWith('__')
		})
})

// 计算属性：是否所有列都可见
const allColumnsVisible = computed(() => hiddenColumns.value.length === 0)

const hiddenCount = computed(() => hiddenColumns.value.length)

// 切换面板展开/折叠
const togglePanel = () => {
	isPanelOpen.value = !isPanelOpen.value
}

// 关闭面板
const closePanel = () => {
	isPanelOpen.value = false
}

// 切换列显示/隐藏
const toggleColumn = (columnIndex) => {
	toggleColumnSetting(columnIndex)
	emit('update:hidden-columns', hiddenColumns.value)
}

// 全选/取消全选
const toggleAllColumns = () => {
	if (allColumnsVisible.value) {
		hideAllColumns([0, 1])
	} else {
		showAllColumns()
	}
	emit('update:hidden-columns', hiddenColumns.value)
}

// 重置设置
const resetSettings = () => {
	resetColumnSettings()
	emit('update:hidden-columns', hiddenColumns.value)
}

// 处理批量删除
const handleBatchDelete = () => {
	emit('batch-delete')
}
</script>
