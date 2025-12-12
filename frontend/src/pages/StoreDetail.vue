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
							<Dropdown :options="columnVisibilityOptions" placement="bottom-end">
								<template #default="{ open }">
									<Button variant="outline" theme="gray" size="sm">
										<template #prefix>
											<FeatherIcon name="columns" class="h-4 w-4" />
										</template>
										列显示设置
										<template #suffix>
											<FeatherIcon 
												:name="open ? 'chevron-up' : 'chevron-down'" 
												class="h-4 w-4" 
											/>
										</template>
									</Button>
								</template>
							</Dropdown>
							<div class="text-sm text-gray-500">
								共 {{ totalCount }} 条数据
							</div>
						</div>
					</div>
				</Card>

				<!-- Handsontable Container -->
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
						<div 
							ref="tableContainer" 
							class="handsontable-container"
							style="height: 600px; overflow: hidden;"
						></div>
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
									该操作不可撤销，请谨慎操作！
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
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Badge, Dropdown, FeatherIcon, Card, Dialog, Alert, toast } from 'frappe-ui'
import { useStoreDetail } from '../composables/useStoreDetail'
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
	// Note: generateColumns already includes the checkbox column
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
const tableContainer = ref(null)
const hiddenColumns = ref(new Set())
const hotInstance = ref(null)
const handsontableReady = ref(false)

// ==================== Handsontable Initialization ====================
const initializeHandsontable = async () => {
	// Wait for container to be available
	if (!tableContainer.value) {
		console.warn('⚠️ Table container not ready yet')
		return
	}

	try {
		// Dynamically import Handsontable
		const Handsontable = window.Handsontable
		if (!Handsontable) {
			console.error('❌ Handsontable not loaded')
			return
		}

		// Destroy existing instance
		if (hotInstance.value) {
			hotInstance.value.destroy()
			hotInstance.value = null
		}

		// Create new instance
		const config = {
			data: tableData.value || [],
			columns: tableColumns.value || [],
			colHeaders: tableHeaders.value || true,
			rowHeaders: true,
			fixedColumnsLeft: 4, // Fix checkbox + first 3 columns
			contextMenu: true,
			dropdownMenu: ['filter_by_condition', 'filter_by_value', 'filter_action_bar'],
			filters: true,
			columnSorting: true,
			manualColumnResize: true,
			manualRowResize: true,
			copyPaste: {
				columnsLimit: 1000,
				rowsLimit: 10000,
				pasteMode: 'overwrite'
			},
			fillHandle: {
				autoInsertRow: false,
				direction: 'vertical'
			},
			height: 600,
			licenseKey: 'non-commercial-and-evaluation',
			language: 'zh-CN',
			stretchH: 'none',
			autoWrapRow: true,
			autoWrapCol: true,
			cells: (row, col) => {
				const cellProperties = {}
				
				// Make checkbox column always editable
				if (col === 0) {
					cellProperties.readOnly = false
					return cellProperties
				}

				// Apply read-only based on canEdit
				if (!canEdit.value) {
					cellProperties.readOnly = true
					cellProperties.className = 'htDimmed'
				}

				return cellProperties
			},
			afterChange: (changes, source) => {
				if (!changes || source === 'loadData') return
				handleDataChange(changes, source)
			},
			beforeCopy: () => true,
			beforePaste: (data, coords) => {
				if (!canEdit.value) {
					toast.warning('当前状态不可编辑')
					return false
				}
				return true
			}
		}

		hotInstance.value = new Handsontable(tableContainer.value, config)
		handsontableReady.value = true
		console.log('✅ Handsontable initialized successfully')
	} catch (error) {
		console.error('❌ Failed to initialize Handsontable:', error)
		toast.error('表格初始化失败')
	}
}

// ==================== Column Visibility ====================
const columnVisibilityOptions = computed(() => {
	const cols = generateColumns().filter(col => col.data !== '__selected')
	return cols.map((col, index) => ({
		label: col.title || col.data,
		value: col.data,
		icon: hiddenColumns.value.has(col.data) ? 'eye-off' : 'eye',
		onClick: () => toggleColumnVisibility(col.data, index + 1) // +1 for checkbox column
	}))
})

const toggleColumnVisibility = (columnKey, columnIndex) => {
	if (!hotInstance.value) return

	const plugin = hotInstance.value.getPlugin('hiddenColumns')
	if (!plugin) return

	if (hiddenColumns.value.has(columnKey)) {
		hiddenColumns.value.delete(columnKey)
		plugin.showColumn(columnIndex)
	} else {
		hiddenColumns.value.add(columnKey)
		plugin.hideColumn(columnIndex)
	}
	hotInstance.value.render()
}

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
	if (hotInstance.value && tableData.value) {
		hotInstance.value.loadData(tableData.value)
	}
	toast.info('数据已刷新')
}

