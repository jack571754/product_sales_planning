<template>
	<div class="store-detail-page min-h-screen bg-gray-50 p-4 lg:p-6">
		<div class="max-w-[1920px] mx-auto space-y-4">
			<!-- Header Section -->
			<Card class="p-4 lg:p-5">
				<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div class="flex items-start gap-3">
						<Button
							variant="ghost"
							theme="gray"
							size="sm"
							@click="goBack"
						>
							<template #prefix>
								<FeatherIcon name="arrow-left" class="h-4 w-4" />
							</template>
							返回看板
						</Button>
						<div>
							<div class="flex items-center gap-2 flex-wrap">
								<h1 class="text-xl font-semibold text-gray-900">
									{{ storeInfo.shop_name || storeInfo.name || '店铺详情' }}
								</h1>
								<Badge v-if="taskInfo.task_type" theme="blue" size="sm">
									{{ taskInfo.task_type }}
								</Badge>
							</div>
							<div class="text-sm text-gray-500 flex items-center gap-2 mt-1">
								<FeatherIcon name="calendar" class="w-4 h-4" />
								<span>{{ taskInfo.task_name || taskInfo.name || '任务信息加载中' }}</span>
							</div>
						</div>
					</div>

					<div class="flex flex-wrap items-center gap-2">
						<div class="hidden md:flex flex-wrap items-center gap-2">
							<Button
								v-if="canEdit"
								variant="outline"
								theme="blue"
								@click="showImportDialog = true"
							>
								<template #prefix>
									<FeatherIcon name="upload" class="h-4 w-4" />
								</template>
								单品导入
							</Button>
							<Button
								v-if="canEdit"
								variant="outline"
								theme="purple"
								@click="showAddDialog = true"
							>
								<template #prefix>
									<FeatherIcon name="plus" class="h-4 w-4" />
								</template>
								添加商品
							</Button>
							<Button
								variant="outline"
								theme="green"
								:loading="exporting"
								@click="handleExport"
							>
								<template #prefix>
									<FeatherIcon name="download" class="h-4 w-4" />
								</template>
								导出Excel
							</Button>
							<Button
								variant="ghost"
								theme="gray"
								@click="handleRefresh"
							>
								<template #prefix>
									<FeatherIcon name="refresh-cw" class="h-4 w-4" />
								</template>
								刷新
							</Button>
						</div>

						<Dropdown class="md:hidden" :options="dropdownActions" placement="bottom-end">
							<template #default="{ open }">
								<Button variant="outline" theme="gray">
									<template #prefix>
										<FeatherIcon name="more-horizontal" class="h-4 w-4" />
									</template>
									{{ open ? '收起' : '操作' }}
								</Button>
							</template>
						</Dropdown>
					</div>
				</div>
			</Card>

			<!-- Error Alert -->
			<Alert v-if="error" theme="red" title="加载失败">
				<template #default>
					{{ errorText }}
				</template>
			</Alert>

			<!-- Loading State -->
			<Card v-if="loading" class="p-6 flex items-center justify-center">
				<div class="flex items-center gap-3 text-gray-600">
					<div class="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-600"></div>
					<span>正在加载数据...</span>
				</div>
			</Card>

			<!-- Main Content -->
			<template v-else>
				<!-- Statistics Cards -->
				<StatsCards :statistics="statistics" />

				<!-- Filter Panel -->
				<FilterPanel
					:filters="filters"
					:filter-options="filterOptions"
					:loading="loading"
					@update:filters="updateFilters"
				/>

				<!-- Column Settings & Batch Actions -->
				<Card class="p-4">
					<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
						<div class="flex items-center gap-3">
							<Button
								v-if="canEdit && hasSelection"
								variant="solid"
								theme="red"
								size="sm"
								@click="showDeleteDialog = true"
							>
								<template #prefix>
									<FeatherIcon name="trash-2" class="h-4 w-4" />
								</template>
								删除选中 ({{ selectedCount }})
							</Button>
							<Badge v-if="hasSelection" theme="blue" variant="subtle">
								已选择 {{ selectedCount }} 项
							</Badge>
						</div>

						<div class="flex items-center gap-2">
							<div class="text-sm text-gray-500">
								共 {{ totalCount }} 条数据
							</div>
						</div>
					</div>
				</Card>

				<!-- Data Table (Text Replacement) -->
				<Card class="overflow-hidden">
					<div class="border-b border-gray-100 px-5 py-3 bg-gray-50">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2 text-gray-900 font-medium">
								<FeatherIcon name="table" class="h-4 w-4 text-gray-500" />
								<span>商品计划数据</span>
							</div>
							<Badge v-if="isSaving" theme="blue" variant="subtle">
								<template #prefix>
									<div class="h-3 w-3 animate-spin rounded-full border-2 border-blue-100 border-t-blue-600"></div>
								</template>
								保存中...
							</Badge>
							<Badge v-else-if="saveError" theme="red" variant="subtle">
								<template #prefix>
									<FeatherIcon name="alert-circle" class="h-3 w-3" />
								</template>
								保存失败
							</Badge>
							<Badge v-else-if="lastSaveTime" theme="green" variant="subtle">
								<template #prefix>
									<FeatherIcon name="check" class="h-3 w-3" />
								</template>
								{{ formatSaveTime(lastSaveTime) }}
							</Badge>
						</div>
					</div>

					<div class="p-4">
						<!-- Simple Table Display -->
						<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th v-for="header in tableHeaders" :key="header" 
											class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											{{ header }}
										</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									<tr v-for="(row, rowIndex) in tableData" :key="rowIndex">
										<td v-for="(col, colIndex) in tableColumns" :key="colIndex"
											class="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
											{{ row[col.data] || '-' }}
										</td>
									</tr>
								</tbody>
							</table>
						</div>
						<div v-if="!tableData || tableData.length === 0" 
							class="text-center py-12 text-gray-500">
							暂无数据
						</div>
					</div>
				</Card>

				<!-- Pagination -->
				<PaginationControls
					:current-page="pagination.currentPage"
					:page-size="pagination.pageSize"
					:total-items="totalCount"
					:total-pages="totalPages"
					:page-size-options="pagination.pageSizeOptions"
					@update:current-page="updatePagination({ currentPage: $event })"
					@update:page-size="updatePagination({ pageSize: $event })"
				/>
			</template>

			<!-- Dialogs -->
			<ProductImportDialog
				:show="showImportDialog"
				:store-id="storeId"
				:task-id="taskId"
				@close="showImportDialog = false"
				@success="handleImportSuccess"
			/>

			<ProductAddDialog
				:show="showAddDialog"
				:store-id="storeId"
				:task-id="taskId"
				:existing-products="filteredCommodities"
				@close="showAddDialog = false"
				@success="handleImportSuccess"
			/>

			<Dialog v-model="showDeleteDialog" title="确认批量删除">
				<template #body-content>
					<div class="space-y-3">
						<p class="text-sm text-gray-600">
							确定删除选中的 <strong class="text-gray-900">{{ selectedCount }}</strong> 个商品的所有计划记录吗？
						</p>
						<div class="p-3 bg-red-50 rounded-lg border border-red-100">
							<div class="flex items-start gap-2">
								<FeatherIcon name="alert-triangle" class="h-4 w-4 text-red-600 mt-0.5" />
								<p class="text-sm text-red-800">
									该操作不可撤销,请谨慎操作！
								</p>
							</div>
						</div>
					</div>
				</template>
				<template #actions>
					<Button variant="subtle" theme="gray" @click="showDeleteDialog = false">
						取消
					</Button>
					<Button variant="solid" theme="red" :loading="deleting" @click="handleBatchDelete">
						确认删除
					</Button>
				</template>
			</Dialog>

			<!-- Save Indicator -->
			<SaveIndicator
				:is-saving="isSaving"
				:save-error="saveError"
				:last-save-time="lastSaveTime"
			/>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Badge, Dropdown, FeatherIcon, Card, Dialog, Alert, toast } from 'frappe-ui'
