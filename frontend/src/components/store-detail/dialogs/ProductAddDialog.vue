<template>
	<Dialog 
		v-model="dialogOpen" 
		:options="{
			title: '添加商品',
			size: '4xl'
		}"
	>
		<template #body-content>
			<div class="product-add-dialog">
				<!-- 搜索和筛选区域 -->
				<div class="search-filter-section">
					<div class="section-header">
						<FeatherIcon name="search" class="w-4 h-4 text-blue-600" />
						<h3 class="section-title">搜索商品</h3>
					</div>
					
					<div class="filter-grid">
						<div class="filter-item">
							<label class="filter-label">
								<span>商品搜索</span>
								<span class="text-gray-400 text-xs ml-1">(编码/名称)</span>
							</label>
							<Input
								v-model="searchTerm"
								placeholder="输入商品编码或名称"
								@update:model-value="handleSearchInput"
							>
								<template #prefix>
									<FeatherIcon name="search" class="w-4 h-4 text-gray-400" />
								</template>
							</Input>
						</div>
						
						<div class="filter-item">
							<label class="filter-label">品牌筛选</label>
							<Select
								v-model="selectedBrand"
								:options="brandOptions"
								placeholder="全部品牌"
							/>
						</div>
						
						<div class="filter-item">
							<label class="filter-label">分类筛选</label>
							<Select
								v-model="selectedCategory"
								:options="categoryOptions"
								placeholder="全部分类"
							/>
						</div>
					</div>
					
					<div class="filter-summary">
						<div class="flex items-center gap-2 text-sm text-gray-600">
							<FeatherIcon name="package" class="w-4 h-4" />
							<span>候选商品：<strong class="text-gray-900">{{ filterResultCount }}</strong> 个</span>
						</div>
						<Badge v-if="selectedProducts.size" theme="blue" size="md">
							<FeatherIcon name="check-circle" class="w-3 h-3 mr-1" />
							已选 {{ selectedProducts.size }} 个
						</Badge>
					</div>
				</div>

				<!-- 商品列表区域 -->
				<div class="product-list-section">
					<div class="section-header">
						<FeatherIcon name="list" class="w-4 h-4 text-blue-600" />
						<h3 class="section-title">商品列表</h3>
					</div>
					
					<!-- 加载状态 -->
					<div v-if="loading" class="loading-state">
						<Spinner class="w-6 h-6 text-blue-600" />
						<span class="loading-text">正在加载商品数据...</span>
					</div>

					<!-- 空状态 -->
					<div v-else-if="paginatedProducts.length === 0" class="empty-state">
						<FeatherIcon name="inbox" class="w-12 h-12 text-gray-300" />
						<div class="empty-title">没有找到商品</div>
						<div class="empty-description">请尝试调整搜索条件或筛选器</div>
					</div>

					<!-- 商品列表 -->
					<div v-else class="product-list">
						<!-- 全选选项 -->
						<div class="select-all-item">
							<Checkbox
								:model-value="isAllSelected"
								@change="toggleSelectAll"
							/>
							<label class="select-all-label" @click="toggleSelectAll">
								<span class="font-medium">全选当前页</span>
								<span class="text-gray-500 text-sm ml-2">
									(已选择 {{ selectedProducts.size }} / {{ filteredProducts.length }} 个)
								</span>
							</label>
						</div>

						<!-- 商品项列表 -->
						<div class="product-items">
							<div
								v-for="product in paginatedProducts"
								:key="product.code"
								class="product-item"
								:class="{ 
									'product-item-selected': selectedProducts.has(product.code),
									'product-item-disabled': isProductAdded(product)
								}"
								@click="!isProductAdded(product) && toggleProduct(product.code)"
							>
								<div class="product-checkbox">
									<Checkbox
										:model-value="selectedProducts.has(product.code)"
										:disabled="isProductAdded(product)"
										@change.stop="toggleProduct(product.code)"
									/>
								</div>
								
								<div class="product-info">
									<div class="product-header">
										<div class="product-code-name">
											<span class="product-code">{{ product.code }}</span>
											<span class="product-separator">-</span>
											<span class="product-name">{{ product.name1 }}</span>
										</div>
										<Badge v-if="isProductAdded(product)" theme="gray" size="xs">
											<FeatherIcon name="check" class="w-3 h-3 mr-1" />
											已存在
										</Badge>
									</div>
									
									<div class="product-details">
										<div v-if="product.specifications" class="product-detail-item">
											<FeatherIcon name="box" class="w-3 h-3" />
											<span>{{ product.specifications }}</span>
										</div>
										<div v-if="product.brand" class="product-detail-item">
											<FeatherIcon name="tag" class="w-3 h-3" />
											<span>{{ product.brand }}</span>
										</div>
										<div v-if="product.category" class="product-detail-item">
											<FeatherIcon name="folder" class="w-3 h-3" />
											<span>{{ product.category }}</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- 分页控制 -->
				<div v-if="totalPages > 1" class="pagination-section">
					<div class="pagination-info">
						显示 <strong>{{ startIndex }}</strong> - <strong>{{ endIndex }}</strong> 条，
						共 <strong>{{ filteredProducts.length }}</strong> 条
					</div>
					<div class="pagination-controls">
						<Button
							variant="ghost"
							theme="gray"
							icon-left="chevron-left"
							size="sm"
							:disabled="currentPage === 1"
							@click="goToPage(currentPage - 1)"
						>
							上一页
						</Button>
						<div class="pagination-pages">
							<span class="current-page">{{ currentPage }}</span>
							<span class="page-separator">/</span>
							<span class="total-pages">{{ totalPages }}</span>
						</div>
						<Button
							variant="ghost"
							theme="gray"
							icon-right="chevron-right"
							size="sm"
							:disabled="currentPage === totalPages"
							@click="goToPage(currentPage + 1)"
						>
							下一页
						</Button>
					</div>
				</div>
			</div>
		</template>

		<template #actions>
			<div class="dialog-actions">
				<Button 
					variant="subtle" 
					theme="gray"
					icon-left="x"
					@click="handleClose"
				>
					取消
				</Button>
				<Button
					variant="solid"
					theme="blue"
					icon-left="check"
					:disabled="selectedProducts.size === 0 || adding"
					:loading="adding"
					@click="handleAdd"
				>
					<span v-if="adding">添加中...</span>
					<span v-else>确认添加 ({{ selectedProducts.size }})</span>
				</Button>
			</div>
		</template>
	</Dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Dialog, Button, Input, Select, Checkbox, Badge, Spinner, FeatherIcon, toast, call } from 'frappe-ui'

