<template>
	<div v-if="show" class="fixed inset-0 z-[9999] overflow-y-auto">
		<!-- 背景遮罩 -->
		<div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" @click="handleClose"></div>

		<!-- 对话框内容 -->
		<div class="flex min-h-full items-center justify-center p-4">
			<div class="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
				<!-- 头部 -->
				<div class="flex items-center justify-between p-6 border-b flex-shrink-0">
					<h3 class="text-lg font-semibold text-gray-900">添加商品</h3>
					<button
						@click="handleClose"
						class="text-gray-400 hover:text-gray-500 transition-colors"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- 搜索和筛选 -->
				<div class="p-6 border-b flex-shrink-0">
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
						<!-- 搜索框 -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">搜索商品</label>
							<input
								v-model="searchTerm"
								type="text"
								placeholder="输入商品编码或名称"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>

						<!-- 品牌筛选 -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">品牌</label>
							<select
								v-model="selectedBrand"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="">全部品牌</option>
								<option v-for="brand in brands" :key="brand" :value="brand">
									{{ brand }}
								</option>
							</select>
						</div>

						<!-- 分类筛选 -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2">分类</label>
							<select
								v-model="selectedCategory"
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="">全部分类</option>
								<option v-for="category in categories" :key="category" :value="category">
									{{ category }}
								</option>
							</select>
						</div>
					</div>
				</div>

				<!-- 产品列表 -->
				<div class="flex-1 overflow-y-auto p-6">
					<div v-if="loading" class="flex items-center justify-center py-12">
						<div class="text-center">
							<div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
							<div class="mt-2 text-gray-600">加载中...</div>
						</div>
					</div>

					<div v-else-if="filteredProducts.length === 0" class="text-center py-12 text-gray-500">
						没有找到商品
					</div>

					<div v-else class="space-y-2">
						<!-- 全选 -->
						<div class="flex items-center p-3 bg-gray-50 rounded-md">
							<input
								type="checkbox"
								:checked="isAllSelected"
								@change="toggleSelectAll"
								class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
							/>
							<label class="ml-3 text-sm font-medium text-gray-700">
								全选 (已选择 {{ selectedProducts.size }} 个商品)
							</label>
						</div>

						<!-- 产品列表 -->
						<div
							v-for="product in paginatedProducts"
							:key="product.code"
							class="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
							@click="toggleProduct(product.code)"
						>
							<input
								type="checkbox"
								:checked="selectedProducts.has(product.code)"
								@change.stop="toggleProduct(product.code)"
								class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
							/>
							<div class="ml-3 flex-1">
								<div class="text-sm font-medium text-gray-900">
									{{ product.code }} - {{ product.name1 }}
								</div>
								<div class="text-xs text-gray-500 mt-1">
									<span v-if="product.specifications">规格: {{ product.specifications }}</span>
									<span v-if="product.brand" class="ml-3">品牌: {{ product.brand }}</span>
									<span v-if="product.category" class="ml-3">分类: {{ product.category }}</span>
								</div>
							</div>
						</div>
					</div>

					<!-- 分页 -->
					<div v-if="totalPages > 1" class="mt-4 flex items-center justify-between">
						<div class="text-sm text-gray-600">
							显示 {{ startIndex }} - {{ endIndex }} 条，共 {{ filteredProducts.length }} 条
						</div>
						<div class="flex items-center gap-2">
							<button
								@click="currentPage--"
								:disabled="currentPage === 1"
								class="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								上一页
							</button>
							<span class="text-sm text-gray-600">
								第 {{ currentPage }} / {{ totalPages }} 页
							</span>
							<button
								@click="currentPage++"
								:disabled="currentPage === totalPages"
								class="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								下一页
							</button>
						</div>
					</div>
				</div>

				<!-- 底部按钮 -->
				<div class="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 flex-shrink-0">
					<button
						@click="handleClose"
						class="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						取消
					</button>
					<button
						@click="handleAdd"
						:disabled="selectedProducts.size === 0 || adding"
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						<span v-if="adding">正在添加...</span>
						<span v-else>添加 ({{ selectedProducts.size }})</span>
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { call } from 'frappe-ui'

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

// 已添加商品的 Set（用于快速查找）
const existingProductCodes = computed(() => {
	return new Set(props.existingProducts.map(p => p.code))
})

// 检查商品是否已添加
const isProductAdded = (product) => {
	return existingProductCodes.value.has(product.code)
}

