/**
 * useStoreDetail.js
 * Store Detail 页面的主业务逻辑
 *
 * 负责：
 * - 数据加载和管理
 * - 筛选和分页
 * - 数据保存
 * - 统计计算
 */

import { ref, computed, watch } from 'vue'
import { createResource, call } from 'frappe-ui'

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} - 防抖后的函数
 */
function debounce(func, delay) {
	let timeoutId = null
	return function(...args) {
		if (timeoutId) {
			clearTimeout(timeoutId)
		}
		timeoutId = setTimeout(() => {
			func.apply(this, args)
		}, delay)
	}
}

/**
 * useStoreDetail composable
 *
 * @param {string} storeId - 店铺 ID
 * @param {string} taskId - 任务 ID
 * @returns {Object} - 业务逻辑和状态
 */
export function useStoreDetail(storeId, taskId) {
	// ==================== 状态管理 ====================

	// 筛选条件
	const filters = ref({
		search: '', // 搜索关键词
		category: '' // 分类筛选
	})

	// 分页
	const pagination = ref({
		currentPage: 1,
		pageSize: 50, // 默认每页 50 条
		pageSizeOptions: [20, 50, 100, 200]
	})

	// 列显示设置
	const columnSettings = ref({
		hiddenColumns: [] // 隐藏的列索引
	})

	// 保存状态管理
	const isSaving = ref(false)
	const saveError = ref(null)
	const lastSaveTime = ref(null)

	// 行选择状态管理（用于批量删除）
	const selectedRows = ref(new Set()) // 存储选中的行索引
	const selectedCodes = ref(new Set()) // 存储选中的商品编码

	// ==================== API 资源 ====================

	// 加载商品数据（使用服务端分页）
	const commodityData = createResource({
		url: 'product_sales_planning.api.v1.commodity.get_store_commodity_data',
		params: () => ({
			store_id: storeId,
			task_id: taskId,
			view_mode: 'multi',
			// 服务端分页参数
			start: (pagination.value.currentPage - 1) * pagination.value.pageSize,
			page_length: pagination.value.pageSize,
			// 筛选参数
			search_term: filters.value.search || null,
			brand: filters.value.brand || null,
			category: filters.value.category || null
		}),
		auto: true,
		transform: (data) => {
			console.log('API 返回的原始数据:', data)

			// API 直接返回数据对象，不包装在 status 字段中
			if (data) {
				return {
					commodities: data.data || [],
					months: data.months || [],
					store_info: data.store_info || {},
					task_info: data.task_info || {},
					can_edit: data.can_edit !== undefined ? data.can_edit : true,
					edit_reason: data.edit_reason || '',
					approval_status: data.approval_status || {},
					total_count: data.total_count || 0 // 服务端返回的总记录数
				}
			}
			return {
				commodities: [],
				months: [],
				store_info: {},
				task_info: {},
				can_edit: false,
				edit_reason: '',
				approval_status: {},
				total_count: 0
			}
		}
	})

	// 加载筛选选项（从商品数据中提取）
	const filterOptionsData = computed(() => {
		const commodities = rawCommodities.value
		const mechanisms = new Set()
		const categories = new Set()

		commodities.forEach(item => {
			if (item.mechanism) mechanisms.add(item.mechanism)
			if (item.category) categories.add(item.category)
		})

		return {
			mechanisms: Array.from(mechanisms).sort(),
			categories: Array.from(categories).sort()
		}
	})

	// ==================== 计算属性 ====================

	// 原始商品数据
	const rawCommodities = computed(() => {
		return commodityData.data?.commodities || []
	})

	// 月份列表
	const months = computed(() => {
		const monthList = commodityData.data?.months || []
		if (monthList.length) return monthList

		// 当接口返回单月视图或缺少 months 字段时，尝试从数据中推导
		const derived = new Set()
		;(commodityData.data?.commodities || []).forEach((item) => {
			if (item?.months) {
				Object.keys(item.months).forEach((m) => derived.add(m))
			} else if (item?.sub_date) {
				const monthKey = typeof item.sub_date === 'string'
					? item.sub_date.slice(0, 7)
					: (item.sub_date?.slice ? item.sub_date.slice(0, 7) : null)
				if (monthKey) derived.add(monthKey)
			}
		})
		return Array.from(derived).sort()
	})

	// 店铺信息
	const storeInfo = computed(() => {
		return commodityData.data?.store_info || {}
	})

	// 任务信息
	const taskInfo = computed(() => {
		return commodityData.data?.task_info || {}
	})

	// 是否可编辑
	const canEdit = computed(() => {
		return commodityData.data?.can_edit || false
	})

	// 审批状态
	const approvalStatus = computed(() => {
		return commodityData.data?.approval_status || {}
	})

	// 总记录数（从服务端获取）
	const totalCount = computed(() => {
		return commodityData.data?.total_count || 0
	})

	// 筛选后的商品数据（服务端分页，直接使用返回的数据）
	const filteredCommodities = computed(() => {
		return rawCommodities.value
	})

	// 分页后的商品数据（服务端分页，直接使用返回的数据）
	const paginatedCommodities = computed(() => {
		return rawCommodities.value
	})

	// 总页数（基于服务端返回的总记录数）
	const totalPages = computed(() => {
		return Math.ceil(totalCount.value / pagination.value.pageSize) || 1
	})

	// 统计信息
	const statistics = computed(() => {
		const commodities = filteredCommodities.value

		// 计算总计划量
		let totalQuantity = 0
		commodities.forEach(item => {
			if (item.months) {
				Object.values(item.months).forEach(monthData => {
					const qty = monthData?.quantity || 0
					totalQuantity += Number(qty)
				})
			}
		})

		return {
			totalSKU: commodities.length, // 总 SKU 数
			totalQuantity: totalQuantity, // 总计划量
			plannedSKU: commodities.filter(item => {
				// 至少有一个月份有数量的 SKU
				if (!item.months) return false
				return Object.values(item.months).some(monthData => {
					return (monthData?.quantity || 0) > 0
				})
			}).length
		}
	})

	// ==================== 方法 ====================

	/**
	 * 刷新数据
	 */
	const refreshData = async () => {
		await commodityData.reload()
	}

	/**
	 * 更新筛选条件
	 * @param {Object} newFilters - 新的筛选条件
	 */
	const updateFilters = (newFilters) => {
		filters.value = { ...filters.value, ...newFilters }
		clearSelection()
		// 重置到第一页
		pagination.value.currentPage = 1
		// 重新加载数据（服务端分页）
		commodityData.reload()
	}

	/**
	 * 更新分页
	 * @param {Object} newPagination - 新的分页设置
	 */
	const updatePagination = (newPagination) => {
		pagination.value = { ...pagination.value, ...newPagination }
		clearSelection()
		// 重新加载数据（服务端分页）
		commodityData.reload()
	}

	/**
	 * 保存单个月份数量（内部实现，不防抖）
	 * @param {string} code - 商品编码
	 * @param {string} month - 月份
	 * @param {number} quantity - 数量
	 */
	const _saveMonthQuantityInternal = async (code, month, quantity) => {
		isSaving.value = true
		saveError.value = null

		try {
			const response = await call(
				'product_sales_planning.api.v1.commodity.update_month_quantity',
				{
					store_id: storeId,
					task_id: taskId,
					code: code,
					month: month,
					quantity: quantity
				}
			)

			if (response && response.status === 'success') {
				lastSaveTime.value = new Date()
				return { success: true, message: '保存成功' }
			} else {
				saveError.value = response?.message || '保存失败'
				return { success: false, message: response?.message || '保存失败' }
			}
		} catch (error) {
			console.error('保存失败:', error)
			saveError.value = error.message || '保存失败'
			return { success: false, message: error.message || '保存失败' }
		} finally {
			isSaving.value = false
		}
	}

	/**
	 * 保存单个月份数量（防抖版本，500ms 延迟）
	 * @param {string} code - 商品编码
	 * @param {string} month - 月份
	 * @param {number} quantity - 数量
	 */
	const saveMonthQuantity = debounce(_saveMonthQuantityInternal, 500)

	/**
	 * 批量保存数据
	 * @param {Array} changes - 变更数据 [[row, col, oldValue, newValue], ...]
	 */
	const batchSaveChanges = async (changes) => {
		try {
			const fixedColumnCount = 6 // 选择列 + 5 个基础信息列

			// 将 Handsontable 的 changes 转换为 API 需要的格式
			const updates = changes
				.map(([row, col, oldValue, newValue]) => {
					const commodity = paginatedCommodities.value[row]
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

			if (response && response.status === 'success') {
				return { success: true, message: '批量保存成功' }
			} else {
				return { success: false, message: response?.message || '批量保存失败' }
			}
		} catch (error) {
			console.error('批量保存失败:', error)
			return { success: false, message: error.message || '批量保存失败' }
		}
	}

	/**
	 * 导出数据到 Excel
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

			if (response && response.status === 'success') {
				// 打开下载链接
				window.open(response.file_url, '_blank')
				return { success: true, message: `成功导出 ${response.record_count} 条记录` }
			} else {
				return { success: false, message: response?.message || '导出失败' }
			}
		} catch (error) {
			console.error('导出失败:', error)
			return { success: false, message: error.message || '导出失败' }
		}
	}

	/**
	 * 生成 Handsontable 的列配置
	 */
	const generateColumns = () => {
		const columns = [
			{
				data: '__selected',
				title: '',
				type: 'checkbox',
				width: 50,
				className: 'htCenter htMiddle',
				readOnly: !canEdit.value
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
	 * 生成 Handsontable 的表头
	 */
	const generateHeaders = () => {
		const headers = ['选择', '商品名称', '编码', '规格', '品牌', '类别']
		months.value.forEach(month => {
			headers.push(month)
		})
		return headers
	}

	/**
	 * 转换数据为 Handsontable 格式
	 */
	const transformDataForTable = () => {
		const result = paginatedCommodities.value.map((item, index) => {
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
				// 从 months 对象中获取数量
				const monthData = item.months?.[month]
				let fallbackQty = 0
				if (!monthData && item.sub_date) {
					const monthKey = typeof item.sub_date === 'string'
						? item.sub_date.slice(0, 7)
						: (item.sub_date?.slice ? item.sub_date.slice(0, 7) : null)
					if (monthKey === month) {
						fallbackQty = item.quantity || 0
					}
				}
				row[month] = monthData?.quantity ?? fallbackQty ?? 0
			})

			return row
		})
		
		console.log('🔄 transformDataForTable:', {
			paginatedCount: paginatedCommodities.value.length,
			monthsCount: months.value.length,
			resultCount: result.length,
			sampleRow: result[0],
			sampleItem: paginatedCommodities.value[0]
		})
		
		return result
	}

	// ==================== 批量删除功能 ====================

	/**
	 * 选中行数量
	 */
	const selectedCount = computed(() => selectedCodes.value.size)

	/**
	 * 是否有选中的行
	 */
	const hasSelection = computed(() => selectedCodes.value.size > 0)

	/**
	 * 更新选中的行（从 Handsontable 的选择事件触发）
	 * @param {Array} rowIndices - 选中的行索引数组
	 */
	const updateSelectedRows = (rowIndices) => {
		selectedRows.value = new Set(rowIndices)

		// 根据行索引获取商品编码
		const codes = new Set()
		rowIndices.forEach(rowIndex => {
			const commodity = paginatedCommodities.value[rowIndex]
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
	 * 清空选择
	 */
	const clearSelection = () => {
		selectedRows.value = new Set()
		selectedCodes.value = new Set()
	}

	/**
	 * 批量删除选中的商品
	 */
	const batchDeleteSelected = async () => {
		if (selectedCodes.value.size === 0) {
			return { success: false, message: '请先选择要删除的商品' }
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

			if (response && response.status === 'success') {
				// 清空选择
				clearSelection()
				// 刷新数据
				await refreshData()
				return {
					success: true,
					message: response.message || `成功删除 ${response.count} 条记录`
				}
			} else {
				return {
					success: false,
					message: response?.message || '删除失败'
				}
			}
		} catch (error) {
			console.error('批量删除失败:', error)
			return {
				success: false,
				message: error.message || '删除失败'
			}
		}
	}

	// ==================== 返回 ====================

	return {
		// 状态
		filters,
		pagination,
		columnSettings,

		// 数据
		rawCommodities,
		filteredCommodities,
		paginatedCommodities,
		months,
		storeInfo,
		taskInfo,
		canEdit,
		approvalStatus,

		// 统计
		statistics,
		totalPages,
		totalCount,

		// 加载状态
		loading: computed(() => commodityData.loading),
		error: computed(() => commodityData.error),

		// 保存状态
		isSaving,
		saveError,
		lastSaveTime,

		// 筛选选项
		filterOptions: filterOptionsData,

		// 批量删除状态
		selectedRows,
		selectedCodes,
		selectedCount,
		hasSelection,

		// 方法
		refreshData,
		updateFilters,
		updatePagination,
		saveMonthQuantity,
		batchSaveChanges,
		exportToExcel,
		generateColumns,
		generateHeaders,
		transformDataForTable,
		// 批量删除方法
		updateSelectedRows,
		clearSelection,
		batchDeleteSelected
	}
}