// Props
const props = defineProps({
	show: {
		type: Boolean,
		default: false
	},
	storeId: {
		type: String,
		required: true
	},
	taskId: {
		type: String,
		required: true
	},
	existingProducts: {
		type: Array,
		default: () => []
	}
})

// Emits
const emit = defineEmits(['close', 'success'])

// State
const loading = ref(false)
const adding = ref(false)
const products = ref([])
const selectedProducts = ref(new Set())
const searchTerm = ref('')
const debouncedSearchTerm = ref('')
const selectedBrand = ref('')
const selectedCategory = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const searchDebounceTimer = ref(null)

const dialogOpen = computed({
	get: () => props.show,
	set: (val) => {
		if (!val) handleClose()
	}
})

// 品牌和分类列表
const brands = computed(() => {
	const brandSet = new Set()
	products.value.forEach(p => {
		if (p.brand) brandSet.add(p.brand)
	})
	return Array.from(brandSet).sort()
})

const categories = computed(() => {
	const categorySet = new Set()
	products.value.forEach(p => {
		if (p.category) categorySet.add(p.category)
	})
	return Array.from(categorySet).sort()
})

const brandOptions = computed(() => [{ label: '全部品牌', value: '' }, ...brands.value.map(b => ({ label: b, value: b }))])
const categoryOptions = computed(() => [{ label: '全部分类', value: '' }, ...categories.value.map(c => ({ label: c, value: c }))])