// 筛选后的产品
const filteredProducts = computed(() => {
	let result = products.value

	// 搜索筛选（使用防抖后的搜索词）
	if (debouncedSearchTerm.value) {
		const search = debouncedSearchTerm.value.toLowerCase()
		result = result.filter(p => {
			return (
				(p.code || '').toLowerCase().includes(search) ||
				(p.name1 || '').toLowerCase().includes(search)
			)
		})
	}

	// 品牌筛选
	if (selectedBrand.value) {
		result = result.filter(p => p.brand === selectedBrand.value)
	}

	// 分类筛选
	if (selectedCategory.value) {
		result = result.filter(p => p.category === selectedCategory.value)
	}

	return result
})

// 筛选结果数量
const filterResultCount = computed(() => {
	return filteredProducts.value.length
})

// 分页后的产品
const paginatedProducts = computed(() => {
	const start = (currentPage.value - 1) * pageSize.value
	const end = start + pageSize.value
	return filteredProducts.value.slice(start, end)
})

// 总页数
const totalPages = computed(() => {
	return Math.ceil(filteredProducts.value.length / pageSize.value)
})

// 显示范围
const startIndex = computed(() => {
	return (currentPage.value - 1) * pageSize.value + 1
})

const endIndex = computed(() => {
	const end = currentPage.value * pageSize.value
	return end > filteredProducts.value.length ? filteredProducts.value.length : end
})

// 是否全选
const isAllSelected = computed(() => {
	return paginatedProducts.value.length > 0 &&
		paginatedProducts.value.every(p => selectedProducts.value.has(p.code))
})

// 加载产品列表
const loadProducts = async () => {
	loading.value = true
	try {
		// 使用自定义 API 获取产品列表
		const response = await call(
			'product_sales_planning.planning_system.page.store_detail.store_detail.get_product_list_for_dialog',
			{
				store_id: props.storeId,
				task_id: props.taskId
			}
		)

		if (response && response.status === 'success') {
			products.value = response.data || []
		} else {
			console.error('加载产品失败:', response?.message)
			alert('加载产品失败：' + (response?.message || '未知错误'))
		}
	} catch (error) {
		console.error('加载产品失败:', error)
		alert('加载产品失败：' + error.message)
	} finally {
		loading.value = false
	}
}

// 切换产品选择
const toggleProduct = (productCode) => {
	if (selectedProducts.value.has(productCode)) {
		selectedProducts.value.delete(productCode)
	} else {
		selectedProducts.value.add(productCode)
	}
}

// 切换全选
const toggleSelectAll = () => {
	if (isAllSelected.value) {
		// 取消全选当前页
		paginatedProducts.value.forEach(p => {
			selectedProducts.value.delete(p.code)
		})
	} else {
		// 全选当前页
		paginatedProducts.value.forEach(p => {
			selectedProducts.value.add(p.code)
		})
	}
}

// 处理添加
const handleAdd = async () => {
	if (selectedProducts.value.size === 0) {
		alert('请选择要添加的商品')
		return
	}

	adding.value = true
	try {
		const productCodes = Array.from(selectedProducts.value)
		const response = await call(
			'product_sales_planning.planning_system.page.store_detail.store_detail.bulk_insert_commodity_schedule',
			{
				store_id: props.storeId,
				task_id: props.taskId,
				codes: JSON.stringify(productCodes)
			}
		)

		if (response && response.status === 'success') {
			alert(`成功添加 ${response.count} 个商品${response.skipped > 0 ? `，跳过 ${response.skipped} 个已存在的商品` : ''}`)
			emit('success')
			handleClose()
		} else {
			alert(response?.msg || response?.message || '添加失败')
		}
	} catch (error) {
		console.error('添加失败:', error)
		alert('添加失败：' + error.message)
	} finally {
		adding.value = false
	}
}

// 关闭对话框
const handleClose = () => {
	if (!adding.value) {
		selectedProducts.value.clear()
		searchTerm.value = ''
		selectedBrand.value = ''
		selectedCategory.value = ''
		currentPage.value = 1
		emit('close')
	}
}

// 搜索防抖处理
watch(searchTerm, (newVal) => {
	// 清除之前的定时器
	if (searchDebounceTimer.value) {
		clearTimeout(searchDebounceTimer.value)
	}

	// 设置新的定时器（300ms 防抖）
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
/* 自定义样式 */
</style>
