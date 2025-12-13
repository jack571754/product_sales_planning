<template>
	<component
		:is="wrapperTag"
		:class="wrapperClass"
	>
		<!-- 左侧：每页显示数量选择 -->
		<div class="pagination-left flex items-center gap-2 flex-shrink-0">
			<span class="text-sm text-gray-600 whitespace-nowrap">每页</span>
			<Select
				v-model="localPageSize"
				:options="pageSizeSelectOptions"
				size="sm"
				@update:model-value="handlePageSizeChange"
			/>
			<span class="text-sm text-gray-600 whitespace-nowrap">条</span>
		</div>

		<!-- 中间：分页信息 -->
		<div class="pagination-center text-sm text-gray-600 whitespace-nowrap flex-shrink-0">
			{{ startIndex }}-{{ endIndex }} / {{ totalItems }}
		</div>

		<!-- 右侧：分页按钮 -->
		<div class="pagination-right flex items-center gap-1 flex-shrink-0">
			<Button
				variant="ghost"
				theme="gray"
				size="sm"
				icon-left="chevrons-left"
				:disabled="currentPage === 1"
				@click="goToPage(1)"
			/>
			<Button
				variant="ghost"
				theme="gray"
				size="sm"
				icon-left="chevron-left"
				:disabled="currentPage === 1"
				@click="goToPage(currentPage - 1)"
			/>
			<div class="flex items-center gap-1">
				<template v-for="page in displayPages" :key="page">
					<Button
						v-if="page !== '...'"
						@click="goToPage(page)"
						size="sm"
						:theme="page === currentPage ? 'blue' : 'gray'"
						:variant="page === currentPage ? 'solid' : 'ghost'"
					>
						{{ page }}
					</Button>
					<span v-else class="px-1 text-gray-500 text-sm">...</span>
				</template>
			</div>
			<Button
				variant="ghost"
				theme="gray"
				size="sm"
				icon-left="chevron-right"
				:disabled="currentPage === totalPages"
				@click="goToPage(currentPage + 1)"
			/>
			<Button
				variant="ghost"
				theme="gray"
				size="sm"
				icon-left="chevrons-right"
				:disabled="currentPage === totalPages"
				@click="goToPage(totalPages)"
			/>
		</div>
	</component>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Card, Button, Select } from 'frappe-ui'

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
		default: () => [20, 50, 100, 200, 500]
	},
	variant: {
		type: String,
		default: 'card' // 'card' | 'embedded'
	}
})

// Emits
const emit = defineEmits(['update:currentPage', 'update:pageSize'])

// 本地状态
const localPageSize = ref(props.pageSize)

// 计算显示的起始和结束索引
const startIndex = computed(() => {
	if (props.totalItems === 0) return 0
	return (props.currentPage - 1) * props.pageSize + 1
})

const endIndex = computed(() => {
	const end = props.currentPage * props.pageSize
	if (props.totalItems === 0) return 0
	return end > props.totalItems ? props.totalItems : end
})

const pageSizeSelectOptions = computed(() =>
	(props.pageSizeOptions || []).map(size => ({ label: `${size}`, value: size }))
)

const wrapperTag = computed(() => (props.variant === 'embedded' ? 'div' : Card))
const wrapperClass = computed(() => {
	const base = 'flex items-center justify-between gap-2 min-w-0 flex-wrap'
	if (props.variant === 'embedded') {
		return `${base} p-3`
	}
	return `${base} p-3`
})

// 计算显示的页码（最多显示 7 个页码）
const displayPages = computed(() => {
	const pages = []
	const total = props.totalPages
	const current = props.currentPage

	if (total <= 7) {
		for (let i = 1; i <= total; i++) {
			pages.push(i)
		}
	} else {
		if (current <= 4) {
			for (let i = 1; i <= 5; i++) {
				pages.push(i)
			}
			pages.push('...')
			pages.push(total)
		} else if (current >= total - 3) {
			pages.push(1)
			pages.push('...')
			for (let i = total - 4; i <= total; i++) {
				pages.push(i)
			}
		} else {
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
	emit('update:currentPage', 1)
}

// 监听 props 变化
watch(() => props.pageSize, (newSize) => {
	localPageSize.value = newSize
})
</script>

<style scoped>
/* 确保分页器容器正确显示 */
.pagination-left,
.pagination-center,
.pagination-right {
	display: flex;
	align-items: center;
}

/* 响应式布局 - 小屏幕时调整 */
@media (max-width: 768px) {
	.pagination-center {
		order: -1;
		width: 100%;
		justify-content: center;
		margin-bottom: 0.5rem;
	}
	
	.pagination-left,
	.pagination-right {
		flex: 1;
	}
}

/* 确保按钮组不会被压缩 */
.pagination-right > div {
	display: flex;
	flex-wrap: nowrap;
}
</style>