// 已添加商品的 Set（用于快速查找）
const existingProductCodes = computed(() => {
	return new Set(props.existingProducts.map(p => p.code || p.commodity_code))
})

// 检查商品是否已添加
const isProductAdded = (product) => {
	return existingProductCodes.value.has(product.code)
}

// 筛选后的产品
const filteredProducts = computed(() => {
	let result = products.value

	if (debouncedSearchTerm.value) {
		const search = debouncedSearchTerm.value.toLowerCase()
		result = result.filter(p => {
			return (
				(p.code || '').toLowerCase().includes(search) ||
				(p.name1 || '').toLowerCase().includes(search)
			)
		})
	}

	if (selectedBrand.value) {
		result = result.filter(p => p.brand === selectedBrand.value)
	}

	if (selectedCategory.value) {
		result = result.filter(p => p.category === selectedCategory.value)
	}

	return result
})

// 筛选结果数量
const filterResultCount = computed(() => filteredProducts.value.length)

// 分页后的产品
const paginatedProducts = computed(() => {
	const start = (currentPage.value - 1) * pageSize.value
	const end = start + pageSize.value
	return filteredProducts.value.slice(start, end)
})

// 总页数
const totalPages = computed(() => Math.ceil(filteredProducts.value.length / pageSize.value) || 1)

// 显示范围
const startIndex = computed(() => (currentPage.value - 1) * pageSize.value + 1)
const endIndex = computed(() => {
	const end = currentPage.value * pageSize.value
	return end > filteredProducts.value.length ? filteredProducts.value.length : end
})

// 是否全选
const isAllSelected = computed(() => {
	return paginatedProducts.value.length > 0 &&
		paginatedProducts.value.every(p => selectedProducts.value.has(p.code) || isProductAdded(p))
})

// 加载产品列表
const loadProducts = async () => {
	loading.value = true
	try {
		const response = await call('frappe.client.get_list', {
			doctype: 'Product List',
			fields: ['name as code', 'name1', 'specifications', 'brand', 'category'],
			limit_page_length: 500,
			or_filters: searchTerm.value
				? [
					['code', 'like', `%${searchTerm.value}%`],
					['name1', 'like', `%${searchTerm.value}%`]
				]
				: [],
			order_by: 'name1 asc'
		})

		products.value = Array.isArray(response) ? response : []
	} catch (error) {
		toast.error(error.message || '加载产品失败')
	} finally {
		loading.value = false
	}
}

// 切换产品选择
const toggleProduct = (productCode) => {
	const newSet = new Set(selectedProducts.value)
	if (newSet.has(productCode)) {
		newSet.delete(productCode)
	} else {
		newSet.add(productCode)
	}
	selectedProducts.value = newSet
}

// 切换全选
const toggleSelectAll = () => {
	const newSet = new Set(selectedProducts.value)
	if (isAllSelected.value) {
		paginatedProducts.value.forEach(p => {
			if (!isProductAdded(p)) {
				newSet.delete(p.code)
			}
		})
	} else {
		paginatedProducts.value.forEach(p => {
			if (!isProductAdded(p)) {
				newSet.add(p.code)
			}
		})
	}
	selectedProducts.value = newSet
}

// 分页跳转
const goToPage = (page) => {
	if (page < 1 || page > totalPages.value) return
	currentPage.value = page
}

// 处理添加
const handleAdd = async () => {
	if (selectedProducts.value.size === 0) {
		toast.warning('请选择要添加的商品')
		return
	}

	adding.value = true
	try {
		const productCodes = Array.from(selectedProducts.value)
		const response = await call(
			'product_sales_planning.api.v1.commodity.bulk_insert_commodity_schedule',
			{
				store_id: props.storeId,
				task_id: props.taskId,
				codes: JSON.stringify(productCodes)
			}
		)

		if (response && response.status === 'success') {
			const skippedMessage = response.skipped > 0 ? `，跳过 ${response.skipped} 个已存在的商品` : ''
			toast.success(`成功添加 ${response.count} 个商品${skippedMessage}`)
			emit('success')
			handleClose()
		} else {
			toast.error(response?.msg || response?.message || '添加失败')
		}
	} catch (error) {
		toast.error(error.message || '添加失败')
	} finally {
		adding.value = false
	}
}

