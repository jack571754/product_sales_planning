<template>
    <div class="store-detail-page">
        <div class="header-section">
            <div class="header-content">
                <div class="header-left">
                    <Button variant="ghost" theme="gray" size="sm" @click="goBack">
                        <template #prefix>
                            <FeatherIcon name="arrow-left" class="h-4 w-4" />
                        </template>
                        返回看板
                    </Button>
                    <div class="store-info">
                        <div class="store-title">
                            <h1>{{ storeInfo.shop_name || storeInfo.name || '店铺详情' }}</h1>
                            <Badge v-if="taskInfo.task_type" theme="blue" size="sm">
                                {{ taskInfo.task_type }}
                            </Badge>
                        </div>
                        <div class="task-info">
                            <FeatherIcon name="calendar" class="w-4 h-4" />
                            <span>{{ taskInfo.task_name || taskInfo.name || '任务信息加载中' }}</span>
                        </div>
                    </div>
                </div>

                <div class="header-actions">
                    <div class="desktop-actions">
                        <template v-if="canEdit">
                            <Button variant="outline" theme="blue" @click="showImportDialog = true">
                                <template #prefix><FeatherIcon name="upload" class="h-4 w-4" /></template>
                                单品导入
                            </Button>
                            <Button variant="outline" theme="purple" @click="showAddDialog = true">
                                <template #prefix><FeatherIcon name="plus" class="h-4 w-4" /></template>
                                添加商品
                            </Button>
                        </template>
                        
                        <Button 
                            variant="outline" 
                            theme="green" 
                            :loading="exporting" 
                            @click="wrapAction(handleExport)"
                        >
                            <template #prefix><FeatherIcon name="download" class="h-4 w-4" /></template>
                            导出Excel
                        </Button>
                        
                        <Button variant="ghost" theme="gray" @click="wrapAction(refreshData, '刷新成功')">
                            <template #prefix><FeatherIcon name="refresh-cw" class="h-4 w-4" /></template>
                            刷新
                        </Button>
                    </div>

                    <Dropdown v-if="dropdownActions.length > 0" class="mobile-actions" :options="dropdownActions" placement="bottom-end">
                        <template #default="{ open }">
                            <Button variant="outline" theme="gray">
                                <template #prefix><FeatherIcon name="more-horizontal" class="h-4 w-4" /></template>
                                {{ open ? '收起' : '操作' }}
                            </Button>
                        </template>
                    </Dropdown>
                </div>
            </div>
        </div>

        <Alert v-if="error" theme="red" title="加载失败" class="error-alert">
            {{ errorText }}
            <template #actions>
                <Button size="sm" variant="subtle" theme="red" @click="refreshData">重试</Button>
            </template>
        </Alert>

        <div class="main-content" :class="{ 'opacity-50 pointer-events-none': loading && !tableData.length }">
            
            <StatsCards v-if="statistics" :statistics="statistics" class="stats-section" />

            <FilterPanel
                v-if="filterOptions"
                :filters="filters"
                :filter-options="filterOptions"
                :loading="loading"
                @update:filters="updateFilters"
                class="filter-section"
            />

            <div class="toolbar-section">
                <div class="toolbar-content">
                    <div class="toolbar-left">
                        <Transition name="fade">
                            <div v-if="canEdit && hasSelection" class="flex items-center gap-3">
                                <Button
                                    variant="solid"
                                    theme="red"
                                    size="sm"
                                    @click="showDeleteDialog = true"
                                >
                                    <template #prefix><FeatherIcon name="trash-2" class="h-4 w-4" /></template>
                                    删除选中 ({{ selectedCount }})
                                </Button>
                                <Badge theme="blue" variant="subtle">已选择 {{ selectedCount }} 项</Badge>
                            </div>
                        </Transition>
                    </div>

                    <div class="toolbar-right">
                        <div class="total-count">共 {{ totalCount }} 条数据</div>
                    </div>
                </div>
            </div>

            <div class="table-section">
                <div class="table-header">
                    <div class="table-title">
                        <FeatherIcon name="table" class="h-4 w-4" />
                        <span>商品计划数据</span>
                    </div>
                    <div class="save-status">
                        <Badge v-if="isSaving" theme="blue" variant="subtle">
                            <template #prefix><div class="spinner-small"></div></template>
                            保存中...
                        </Badge>
                        <Badge v-else-if="saveError" theme="red" variant="subtle">
                            <template #prefix><FeatherIcon name="alert-circle" class="h-3 w-3" /></template>
                            保存失败
                        </Badge>
                        <Badge v-else-if="lastSaveTime" theme="green" variant="subtle">
                            <template #prefix><FeatherIcon name="check" class="h-3 w-3" /></template>
                            {{ formatSaveTime(lastSaveTime) }}
                        </Badge>
                    </div>
                </div>

                <div class="table-content">
                    <!-- Loading State -->
                    <div v-if="loading && !tableData.length" class="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                         <div class="loading-content">
                            <div class="spinner"></div>
                            <span>正在加载数据...</span>
                        </div>
                    </div>

                    <!-- Debug Info (Remove in production) -->
                    <div v-if="debugMode" class="debug-info">
                        <p>tableData length: {{ tableData?.length || 0 }}</p>
                        <p>tableColumns length: {{ tableColumns?.length || 0 }}</p>
                        <p>filteredCommodities length: {{ filteredCommodities?.length || 0 }}</p>
                    </div>

                    <!-- Data Table -->
                    <DataTable
                        v-if="tableData && tableData.length > 0 && tableColumns && tableColumns.length > 0"
                        class="data-table-wrapper" 
                        :data="tableData"
                        :columns="tableColumns"
                        :read-only="!canEdit"
                        :can-edit="canEdit"
                        :hidden-columns="hiddenColumns"
                        @change="handleTableChange"
                        @selection-change="handleSelectionChange"
                        @toggle-column="toggleColumn"
                    />
                    
                    <!-- Empty State -->
                    <div v-else-if="!loading" class="empty-state">
                        <div class="empty-icon">
                            <FeatherIcon name="inbox" class="h-8 w-8" />
                        </div>
                        <span>暂无数据</span>
                        <Button v-if="canEdit" variant="subtle" class="mt-2" @click="showAddDialog = true">添加商品</Button>
                    </div>
                </div>
            </div>

            <PaginationControls
                v-if="totalCount > 0"
                :current-page="pagination.currentPage"
                :page-size="pagination.pageSize"
                :total-items="totalCount"
                :total-pages="totalPages"
                :page-size-options="pagination.pageSizeOptions"
                @update:current-page="updatePagination({ currentPage: $event })"
                @update:page-size="updatePagination({ pageSize: $event })"
                class="pagination-section"
            />
        </div>

        <Teleport to="body">
            <ProductImportDialog
                v-if="showImportDialog"
                :show="showImportDialog"
                :store-id="storeId"
                :task-id="taskId"
                @close="showImportDialog = false"
                @success="handleDialogSuccess"
            />

            <ProductAddDialog
                v-if="showAddDialog"
                :show="showAddDialog"
                :store-id="storeId"
                :task-id="taskId"
                :existing-products="filteredCommodities"
                @close="showAddDialog = false"
                @success="handleDialogSuccess"
            />

            <Dialog v-model="showDeleteDialog" title="确认批量删除">
                <template #body-content>
                    <div class="delete-dialog-content p-4">
                        <p class="delete-message text-gray-600 mb-4">
                            确定删除选中的 <strong class="text-gray-900">{{ selectedCount }}</strong> 个商品的所有计划记录吗？
                        </p>
                        <div class="delete-warning bg-red-50 border border-red-200 rounded p-3 flex gap-2">
                            <FeatherIcon name="alert-triangle" class="h-4 w-4 text-red-600 mt-0.5" />
                            <p class="text-sm text-red-800">该操作不可撤销,请谨慎操作！</p>
                        </div>
                    </div>
                </template>
                <template #actions>
                    <Button variant="subtle" theme="gray" @click="showDeleteDialog = false">取消</Button>
                    <Button 
                        variant="solid" 
                        theme="red" 
                        :loading="deleting" 
                        @click="wrapAction(handleBatchDelete)"
                    >
                        确认删除
                    </Button>
                </template>
            </Dialog>
        </Teleport>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Badge, Dropdown, FeatherIcon, Alert, Dialog, toast } from 'frappe-ui'
