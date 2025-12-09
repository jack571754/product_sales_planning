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
						@click="showImportDialog = true"
						class="px-4 py-2 text-blue-700 bg-blue-50 rounded-md shadow hover:bg-blue-100 transition-colors"
						title="单品导入"
					>
						<svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
						</svg>
						单品导入
					</button>
					<button
						v-if="canEdit"
						@click="showAddDialog = true"
						class="px-4 py-2 text-purple-700 bg-purple-50 rounded-md shadow hover:bg-purple-100 transition-colors"
						title="添加商品"
					>
						<svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
						</svg>
						添加商品
					</button>
					<button
						@click="handleExport"
						:disabled="exporting"
						class="px-4 py-2 text-green-700 bg-green-50 rounded-md shadow hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						title="导出Excel"
					>
						<svg class="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
						</svg>
						<span v-if="exporting">导出中...</span>
						<span v-else>导出Excel</span>
					</button>
					<button
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
				:total-items="totalCount"
				:total-pages="totalPages"
				:page-size-options="pagination.pageSizeOptions"
				@update:current-page="updatePagination({ currentPage: $event })"
				@update:page-size="updatePagination({ pageSize: $event })"
			/>
		</div>

		<!-- 产品导入对话框 -->
		<ProductImportDialog
			:show="showImportDialog"
			:store-id="storeId"
			:task-id="taskId"
			@close="showImportDialog = false"
			@success="handleImportSuccess"
		/>

		<!-- 产品添加对话框 -->
		<ProductAddDialog
			:show="showAddDialog"
			:store-id="storeId"
			:task-id="taskId"
			:existing-products="filteredCommodities"
			@close="showAddDialog = false"
			@success="handleImportSuccess"
		/>
	</div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStoreDetail } from '../composables/useStoreDetail'
import CommodityTable from '../components/store-detail/CommodityTable.vue'
import FilterPanel from '../components/store-detail/FilterPanel.vue'
import StatsCards from '../components/store-detail/StatsCards.vue'
import PaginationControls from '../components/store-detail/PaginationControls.vue'
import ProductImportDialog from '../components/store-detail/dialogs/ProductImportDialog.vue'
import ProductAddDialog from '../components/store-detail/dialogs/ProductAddDialog.vue'

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
	totalCount,
	loading,
	error,
	filterOptions,
	refreshData,
	updateFilters,
	updatePagination,
	saveMonthQuantity,
	batchSaveChanges,
	exportToExcel,
	generateColumns,
	generateHeaders,
	transformDataForTable
} = useStoreDetail(props.storeId, props.taskId)

// UI 状态
const showImportDialog = ref(false)
const showAddDialog = ref(false)
const exporting = ref(false)

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

// 处理导入成功
const handleImportSuccess = async () => {
	console.log('导入成功，刷新数据')
	await refreshData()
}

// 处理导出
const handleExport = async () => {
	exporting.value = true
	try {
		const result = await exportToExcel()
		if (result.success) {
			console.log(result.message)
			// 可以显示成功提示
		} else {
			console.error('导出失败:', result.message)
			alert(result.message)
		}
	} finally {
		exporting.value = false
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
