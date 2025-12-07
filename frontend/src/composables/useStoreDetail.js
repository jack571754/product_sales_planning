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
		mechanism: '', // 机制筛选
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

	// ==================== API 资源 ====================

	// 加载商品数据
	const commodityData = createResource({
		url: 'product_sales_planning.planning_system.page.store_detail.store_detail.get_store_commodity_data',
		params: () => ({
			store_id: storeId,
			task_id: taskId,
			view_mode: 'multi'
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
					approval_status: data.approval_status || {}
				}
			}
			return {
				commodities: [],
				months: [],
				store_info: {},
				task_info: {},
				can_edit: false,
				edit_reason: '',
				approval_status: {}
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
		return commodityData.data?.months || []
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

	// 筛选后的商品数据
	const filteredCommodities = computed(() => {
		let result = rawCommodities.value

		// 搜索筛选
		if (filters.value.search) {
			const searchLower = filters.value.search.toLowerCase()
			result = result.filter(item => {
				return (
					(item.code || '').toLowerCase().includes(searchLower) ||
					(item.name1 || '').toLowerCase().includes(searchLower)
				)
			})
		}

		// 机制筛选
		if (filters.value.mechanism) {
			result = result.filter(item => item.mechanism === filters.value.mechanism)
		}

		// 分类筛选
		if (filters.value.category) {
			result = result.filter(item => item.category === filters.value.category)
		}

		return result
	})

	// 分页后的商品数据
	const paginatedCommodities = computed(() => {
		const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
		const end = start + pagination.value.pageSize
		return filteredCommodities.value.slice(start, end)
	})

	// 总页数
	const totalPages = computed(() => {
		return Math.ceil(filteredCommodities.value.length / pagination.value.pageSize)
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
		// 重置到第一页
		pagination.value.currentPage = 1
	}

	/**
	 * 更新分页
	 * @param {Object} newPagination - 新的分页设置
	 */
	const updatePagination = (newPagination) => {
		pagination.value = { ...pagination.value, ...newPagination }
	}

	/**
	 * 保存单个月份数量
	 * @param {string} code - 商品编码
	 * @param {string} month - 月份
	 * @param {number} quantity - 数量
	 */
	const saveMonthQuantity = async (code, month, quantity) => {
		try {
			const response = await call(
				'product_sales_planning.planning_system.page.store_detail.store_detail.update_month_quantity',
				{
					store_id: storeId,
					task_id: taskId,
					code: code,
					month: month,
					quantity: quantity
				}
			)

			if (response && response.status === 'success') {
				return { success: true, message: '保存成功' }
			} else {
				return { success: false, message: response?.message || '保存失败' }
			}
		} catch (error) {
			console.error('保存失败:', error)
			return { success: false, message: error.message || '保存失败' }
		}
	}

	/**
	 * 批量保存数据
	 * @param {Array} changes - 变更数据 [[row, col, oldValue, newValue], ...]
	 */
	const batchSaveChanges = async (changes) => {
		try {
			// 将 Handsontable 的 changes 转换为 API 需要的格式
			const updates = changes.map(([row, col, oldValue, newValue]) => {
				const commodity = paginatedCommodities.value[row]
				const month = months.value[col - 2] // 前两列是商品编码和名称

				return {
					code: commodity.commodity_code,
					month: month,
					quantity: newValue
				}
			})

			const response = await call(
				'product_sales_planning.planning_system.page.store_detail.store_detail.batch_update_quantities',
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
	 * 生成 Handsontable 的列配置
	 */
	const generateColumns = () => {
		const columns = [
			{
				data: 'code',
				title: '商品编码',
				readOnly: true,
				width: 120
			},
			{
				data: 'name1',
				title: '商品名称',
				readOnly: true,
				width: 200
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
		const headers = ['商品编码', '商品名称']
		months.value.forEach(month => {
			headers.push(month)
		})
		return headers
	}

	/**
	 * 转换数据为 Handsontable 格式
	 */
	const transformDataForTable = () => {
		return paginatedCommodities.value.map(item => {
			const row = {
				code: item.code,
				name1: item.name1
			}

			// 添加月份数据
			months.value.forEach(month => {
				// 从 months 对象中获取数量
				const monthData = item.months?.[month]
				row[month] = monthData?.quantity || 0
			})

			return row
		})
	}

	// ==================== 监听器 ====================

	// 监听筛选条件变化
	watch(filters, () => {
		// 筛选变化时重置到第一页
		pagination.value.currentPage = 1
	}, { deep: true })

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

		// 加载状态
		loading: computed(() => commodityData.loading),
		error: computed(() => commodityData.error),

		// 筛选选项
		filterOptions: filterOptionsData,

		// 方法
		refreshData,
		updateFilters,
		updatePagination,
		saveMonthQuantity,
		batchSaveChanges,
		generateColumns,
		generateHeaders,
		transformDataForTable
	}
}