import { useStoreDetail } from '../composables/useStoreDetail'
import { formatTime } from '../utils/helpers'

// Components
import FilterPanel from '../components/store-detail/FilterPanel.vue'
import StatsCards from '../components/store-detail/StatsCards.vue'
import PaginationControls from '../components/store-detail/PaginationControls.vue'
import ProductImportDialog from '../components/store-detail/dialogs/ProductImportDialog.vue'
import ProductAddDialog from '../components/store-detail/dialogs/ProductAddDialog.vue'
import DataTable from '../components/store-detail/DataTable.vue'

// Props
const props = defineProps({
    storeId: { type: String, required: true },
    taskId: { type: String, required: true }
})

const router = useRouter()

// Composable
const {
    filters, pagination, filteredCommodities, storeInfo, taskInfo,
    canEdit, statistics, totalPages, totalCount, loading, error,
    filterOptions, isSaving, saveError, lastSaveTime,
    selectedRows, selectedCount, hasSelection,
    refreshData, updateFilters, updatePagination, batchSaveChanges,
    exportToExcel, generateColumns, generateHeaders, transformDataForTable,
    updateSelectedRows, batchDeleteSelected, cleanup
} = useStoreDetail(props.storeId, props.taskId)

// Local State
const hiddenColumns = ref([])
const showImportDialog = ref(false)
const showAddDialog = ref(false)
const showDeleteDialog = ref(false)
const exporting = ref(false)
const deleting = ref(false)
const debugMode = ref(false) // Set to true to see debug info