// 关闭对话框
const handleClose = () => {
	if (adding.value) return
	selectedProducts.value = new Set()
	searchTerm.value = ''
	selectedBrand.value = ''
	selectedCategory.value = ''
	currentPage.value = 1
	emit('close')
}

// 输入防抖
const handleSearchInput = (value) => {
	searchTerm.value = value
}

// 搜索防抖处理
watch(searchTerm, (newVal) => {
	if (searchDebounceTimer.value) {
		clearTimeout(searchDebounceTimer.value)
	}

	searchDebounceTimer.value = setTimeout(() => {
		debouncedSearchTerm.value = newVal
		currentPage.value = 1
	}, 300)
})

// 监听筛选条件变化，重置到第一页
watch([selectedBrand, selectedCategory], () => {
	currentPage.value = 1
})

// 监听防抖后的搜索词变化
watch(debouncedSearchTerm, () => {
	currentPage.value = 1
})

// 监听对话框显示状态
watch(() => props.show, (newVal) => {
	if (newVal) {
		loadProducts()
	}
})

// 组件挂载时加载产品
onMounted(() => {
	if (props.show) {
		loadProducts()
	}
})
</script>

<style scoped>
/* ========================================
   主容器
   ======================================== */
.product-add-dialog {
	display: flex;
	flex-direction: column;
	gap: 1.5rem;
	max-height: 70vh;
	overflow: hidden;
}

/* ========================================
   区域标题
   ======================================== */
.section-header {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	margin-bottom: 1rem;
	padding-bottom: 0.75rem;
	border-bottom: 2px solid #e5e7eb;
}

.section-title {
	font-size: 0.875rem;
	font-weight: 600;
	color: #1f2937;
	text-transform: uppercase;
	letter-spacing: 0.025em;
}

/* ========================================
   搜索和筛选区域
   ======================================== */
.search-filter-section {
	background: #f9fafb;
	border: 1px solid #e5e7eb;
	border-radius: 0.75rem;
	padding: 1.25rem;
}

.filter-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 1rem;
	margin-bottom: 1rem;
}

