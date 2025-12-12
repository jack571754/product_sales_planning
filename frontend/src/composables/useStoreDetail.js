/**
 * 店铺详情管理 Composable
 * 整合所有店铺详情相关的业务逻辑
 * 
 * 功能包括：
 * - 数据加载与刷新
 * - 筛选与分页
 * - 批量保存与删除
 * - 导出功能
 * - 列设置管理
 * - 选择状态管理
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { createResource, call } from 'frappe-ui'
import { debounce } from '../utils/helpers'

/**
 * 列设置的 localStorage 键名
 */
const COLUMN_SETTINGS_KEY = 'store_detail_column_settings'

/**
 * 店铺详情管理主函数
 * @param {string} storeId - 店铺ID
 * @param {string} taskId - 任务ID
 * @returns {Object} 包含所有状态、计算属性和方法的对象
 */
export function useStoreDetail(storeId, taskId) {
	// ==================== 状态管理 ====================
	
	/**
	 * 筛选条件
	 */
	const filters = ref({
		search: '',
		category: ''
	})

	/**
	 * 分页配置
	 */
	const pagination = ref({
		currentPage: 1,
		pageSize: 50,
		pageSizeOptions: [20, 50, 100, 200]
	})

	/**
	 * 列设置（隐藏列）
	 */
	const columnSettings = ref({
		hiddenColumns: []
	})

	/**
	 * 保存状态
	 */
	const isSaving = ref(false)
	const saveError = ref(null)
	const lastSaveTime = ref(null)

	/**
	 * 选择状态
	 */
	const selectedRows = ref(new Set())
	const selectedCodes = ref(new Set())

	// ==================== API 资源 ====================

	/**
	 * 商品数据资源
	 */
	const commodityData = createResource({
		url: 'product_sales_planning.api.v1.commodity.get_store_commodity_data',
		params: () => ({
			store_id: storeId,
			task_id: taskId,
			view_mode: 'multi',
			start: (pagination.value.currentPage - 1) * pagination.value.pageSize,
			page_length: pagination.value.pageSize,
			search_term: filters.value.search || null,
			category: filters.value.category || null
		}),
		auto: true,
		transform: (data) => {
			return {
				commodities: data.data || [],
				months: data.months || [],
				store_info: data.store_info || {},
				task_info: data.task_info || {},
				can_edit: data.can_edit !== undefined ? data.can_edit : true,
				total_count: data.total_count || 0
			}
		}
	})

	// ==================== 计算属性 ====================

	/**
	 * 店铺信息
	 */
	const storeInfo = computed(() => {
		return commodityData.data?.store_info || {}
	})

	/**
	 * 任务信息
	 */
	const taskInfo = computed(() => {
		return commodityData.data?.task_info || {}
	})

	/**
	 * 是否可编辑
	 */
	const canEdit = computed(() => {
		return commodityData.data?.can_edit || false
	})

	/**
	 * 总记录数
	 */
	const totalCount = computed(() => {
		return commodityData.data?.total_count || 0
	})

	/**
	 * 总页数
	 */
	const totalPages = computed(() => {
		return Math.ceil(totalCount.value / pagination.value.pageSize) || 1
	})

	/**
	 * 月份列表
	 */
	const months = computed(() => {
		return commodityData.data?.months || []
	})

	/**
	 * 原始商品数据
	 */
	const rawCommodities = computed(() => {
		return commodityData.data?.commodities || []
	})

	/**
	 * 过滤后的商品数据（用于兼容性）
	 */
	const filteredCommodities = computed(() => {
		return rawCommodities.value
	})

	/**
	 * 统计数据
	 */
	const statistics = computed(() => {
		const commodities = rawCommodities.value
		let totalQuantity = 0

		// 计算总计划量
		commodities.forEach(item => {
			if (item.months) {
				Object.values(item.months).forEach(monthData => {
					totalQuantity += Number(monthData?.quantity || 0)
				})
			}
		})

		// 计算已计划SKU数量
		const plannedSKU = commodities.filter(item => {
			if (!item.months) return false
			return Object.values(item.months).some(monthData => (monthData?.quantity || 0) > 0)
		}).length

		return {
			totalSKU: commodities.length,
			totalQuantity: totalQuantity,
			plannedSKU: plannedSKU
		}
	})

	/**
	 * 筛选选项
	 */
	const filterOptions = computed(() => {
		const commodities = rawCommodities.value
		const categories = new Set()

		commodities.forEach(item => {
			if (item.category) {
				categories.add(item.category)
			}
		})

		return {
			categories: Array.from(categories).sort()
		}
	})

	/**
	 * 选中数量
	 */
	const selectedCount = computed(() => {
		return selectedCodes.value.size
	})

	/**
	 * 是否有选中项
	 */
	const hasSelection = computed(() => {
		return selectedCodes.value.size > 0
	})

	// ==================== 表格数据转换 ====================

	/**
	 * 生成表格列配置
	 */
	const generateColumns = () => {
		const columns = [
			{
				data: '__selected',
				title: '',
				type: 'checkbox',
				width: 50,
				className: 'htCenter htMiddle'
			},
			{
				data: 'name1',
				title: '商品名称',
				readOnly: true,
				width: 250,
				className: 'htLeft htMiddle'
			},
			{
				data: 'code',
				title: '编码',
				readOnly: true,
				width: 120
			},
			{
				data: 'specifications',
				title: '规格',
				readOnly: true,
				width: 100
			},
			{
				data: 'brand',
				title: '品牌',
				readOnly: true,
				width: 100
			},
			{
				data: 'category',
				title: '类别',
				readOnly: true,
				width: 100
			}
		]

		// 添加月份列
		months.value.forEach(month => {
			columns.push({
				data: month,
				title: month,
				type: 'numeric',
				readOnly: !canEdit.value,
				width: 100,
				numericFormat: {
					pattern: '0,0'
				}
			})
		})

		return columns
	}

	/**
	 * 生成表格表头
	 */
	const generateHeaders = () => {
		const headers = ['选择', '商品名称', '编码', '规格', '品牌', '类别']
		months.value.forEach(month => {
			headers.push(month)
		})
		return headers
	}

	/**
	 * 转换数据为表格格式
	 */
	const transformDataForTable = () => {
		return rawCommodities.value.map((item, index) => {
			const row = {
				__selected: selectedRows.value.has(index),
				name1: item.commodity_name || item.name1,
				code: item.commodity_code || item.code,
				specifications: item.specifications || '',
				brand: item.brand || '',
				category: item.category || ''
			}

			// 添加月份数据
			months.value.forEach(month => {
				const monthData = item.months?.[month]
				row[month] = monthData?.quantity ?? 0
			})

			return row
		})
	}

	// ==================== 列设置管理 ====================

	/**
	 * 从 localStorage 加载列设置
	 */
	const loadColumnSettings = () => {
		try {
			const saved = localStorage.getItem(COLUMN_SETTINGS_KEY)
			if (saved) {
				const settings = JSON.parse(saved)
				columnSettings.value = {
					hiddenColumns: settings.hiddenColumns || []
				}
			}
		} catch (error) {
			console.error('加载列设置失败:', error)
		}
	}

	/**
	 * 保存列设置到 localStorage
	 */
	const saveColumnSettings = debounce(() => {
		try {
			localStorage.setItem(COLUMN_SETTINGS_KEY, JSON.stringify(columnSettings.value))
		} catch (error) {
			console.error('保存列设置失败:', error)
		}
	}, 500)

	/**
	 * 切换列的显示/隐藏
	 */
	const toggleColumn = (columnName) => {
		const index = columnSettings.value.hiddenColumns.indexOf(columnName)
		if (index > -1) {
			columnSettings.value.hiddenColumns.splice(index, 1)
		} else {
			columnSettings.value.hiddenColumns.push(columnName)
		}
		saveColumnSettings()
	}

	/**
	 * 重置列设置
	 */
	const resetColumnSettings = () => {
		columnSettings.value.hiddenColumns = []
		saveColumnSettings()
	}

	/**
	 * 检查列是否隐藏
	 */
	const isColumnHidden = (columnName) => {
		return columnSettings.value.hiddenColumns.includes(columnName)
	}

	// ==================== 方法 ====================

	/**
	 * 刷新数据
	 */
	const refreshData = async () => {
		await commodityData.reload()
	}

	/**
	 * 更新筛选条件
	 */
	const updateFilters = (newFilters) => {
		filters.value = { ...filters.value, ...newFilters }
		pagination.value.currentPage = 1
		clearSelection()
		commodityData.reload()
	}

	/**
	 * 更新分页配置
	 */
	const updatePagination = (newPagination) => {
		pagination.value = { ...pagination.value, ...newPagination }
		clearSelection()
		commodityData.reload()
	}

	/**
	 * 批量保存更改
	 */
	const batchSaveChanges = async (changes) => {
		isSaving.value = true
		saveError.value = null

		try {
			const fixedColumnCount = 6 // 选择框 + 5个固定列
			const updates = changes
				.map(([row, col, oldValue, newValue]) => {
					const commodity = rawCommodities.value[row]
					const monthIndex = col - fixedColumnCount

					if (!commodity || monthIndex < 0 || monthIndex >= months.value.length) {
						return null
					}

					return {
						code: commodity.commodity_code || commodity.code,
						month: months.value[monthIndex],
						quantity: newValue
					}
				})
				.filter(Boolean)

			const response = await call(
				'product_sales_planning.api.v1.commodity.batch_update_month_quantities',
				{
					store_id: storeId,
					task_id: taskId,
					updates: JSON.stringify(updates)
				}
			)

			if (response?.status === 'success') {
				lastSaveTime.value = new Date()
				return { success: true, message: '保存成功' }
			}

			saveError.value = response?.message || '保存失败'
			return { success: false, message: response?.message || '保存失败' }
		} catch (error) {
			console.error('保存失败:', error)
			saveError.value = error.message || '保存失败'
			return { success: false, message: error.message || '保存失败' }
		} finally {
			isSaving.value = false
		}
	}

	/**
	 * 导出到 Excel
	 */
	const exportToExcel = async () => {
		try {
			const response = await call(
				'product_sales_planning.api.v1.import_export.export_commodity_data',
				{
					store_id: storeId,
					task_id: taskId
				}
			)

			if (response?.status === 'success') {
				window.open(response.file_url, '_blank')
				return {
					success: true,
					message: `成功导出 ${response.record_count} 条记录`
				}
			}

			return {
				success: false,
				message: response?.message || '导出失败'
			}
		} catch (error) {
			return {
				success: false,
				message: error.message || '导出失败'
			}
		}
	}

	/**
	 * 更新选中行
	 */
	const updateSelectedRows = (rowIndices) => {
		selectedRows.value = new Set(rowIndices)

		// 更新选中的商品编码
		const codes = new Set()
		rowIndices.forEach(rowIndex => {
			const commodity = rawCommodities.value[rowIndex]
			if (commodity) {
				const code = commodity.commodity_code || commodity.code
				if (code) {
					codes.add(code)
				}
			}
		})
		selectedCodes.value = codes
	}

	/**
	 * 清除选择
	 */
	const clearSelection = () => {
		selectedRows.value = new Set()
		selectedCodes.value = new Set()
	}

	/**
	 * 批量删除选中项
	 */
	const batchDeleteSelected = async () => {
		if (selectedCodes.value.size === 0) {
			return {
				success: false,
				message: '请先选择要删除的商品'
			}
		}

		try {
			const codes = Array.from(selectedCodes.value)
			const response = await call(
				'product_sales_planning.api.v1.commodity.batch_delete_by_codes',
				{
					store_id: storeId,
					task_id: taskId,
					codes: JSON.stringify(codes)
				}
			)

			if (response?.status === 'success') {
				clearSelection()
				await refreshData()
				return {
					success: true,
					message: response.message || `成功删除 ${response.count} 条记录`
				}
			}

			return {
				success: false,
				message: response?.message || '删除失败'
			}
		} catch (error) {
			return {
				success: false,
				message: error.message || '删除失败'
			}
		}
	}

	// ==================== 生命周期 ====================

	/**
	 * 组件挂载时加载列设置
	 */
	onMounted(() => {
		loadColumnSettings()
	})

	/**
	 * 监听列设置变化
	 */
	watch(columnSettings, () => {
		saveColumnSettings()
	}, { deep: true })

	// ==================== 返回 ====================

	return {
		// 状态
		filters,
		pagination,
		columnSettings,
		selectedRows,
		selectedCodes,
		isSaving,
		saveError,
		lastSaveTime,

		// 数据
		storeInfo,
		taskInfo,
		canEdit,
		statistics,
		totalCount,
		totalPages,
		months,
		rawCommodities,
		filteredCommodities,
		filterOptions,
		selectedCount,
		hasSelection,

		// 加载状态
		loading: computed(() => commodityData.loading),
		error: computed(() => commodityData.error),

		// 表格相关
		generateColumns,
		generateHeaders,
		transformDataForTable,

		// 列设置方法
		toggleColumn,
		resetColumnSettings,
		isColumnHidden,

		// 方法
		refreshData,
		updateFilters,
		updatePagination,
		batchSaveChanges,
		exportToExcel,
		updateSelectedRows,
		clearSelection,
		batchDeleteSelected
	}
}