const handleDataChange = async (changes, source) => {
	if (!changes || changes.length === 0) return

	const selectionSet = new Set(selectedRows.value || [])
	let selectionChanged = false
	const valueChanges = []

	changes.forEach(([row, prop, oldValue, newValue]) => {
		if (prop === '__selected') {
			if (newValue === oldValue) return
			selectionChanged = true
			if (newValue) {
				selectionSet.add(row)
			} else {
				selectionSet.delete(row)
			}
		} else {
			// Only save if value actually changed
			if (oldValue !== newValue) {
				valueChanges.push([row, prop, oldValue, newValue])
			}
		}
	})

	if (selectionChanged) {
		updateSelectedRows(Array.from(selectionSet))
	}

	if (valueChanges.length > 0 && canEdit.value) {
		try {
			const result = await batchSaveChanges(valueChanges)
			if (result.success) {
				toast.success('保存成功')
			} else {
				toast.error(result.message || '保存失败')
				// Revert changes on error
				if (hotInstance.value && tableData.value) {
					hotInstance.value.loadData(tableData.value)
				}
			}
		} catch (error) {
			console.error('保存失败:', error)
			toast.error(error.message || '保存失败')
			// Revert changes on error
			if (hotInstance.value && tableData.value) {
				hotInstance.value.loadData(tableData.value)
			}
		}
	}
}

const handleImportSuccess = async () => {
	await refreshData()
	if (hotInstance.value && tableData.value) {
		hotInstance.value.loadData(tableData.value)
	}
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
			// Refresh table data
			if (hotInstance.value && tableData.value) {
				hotInstance.value.loadData(tableData.value)
			}
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
	if (!time) return ''
	const date = new Date(time)
	return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ==================== Watchers ====================
watch(loading, async (isLoading) => {
	if (!isLoading && tableContainer.value) {
		// Wait for DOM to update
		await nextTick()
		await nextTick()
		// Initialize Handsontable after data is loaded
		await initializeHandsontable()
	}
})

watch(tableData, (newData) => {
	if (hotInstance.value && handsontableReady.value && newData) {
		hotInstance.value.loadData(newData)
	}
}, { deep: false })

watch([filters, pagination], () => {
	updateSelectedRows([])
}, { deep: true })

// ==================== Lifecycle ====================
onMounted(async () => {
	// Wait for initial data load
	if (!loading.value && tableContainer.value) {
		await nextTick()
		await initializeHandsontable()
	}
})

onBeforeUnmount(() => {
	if (hotInstance.value) {
		hotInstance.value.destroy()
		hotInstance.value = null
	}
})
</script>

<style scoped>
.store-detail-page {
	max-width: 1920px;
	margin: 0 auto;
}

.handsontable-container {
	width: 100%;
}

/* Handsontable custom styles */
:deep(.handsontable) {
	font-size: 13px;
	color: #374151;
}

:deep(.handsontable td) {
	border-color: #e5e7eb;
	vertical-align: middle;
}

:deep(.handsontable th) {
	background-color: #f9fafb;
	font-weight: 600;
	color: #374151;
	border-color: #e5e7eb;
}

:deep(.handsontable td.htDimmed) {
	background-color: #f9fafb;
	color: #9ca3af;
}

:deep(.handsontable .htCheckboxRendererInput) {
	cursor: pointer;
}

:deep(.handsontable td.area) {
	background-color: #dbeafe;
}

:deep(.handsontable td.current) {
	background-color: #bfdbfe;
}

/* Copy-paste feedback */
:deep(.handsontable .copyBorder) {
	border: 2px dashed #3b82f6;
}

/* Context menu styling */
:deep(.htContextMenu) {
	border-radius: 0.5rem;
	box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Dropdown menu styling */
:deep(.htDropdownMenu) {
	border-radius: 0.5rem;
	box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}

/* Selection styling */
:deep(.handsontable tbody tr th.ht__highlight),
:deep(.handsontable thead tr th.ht__highlight) {
	background-color: #dbeafe;
}

/* Error cell styling */
:deep(.handsontable td.htInvalid) {
	background-color: #fee2e2 !important;
}

/* Read-only cell styling */
:deep(.handsontable td.htDimmed) {
	background-color: #f9fafb;
	color: #9ca3af;
	font-style: italic;
}

/* Numeric cell alignment */
:deep(.handsontable td.htNumeric) {
	text-align: right;
}

/* Center alignment for checkbox and small columns */
:deep(.handsontable td.htCenter) {
	text-align: center;
}

:deep(.handsontable td.htMiddle) {
	vertical-align: middle;
}
</style>
