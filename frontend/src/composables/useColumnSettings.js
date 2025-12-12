/**
 * useColumnSettings.js
 * 列设置管理 composable
 *
 * 负责：
 * - 列显示/隐藏设置的持久化
 * - 使用 localStorage 保存用户偏好
 */

import { ref, watch } from 'vue'

const STORAGE_KEY = 'store-detail-columns'

/**
 * useColumnSettings composable
 *
 * @returns {Object} - 列设置管理方法和状态
 */
export function useColumnSettings() {
	// 隐藏的列索引数组
	const hiddenColumns = ref([])

	// 列宽设置（可选）
	const columnWidths = ref({})

	// 列顺序（可选）
	const columnOrder = ref([])

	/**
	 * 从 localStorage 加载列设置
	 */
	const loadColumnSettings = () => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY)
			if (saved) {
				const settings = JSON.parse(saved)
				hiddenColumns.value = settings.hiddenColumns || []
				columnWidths.value = settings.columnWidths || {}
				columnOrder.value = settings.columnOrder || []
				console.log('✅ 列设置已加载:', settings)
			}
		} catch (error) {
			console.error('❌ 加载列设置失败:', error)
		}
	}

	/**
	 * 保存列设置到 localStorage
	 */
	const saveColumnSettings = () => {
		try {
			const settings = {
				hiddenColumns: hiddenColumns.value,
				columnWidths: columnWidths.value,
				columnOrder: columnOrder.value
			}
			localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
			console.log('✅ 列设置已保存:', settings)
		} catch (error) {
			console.error('❌ 保存列设置失败:', error)
		}
	}

	/**
	 * 重置列设置到默认值
	 */
	const resetColumnSettings = () => {
		hiddenColumns.value = []
		columnWidths.value = {}
		columnOrder.value = []
		localStorage.removeItem(STORAGE_KEY)
		console.log('✅ 列设置已重置')
	}

	/**
	 * 切换列的显示/隐藏状态
	 * @param {number} columnIndex - 列索引
	 */
	const toggleColumn = (columnIndex) => {
		const index = hiddenColumns.value.indexOf(columnIndex)
		if (index > -1) {
			// 当前是隐藏状态，显示该列
			hiddenColumns.value.splice(index, 1)
		} else {
			// 当前是显示状态，隐藏该列
			hiddenColumns.value.push(columnIndex)
		}
		saveColumnSettings()
	}

	/**
	 * 隐藏指定列
	 * @param {number} columnIndex - 列索引
	 */
	const hideColumn = (columnIndex) => {
		if (!hiddenColumns.value.includes(columnIndex)) {
			hiddenColumns.value.push(columnIndex)
			saveColumnSettings()
		}
	}

	/**
	 * 显示指定列
	 * @param {number} columnIndex - 列索引
	 */
	const showColumn = (columnIndex) => {
		const index = hiddenColumns.value.indexOf(columnIndex)
		if (index > -1) {
			hiddenColumns.value.splice(index, 1)
			saveColumnSettings()
		}
	}

	/**
	 * 检查列是否隐藏
	 * @param {number} columnIndex - 列索引
	 * @returns {boolean} - 是否隐藏
	 */
	const isColumnHidden = (columnIndex) => {
		return hiddenColumns.value.includes(columnIndex)
	}

	/**
	 * 显示所有列
	 */
	const showAllColumns = () => {
		hiddenColumns.value = []
		saveColumnSettings()
	}

	/**
	 * 隐藏所有列（除了必要的列）
	 * @param {Array} excludeColumns - 不隐藏的列索引数组
	 */
	const hideAllColumns = (excludeColumns = []) => {
		// 获取所有列索引（假设最多 100 列）
		const allColumns = Array.from({ length: 100 }, (_, i) => i)
		hiddenColumns.value = allColumns.filter(col => !excludeColumns.includes(col))
		saveColumnSettings()
	}

	// 监听 hiddenColumns 变化，自动保存
	watch(hiddenColumns, () => {
		saveColumnSettings()
	}, { deep: true })

	// 初始化时加载设置
	loadColumnSettings()

	return {
		// 状态
		hiddenColumns,
		columnWidths,
		columnOrder,

		// 方法
		loadColumnSettings,
		saveColumnSettings,
		resetColumnSettings,
		toggleColumn,
		hideColumn,
		showColumn,
		isColumnHidden,
		showAllColumns,
		hideAllColumns
	}
}