// Computed
const tableColumns = computed(() => {
    try {
        const cols = generateColumns()
        console.log('Generated columns:', cols?.length || 0, cols)
        return cols || []
    } catch (err) {
        console.error('Error generating columns:', err)
        return []
    }
})

const tableData = computed(() => {
    try {
        const data = transformDataForTable()
        console.log('Transformed table data:', data?.length || 0, data)
        return data || []
    } catch (err) {
        console.error('Error transforming table data:', err)
        return []
    }
})

const errorText = computed(() => {
    if (!error.value) return ''
    return typeof error.value === 'string' ? error.value : (error.value?.message || '加载失败')
})

const dropdownActions = computed(() => {
    const actions = []
    if (canEdit.value) {
        actions.push(
            {
                label: '批量删除',
                icon: 'trash',
                disabled: !hasSelection.value,
                onClick: () => {
                    if (!hasSelection.value) return toast.info('请选择要删除的商品')
                    showDeleteDialog.value = true
                }
            },
            { label: '单品导入', icon: 'upload', onClick: () => (showImportDialog.value = true) },
            { label: '添加商品', icon: 'plus', onClick: () => (showAddDialog.value = true) }
        )
    }
    actions.push(
        { label: '导出Excel', icon: 'download', disabled: exporting.value, onClick: () => wrapAction(handleExport) },
        { label: '刷新', icon: 'refresh-cw', onClick: () => wrapAction(refreshData, '数据已刷新') }
    )
    return actions
})

// Helper: 通用异步操作包装器
const wrapAction = async (actionFn, successMsg = null) => {
    try {
        const result = await actionFn()
        if (result && result.success === false) {
             throw new Error(result.message || '操作失败')
        }
        
        if (successMsg || (result && result.message)) {
            toast.success(successMsg || result.message)
        }
        return true
    } catch (err) {
        console.error('操作异常:', err)
        toast.error(err.message || '操作失败')
        return false
    }
}

// Event Handlers
const goBack = () => router.push({ name: 'Dashboard' }).catch(() => router.push('/'))

const handleDialogSuccess = async () => {
    showImportDialog.value = false
    showAddDialog.value = false
    await wrapAction(refreshData, '操作成功，数据已更新')
}

const handleExport = async () => {
    exporting.value = true
    try {
        await exportToExcel()
    } finally {
        exporting.value = false
    }
}

const handleBatchDelete = async () => {
    deleting.value = true
    try {
        const success = await batchDeleteSelected()
        if (success) showDeleteDialog.value = false
        return success ? { success: true, message: '删除成功' } : { success: false, message: '删除失败' }
    } finally {
        deleting.value = false
    }
}

