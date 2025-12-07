<template>
	<div class="filter-panel bg-white rounded-lg shadow p-4 mb-4">
		<div class="flex flex-wrap gap-4 items-end">
			<!-- 搜索框 -->
			<div class="flex-1 min-w-[200px]">
				<label class="block text-sm font-medium text-gray-700 mb-1">
					搜索商品
				</label>
				<input
					v-model="localFilters.search"
					type="text"
					placeholder="输入商品编码或名称..."
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					@input="handleFilterChange"
				/>
			</div>

			<!-- 机制筛选 -->
			<div class="w-48">
				<label class="block text-sm font-medium text-gray-700 mb-1">
					机制
				</label>
				<select
					v-model="localFilters.mechanism"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					@change="handleFilterChange"
				>
					<option value="">全部</option>
					<option
						v-for="mechanism in filterOptions.mechanisms"
						:key="mechanism"
						:value="mechanism"
					>
						{{ mechanism }}
					</option>
				</select>
			</div>

			<!-- 分类筛选 -->
			<div class="w-48">
				<label class="block text-sm font-medium text-gray-700 mb-1">
					分类
				</label>
				<select
					v-model="localFilters.category"
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
					@change="handleFilterChange"
				>
					<option value="">全部</option>
					<option
						v-for="category in filterOptions.categories"
						:key="category"
						:value="category"
					>
						{{ category }}
					</option>
				</select>
			</div>

			<!-- 重置按钮 -->
			<div>
				<button
					@click="handleReset"
					class="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
				>
					重置
				</button>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, watch } from 'vue'

// Props
const props = defineProps({
	filters: {
		type: Object,
		default: () => ({
			search: '',
			mechanism: '',
			category: ''
		})
	},
	filterOptions: {
		type: Object,
		default: () => ({
			mechanisms: [],
			categories: []
		})
	}
})

// Emits
const emit = defineEmits(['update:filters'])

// 本地筛选状态
const localFilters = ref({ ...props.filters })

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
		mechanism: '',
		category: ''
	}
	handleFilterChange()
}
</script>

<style scoped>
/* 自定义样式 */
</style>