.filter-item {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.filter-label {
	font-size: 0.875rem;
	font-weight: 500;
	color: #374151;
	display: flex;
	align-items: center;
}

.filter-summary {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-top: 1rem;
	border-top: 1px solid #e5e7eb;
}

/* ========================================
   商品列表区域
   ======================================== */
.product-list-section {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-height: 0;
}

.product-list {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
	overflow-y: auto;
	padding: 0.5rem;
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 0.5rem;
	max-height: 400px;
}

/* 滚动条样式 */
.product-list::-webkit-scrollbar {
	width: 8px;
}

.product-list::-webkit-scrollbar-track {
	background: #f3f4f6;
	border-radius: 4px;
}

.product-list::-webkit-scrollbar-thumb {
	background: #d1d5db;
	border-radius: 4px;
}

.product-list::-webkit-scrollbar-thumb:hover {
	background: #9ca3af;
}

/* ========================================
   全选选项
   ======================================== */
.select-all-item {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 1rem;
	background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
	border: 2px solid #3b82f6;
	border-radius: 0.5rem;
	cursor: pointer;
	transition: all 0.2s ease;
}

.select-all-item:hover {
	background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
	transform: translateY(-1px);
	box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.select-all-label {
	flex: 1;
	display: flex;
	align-items: center;
	font-size: 0.875rem;
	color: #1e40af;
	cursor: pointer;
	user-select: none;
}

/* ========================================
   商品项
   ======================================== */
.product-items {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}

.product-item {
	display: flex;
	align-items: flex-start;
	gap: 0.75rem;
	padding: 1rem;
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 0.5rem;
	cursor: pointer;
	transition: all 0.2s ease;
}

.product-item:hover:not(.product-item-disabled) {
	background: #f9fafb;
	border-color: #3b82f6;
	transform: translateX(2px);
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.product-item-selected {
	background: #eff6ff;
	border-color: #3b82f6;
	box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.product-item-disabled {
	opacity: 0.5;
	cursor: not-allowed;
	background: #f9fafb;
}

.product-checkbox {
	flex-shrink: 0;
	padding-top: 0.125rem;
}

.product-info {
	flex: 1;
	min-width: 0;
}

.product-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
	margin-bottom: 0.5rem;
}

.product-code-name {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex: 1;
	min-width: 0;
}

.product-code {
	font-size: 0.875rem;
	font-weight: 600;
	color: #1f2937;
	font-family: 'Monaco', 'Courier New', monospace;
	flex-shrink: 0;
}

.product-separator {
	color: #9ca3af;
	flex-shrink: 0;
}

.product-name {
	font-size: 0.875rem;
	font-weight: 500;
	color: #374151;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.product-details {
	display: flex;
	flex-wrap: wrap;
	gap: 0.75rem;
}

.product-detail-item {
	display: flex;
	align-items: center;
	gap: 0.375rem;
	font-size: 0.75rem;
	color: #6b7280;
	padding: 0.25rem 0.5rem;
	background: #f3f4f6;
	border-radius: 0.25rem;
}

/* ========================================
   加载和空状态
   ======================================== */
.loading-state,
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 3rem 1rem;
	gap: 1rem;
	background: #f9fafb;
	border: 2px dashed #e5e7eb;
	border-radius: 0.75rem;
}

.loading-text {
	font-size: 0.875rem;
	color: #6b7280;
}

.empty-title {
	font-size: 1rem;
	font-weight: 600;
	color: #374151;
}

.empty-description {
	font-size: 0.875rem;
	color: #6b7280;
}

/* ========================================
   分页控制
   ======================================== */
.pagination-section {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1rem;
	background: #f9fafb;
	border: 1px solid #e5e7eb;
	border-radius: 0.5rem;
	gap: 1rem;
}

.pagination-info {
	font-size: 0.875rem;
	color: #6b7280;
}

.pagination-info strong {
	color: #1f2937;
	font-weight: 600;
}

.pagination-controls {
	display: flex;
	align-items: center;
	gap: 0.75rem;
}

.pagination-pages {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	padding: 0.375rem 0.75rem;
	background: #ffffff;
	border: 1px solid #e5e7eb;
	border-radius: 0.375rem;
	font-size: 0.875rem;
}

.current-page {
	font-weight: 600;
	color: #3b82f6;
}

.page-separator {
	color: #9ca3af;
}

.total-pages {
	color: #6b7280;
}

/* ========================================
   对话框操作区域
   ======================================== */
.dialog-actions {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 0.75rem;
	width: 100%;
}

/* ========================================
   响应式设计
   ======================================== */
@media (max-width: 768px) {
	.product-add-dialog {
		max-height: 80vh;
	}
	
	.filter-grid {
		grid-template-columns: 1fr;
	}
	
	.filter-summary {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
	}
	
	.product-list {
		max-height: 300px;
	}
	
	.pagination-section {
		flex-direction: column;
		align-items: stretch;
	}
	
	.pagination-controls {
		justify-content: center;
	}
	
	.product-code-name {
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
	}
	
	.product-separator {
		display: none;
	}
}

/* ========================================
   Dialog 层级保护
   ======================================== */
:deep(.modal-container) {
	z-index: 1050 !important;
}

:deep(.modal-backdrop) {
	z-index: 1040 !important;
}

:deep(.modal-content) {
	position: relative;
	z-index: 1;
}
</style>