import { useStoreDetail } from '../composables/useStoreDetail'
import { formatTime } from '../utils/helpers'
import FilterPanel from '../components/store-detail/FilterPanel.vue'
import StatsCards from '../components/store-detail/StatsCards.vue'
import PaginationControls from '../components/store-detail/PaginationControls.vue'
import ProductImportDialog from '../components/store-detail/dialogs/ProductImportDialog.vue'
import ProductAddDialog from '../components/store-detail/dialogs/ProductAddDialog.vue'
import SaveIndicator from '../components/store-detail/SaveIndicator.vue'

// ==================== Props ====================
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

// ==================== Router ====================
const router = useRouter()

// ==================== Store Detail Composable ====================
const {
	filters,
	pagination,
	filteredCommodities,
	storeInfo,
	taskInfo,
	canEdit,
	statistics,
	totalPages,
	totalCount,
	loading,
	error,
	filterOptions,
	isSaving,
	saveError,
	lastSaveTime,
	selectedRows,
	selectedCount,
	hasSelection,
	refreshData,
	updateFilters,
	updatePagination,
	batchSaveChanges,
	exportToExcel,
	generateColumns,
	generateHeaders,
	transformDataForTable,
	updateSelectedRows,
	batchDeleteSelected
} = useStoreDetail(props.storeId, props.taskId)

