<template>
	<Card class="p-2">
		<div class="flex flex-wrap gap-2 items-center">
			<!-- 搜索框 - 无 label，更紧凑 -->
			<div class="flex-1 min-w-[200px] max-w-[320px]">
				<Input
					v-model="localFilters.search"
					:disabled="loading"
					placeholder="搜索商品编码或名称..."
					@update:model-value="handleFilterChange"
					size="sm"
				>
					<template #prefix>
						<FeatherIcon name="search" class="w-4 h-4 text-gray-400" />
					</template>
				</Input>
			</div>

			<!-- 分类筛选 - 无 label，更紧凑 -->
			<div class="w-40">
				<Select
					v-model="localFilters.category"
					:options="categoryOptions"
					:disabled="loading"
					placeholder="选择分类"
					@update:model-value="handleFilterChange"
					size="sm"
				/>
			</div>

			<!-- 重置按钮和筛选计数 -->
			<Button
				variant="subtle"
				theme="gray"
				icon-left="rotate-ccw"
				:loading="loading"
				@click="handleReset"
				size="sm"
			>
				重置
			</Button>
			
			<Badge v-if="activeFilterCount > 0" theme="blue" size="sm">
				{{ activeFilterCount }} 项筛选
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
