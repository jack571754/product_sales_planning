<template>
	<Card class="p-4">
		<div class="flex flex-wrap gap-4 items-end">
			<!-- 搜索框 -->
			<div class="flex-1 min-w-[240px]">
				<Input
					v-model="localFilters.search"
					label="搜索商品"
					:disabled="loading"
					placeholder="输入商品编码或名称..."
					@update:model-value="handleFilterChange"
				>
					<template #prefix>
						<FeatherIcon name="search" class="w-4 h-4 text-gray-400" />
					</template>
				</Input>
			</div>

			<!-- 分类筛选 -->
			<div class="w-56">
				<Select
					v-model="localFilters.category"
					label="分类"
					:options="categoryOptions"
					:disabled="loading"
					placeholder="全部"
					@update:model-value="handleFilterChange"
				/>
			</div>

			<!-- 重置按钮 -->
			<div class="flex items-center gap-2">
				<Button
					variant="subtle"
					theme="gray"
					icon-left="rotate-ccw"
					:loading="loading"
					@click="handleReset"
				>
					重置
				</Button>
				<Badge v-if="activeFilterCount > 0" theme="blue" size="sm">
					已应用 {{ activeFilterCount }} 项筛选
				</Badge>
			</div>
		</div>

		<div v-if="activeFilterCount > 0" class="mt-3 flex flex-wrap gap-2">
			<Badge v-if="localFilters.search" theme="gray" size="sm">
				搜索: {{ localFilters.search }}
			</Badge>
			<Badge v-if="localFilters.category" theme="gray" size="sm">
				分类: {{ localFilters.category }}
			</Badge>
		</div>
	</Card>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Card, Input, Select, Button, Badge, FeatherIcon } from 'frappe-ui'

// Props
const props = defineProps({
	filters: {
		type: Object,
		default: () => ({
			search: '',
			category: ''
		})
	},
	filterOptions: {
		type: Object,
		default: () => ({
			mechanisms: [],
			categories: []
		})
	},
	loading: {
		type: Boolean,
		default: false
	}
})

// Emits
const emit = defineEmits(['update:filters'])

// 本地筛选状态
const localFilters = ref({ ...props.filters })

// 分类选项
const categoryOptions = computed(() => {
	const options = props.filterOptions?.categories || []
	return [
		{ label: '全部', value: '' },
		...options.map(item => ({ label: item, value: item }))
	]
})

// 已激活的筛选计数
const activeFilterCount = computed(() => {
	let count = 0
	if (localFilters.value.search) count += 1
	if (localFilters.value.category) count += 1
	return count
})

// 监听 props 变化
watch(() => props.filters, (newFilters) => {
	localFilters.value = { ...newFilters }
}, { deep: true })

// 处理筛选变化
const handleFilterChange = () => {
	emit('update:filters', { ...localFilters.value })
}

// 重置筛选
const handleReset = () => {
	localFilters.value = {
		search: '',
		category: ''
	}
	handleFilterChange()
}
</script>
