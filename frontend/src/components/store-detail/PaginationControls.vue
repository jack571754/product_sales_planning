<template>
	<div class="pagination-controls bg-white rounded-lg shadow p-4 flex items-center justify-between">
		<!-- 左侧：每页显示数量选择 -->
		<div class="flex items-center gap-2">
			<span class="text-sm text-gray-600">每页显示</span>
			<select
				v-model="localPageSize"
				@change="handlePageSizeChange"
				class="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
			>
				<option
					v-for="size in pageSizeOptions"
					:key="size"
					:value="size"
				>
					{{ size }}
				</option>
			</select>
			<span class="text-sm text-gray-600">条</span>
		</div>

		<!-- 中间：分页信息 -->
		<div class="text-sm text-gray-600">
			显示 {{ startIndex }} - {{ endIndex }} 条，共 {{ totalItems }} 条
		</div>

		<!-- 右侧：分页按钮 -->
		<div class="flex items-center gap-2">
			<!-- 首页 -->
			<button
				@click="goToPage(1)"
				:disabled="currentPage === 1"
				class="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				title="首页"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
				</svg>
			</button>

			<!-- 上一页 -->
			<button
				@click="goToPage(currentPage - 1)"
				:disabled="currentPage === 1"
				class="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				title="上一页"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
			</button>

			<!-- 页码显示 -->
			<div class="flex items-center gap-1">
				<template v-for="page in displayPages" :key="page">
					<button
						v-if="page !== '...'"
						@click="goToPage(page)"
						:class="[
							'px-3 py-1 border rounded-md',
							page === currentPage
								? 'bg-blue-500 text-white border-blue-500'
								: 'border-gray-300 hover:bg-gray-50'
						]"
					>
						{{ page }}
					</button>
					<span v-else class="px-2 text-gray-500">...</span>
				</template>
			</div>

			<!-- 下一页 -->
			<button
				@click="goToPage(currentPage + 1)"
				:disabled="currentPage === totalPages"
				class="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				title="下一页"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</button>

			<!-- 末页 -->
			<button
				@click="goToPage(totalPages)"
				:disabled="currentPage === totalPages"
				class="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
				title="末页"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
				</svg>
			</button>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// Props
const props = defineProps({
	currentPage: {
		type: Number,
		default: 1
	},
	pageSize: {
		type: Number,
		default: 50
	},
	totalItems: {
		type: Number,
		default: 0
	},
	totalPages: {
		type: Number,
		default: 1
	},
	pageSizeOptions: {
		type: Array,
		default: () => [20, 50, 100, 200]
	}
})

// Emits
const emit = defineEmits(['update:currentPage', 'update:pageSize'])

// 本地状态
const localPageSize = ref(props.pageSize)

// 计算显示的起始和结束索引
const startIndex = computed(() => {
	return (props.currentPage - 1) * props.pageSize + 1
})

const endIndex = computed(() => {
	const end = props.currentPage * props.pageSize
	return end > props.totalItems ? props.totalItems : end
})

// 计算显示的页码（最多显示 7 个页码）
const displayPages = computed(() => {
	const pages = []
	const total = props.totalPages
	const current = props.currentPage

	if (total <= 7) {
		// 总页数小于等于 7，显示所有页码
		for (let i = 1; i <= total; i++) {
			pages.push(i)
		}
	} else {
		// 总页数大于 7，显示部分页码
		if (current <= 4) {
			// 当前页在前面
			for (let i = 1; i <= 5; i++) {
				pages.push(i)
			}
			pages.push('...')
			pages.push(total)
		} else if (current >= total - 3) {
			// 当前页在后面
			pages.push(1)
			pages.push('...')
			for (let i = total - 4; i <= total; i++) {
				pages.push(i)
			}
		} else {
			// 当前页在中间
			pages.push(1)
			pages.push('...')
			for (let i = current - 1; i <= current + 1; i++) {
				pages.push(i)
			}
			pages.push('...')
			pages.push(total)
		}
	}

	return pages
})

// 跳转到指定页
const goToPage = (page) => {
	if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
		emit('update:currentPage', page)
	}
}

// 修改每页显示数量
const handlePageSizeChange = () => {
	emit('update:pageSize', localPageSize.value)
	// 重置到第一页
	emit('update:currentPage', 1)
}

// 监听 props 变化
watch(() => props.pageSize, (newSize) => {
	localPageSize.value = newSize
})
</script>

<style scoped>
/* 自定义样式 */
</style>