const formatSaveTime = (time) => {
    try { return formatTime(time) } catch { return '刚刚' }
}

const handleTableChange = async (changes, source) => {
    if (!changes?.length) return
    if (['edit', 'CopyPaste.paste', 'Autofill.fill'].includes(source)) {
        await batchSaveChanges(changes)
    }
}

const handleSelectionChange = (indices) => updateSelectedRows(indices)
const toggleColumn = (key) => {
    const idx = hiddenColumns.value.indexOf(key)
    idx > -1 ? hiddenColumns.value.splice(idx, 1) : hiddenColumns.value.push(key)
}

// Watchers
watch([filters, pagination], () => updateSelectedRows([]), { deep: true })

// Lifecycle
onMounted(() => {
    console.log('StoreDetail Mounted', {
        storeId: props.storeId,
        taskId: props.taskId
    })
})
onBeforeUnmount(() => cleanup && cleanup())
</script>

<style scoped>
.store-detail-page {
    min-height: 100vh;
    background-color: #f9fafb;
    padding: 1rem;
    display: flex;
    flex-direction: column;
}

@media (min-width: 1024px) {
    .store-detail-page { padding: 1.5rem; }
}

/* Header Section */
.header-section {
    background: white;
    border-radius: 0.5rem;
    padding: 1rem 1.25rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
}

.header-content { display: flex; flex-direction: column; gap: 1rem; }
@media (min-width: 1024px) { .header-content { flex-direction: row; align-items: center; justify-content: space-between; } }
.header-left { display: flex; align-items: flex-start; gap: 0.75rem; }
.store-info { flex: 1; }
.store-title { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.store-title h1 { font-size: 1.25rem; font-weight: 600; color: #111827; margin: 0; }
.task-info { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; font-size: 0.875rem; color: #6b7280; }
.header-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.desktop-actions { display: none; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
@media (min-width: 768px) { .desktop-actions { display: flex; } .mobile-actions { display: none; } }

/* Main Content Area */
.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

/* Stats & Filter & Toolbar */
.stats-section, .filter-section { flex-shrink: 0; margin-bottom: 1rem; }

.toolbar-section {
    background: white;
    border-radius: 0.5rem 0.5rem 0 0;
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
    flex-shrink: 0;
}

.toolbar-content { display: flex; flex-direction: column; gap: 1rem; }
@media (min-width: 768px) { .toolbar-content { flex-direction: row; align-items: center; justify-content: space-between; } }

/* Table Section */
.table-section {
    background: white;
    border-radius: 0 0 0.5rem 0.5rem;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 400px;
    overflow: hidden;
    margin-bottom: 1rem;
}

.table-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid #f3f4f6;
    flex-shrink: 0;
}

.table-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    min-height: 0;
}

/* DataTable Wrapper - Critical Fix */
.data-table-wrapper {
    flex: 1;
    width: 100%;
    height: 100%;
    min-height: 0;
    overflow: auto;
}

/* Pagination */
.pagination-section { flex-shrink: 0; }

.table-title { display: flex; align-items: center; gap: 0.5rem; color: #374151; font-weight: 500; }
.save-status { display: flex; align-items: center; gap: 0.5rem; }

/* Debug Info */
.debug-info {
    position: absolute;
    top: 0;
    right: 0;
    background: rgba(255, 255, 0, 0.9);
    padding: 0.5rem;
    font-size: 0.75rem;
    z-index: 1000;
    border: 1px solid #000;
}

/* Loading & Empty States */
.loading-content {
    display: flex; flex-direction: column; align-items: center; gap: 0.75rem; color: #4b5563;
}
.spinner, .spinner-small {
    border: 2px solid #e5e7eb; border-top-color: #2563eb; border-radius: 50%; animation: spin 1s linear infinite;
}
.spinner { height: 1.5rem; width: 1.5rem; }
.spinner-small { height: 0.75rem; width: 0.75rem; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 4rem 1rem; color: #6b7280;
    height: 100%;
}
.empty-icon { background-color: #f3f4f6; padding: 1rem; border-radius: 50%; margin-bottom: 1rem; }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>