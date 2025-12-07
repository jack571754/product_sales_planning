<template>
	<div class="store-detail-page min-h-screen bg-gray-50 p-6">
		<!-- 页面头部 -->
		<div class="page-header mb-6">
			<div class="flex items-center justify-between">
				<!-- 返回按钮和标题 -->
				<div class="flex items-center gap-4">
					<button
						@click="goBack"
						class="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white rounded-md shadow hover:bg-gray-50 transition-colors"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
						返回看板
					</button>
					<div>
						<h1 class="text-2xl font-bold text-gray-900">
							{{ storeInfo.shop_name || storeInfo.name || '店铺详情' }}
						</h1>
						<p class="text-sm text-gray-500 mt-1">
							{{ taskInfo.task_name || taskInfo.name || '' }}
							<span v-if="taskInfo.task_type"> - {{ taskInfo.task_type }}</span>
						</p>
					</div>
				</div>

				<!-- 操作按钮组 -->
				<div class="flex items-center gap-2">
					<button
						v-if="canEdit"
						@click="handleRefresh"
						class="px-4 py-2 text-gray-700 bg-white rounded-md shadow hover:bg-gray-50 transition-colors"
						title="刷新数据"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
						</svg>
					</button>
				</div>
			</div>
		</div>

		<!-- 加载状态 -->
		<div v-if="loading" class="flex items-center justify-center py-20">
			<div class="text-center">
				<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
				<div class="mt-4 text-gray-600">正在加载数据...</div>
			</div>
		</div>

		<!-- 错误状态 -->
		<div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
			<div class="text-red-600 text-lg font-medium">{{ error }}</div>
			<button
				@click="handleRefresh"
				class="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
			>
				重试
			</button>
		</div>

		<!-- 主内容区 -->
		<div v-else class="space-y-4">
			<!-- 统计卡片 -->
			<StatsCards :statistics="statistics" />

			<!-- 筛选面板 -->
			<FilterPanel
				:filters="filters"
				:filter-options="filterOptions"
				@update:filters="updateFilters"
			/>

			<!-- 表格 -->
			<CommodityTable
				:data="transformDataForTable()"
				:columns="generateColumns()"
				:headers="generateHeaders()"
				:can-edit="canEdit"
				:loading="loading"
				:error="error"
				@data-change="handleDataChange"
			/>

			<!-- 分页控件 -->
			<PaginationControls
				:current-page="pagination.currentPage"
				:page-size="pagination.pageSize"
				:total-items="filteredCommodities.length"
				:total-pages="totalPages"
				:page-size-options="pagination.pageSizeOptions"
				@update:current-page="updatePagination({ currentPage: $event })"
				@update:page-size="updatePagination({ pageSize: $event })"
			/>
		</div>
	</div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStoreDetail } from '../composables/useStoreDetail'
import CommodityTable from '../components/store-detail/CommodityTable.vue'
import FilterPanel from '../components/store-detail/FilterPanel.vue'
import StatsCards from '../components/store-detail/StatsCards.vue'
import PaginationControls from '../components/store-detail/PaginationControls.vue'

// Props
const props = defineProps({
	storeId: {
		type: String,
		required: true
	},
	taskId: {
		type: String,
		required: true
	}
})

// Router
const router = useRouter()

// 使用 useStoreDetail composable
const {
	filters,
	pagination,
	filteredCommodities,
	paginatedCommodities,
	months,
	storeInfo,
	taskInfo,
	canEdit,
	approvalStatus,
	statistics,
	totalPages,
	loading,
	error,
	filterOptions,
	refreshData,
	updateFilters,
	updatePagination,
	saveMonthQuantity,
	batchSaveChanges,
	generateColumns,
	generateHeaders,
	transformDataForTable
} = useStoreDetail(props.storeId, props.taskId)

// 返回看板
const goBack = () => {
	router.push('/')
}

// 刷新数据
const handleRefresh = async () => {
	await refreshData()
}

// 处理表格数据变化
const handleDataChange = async (changes, source) => {
	console.log('Data changed:', changes, source)

	// 批量保存变更
	if (changes && changes.length > 0) {
		const result = await batchSaveChanges(changes)
		if (result.success) {
			console.log('保存成功')
			// 可以显示成功提示
		} else {
			console.error('保存失败:', result.message)
			// 可以显示错误提示
		}
	}
}
</script>

<style scoped>
/* 自定义样式 */
.store-detail-page {
	max-width: 1920px;
	margin: 0 auto;
}
</style>