// ==================== Computed Properties ====================
const tableColumns = computed(() => {
	const cols = generateColumns()
	return cols
})

const tableHeaders = computed(() => {
	const headers = generateHeaders()
	return headers
})

const tableData = computed(() => {
	const data = transformDataForTable()
	return data
})

const errorText = computed(() => {
	if (!error.value) return ''
	if (typeof error.value === 'string') return error.value
	return error.value?.message || '加载失败'
})

// ==================== UI State ====================
const showImportDialog = ref(false)
const showAddDialog = ref(false)
const showDeleteDialog = ref(false)
const exporting = ref(false)
const deleting = ref(false)

// ==================== Mobile Dropdown Actions ====================
const dropdownActions = computed(() => [
	{
		label: '批量删除',
		icon: 'trash',
		disabled: !canEdit.value || !hasSelection.value,
		onClick: () => {
			if (!canEdit.value) {
				toast.warning('当前审批状态不可编辑')
				return
			}
			if (!hasSelection.value) {
				toast.info('请选择要删除的商品')
				return
			}
			showDeleteDialog.value = true
		}
	},
	{
		label: '单品导入',
		icon: 'upload',
		disabled: !canEdit.value,
		onClick: () => (showImportDialog.value = true)
	},
	{
		label: '添加商品',
		icon: 'plus',
		disabled: !canEdit.value,
		onClick: () => (showAddDialog.value = true)
	},
	{
		label: '导出Excel',
		icon: 'download',
		disabled: exporting.value,
		onClick: () => handleExport()
	},
	{
		label: '刷新',
		icon: 'refresh-cw',
		onClick: () => handleRefresh()
	}
])

// ==================== Event Handlers ====================
const goBack = () => {
	router.push({ name: 'PlanningDashboard' })
}

const handleRefresh = async () => {
	await refreshData()
	toast.info('数据已刷新')
}

const handleImportSuccess = async () => {
	await refreshData()
	toast.success('导入成功，数据已更新')
}

const handleExport = async () => {
	exporting.value = true
	try {
		const result = await exportToExcel()
		if (result.success) {
			toast.success(result.message || '导出成功')
		} else {
			toast.error(result.message || '导出失败')
		}
	} catch (error) {
		toast.error(error.message || '导出失败')
	} finally {
		exporting.value = false
	}
}

const handleBatchDelete = async () => {
	if (selectedCount.value === 0) {
		showDeleteDialog.value = false
		return
	}

	deleting.value = true
	try {
		const result = await batchDeleteSelected()
		if (result.success) {
			toast.success(result.message || '删除成功')
			showDeleteDialog.value = false
		} else {
			toast.error(result.message || '删除失败')
		}
	} catch (error) {
		toast.error(error.message || '删除失败')
	} finally {
		deleting.value = false
	}
}

const formatSaveTime = (time) => {
	return formatTime(time)
}

// ==================== Watchers ====================
watch([filters, pagination], () => {
	updateSelectedRows([])
}, { deep: true })

// ==================== Lifecycle ====================
onMounted(async () => {
	// Initial data load is handled by the composable
})
</script>

<style scoped>
.store-detail-page {
	max-width: 1920px;
	margin: 0 auto;
}

/* Simple table styles */
table {
	border-collapse: collapse;
}

th {
	background-color: #f9fafb;
	font-weight: 600;
	color: #374151;
	border: 1px solid #e5e7eb;
}

td {
	border: 1px solid #e5e7eb;
	vertical-align: middle;
}

tr:hover {
	background-color: #f9fafb;
}
</style>
