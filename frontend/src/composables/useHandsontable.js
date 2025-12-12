/**
 * useHandsontable.js
 * Handsontable 集成逻辑 - 在 Vue 3 中封装 Handsontable
 *
 * 参考 store_detail.js 中的加载方式，使用本地资源文件
 */

import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import zhCN from 'handsontable/i18n/languages/zh-CN'

function registerZhCNLanguage() {
	if (!window.Handsontable || !window.Handsontable.languages) return
	const code = 'zh-CN'
	const current = window.Handsontable.languages.getLanguageDictionary(code)
	if (current && current.languageCode === code) return
	try {
		window.Handsontable.languages.registerLanguageDictionary(zhCN)
	} catch (e) {
		console.warn('⚠️ 注册 Handsontable 中文语言包失败', e)
	}
}

/**
 * 加载 Handsontable 资源（CSS 和 JS）
 * 参考 store_detail.js 中的串行加载方式
 */
function loadHandsontableResources() {
	return new Promise((resolve, reject) => {
		// 检查是否已加载
		if (window.Handsontable) {
			console.log('✅ Handsontable already loaded')
			resolve()
			return
		}

		// 加载 CSS
		const loadCSS = (id, href) => {
			return new Promise((resolve, reject) => {
				if (document.getElementById(id)) {
					resolve()
					return
				}

				const link = document.createElement('link')
				link.id = id
				link.rel = 'stylesheet'
				link.href = href
				link.onload = () => {
					console.log(`✅ CSS loaded: ${href}`)
					resolve()
				}
				link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`))
				document.head.appendChild(link)
			})
		}

		// 加载 JS
		const loadJS = (src) => {
			return new Promise((resolve, reject) => {
				if (window.Handsontable) {
					resolve()
					return
				}

				const script = document.createElement('script')
				script.src = src
				script.onload = () => {
					console.log(`✅ JS loaded: ${src}`)
					resolve()
				}
				script.onerror = () => reject(new Error(`Failed to load JS: ${src}`))
				document.head.appendChild(script)
			})
		}

		// 串行加载：CSS -> JS
		Promise.resolve()
			.then(() => loadCSS('handsontable-css', '/assets/product_sales_planning/js/lib/handsontable.full.min.css'))
			.then(() => loadJS('/assets/product_sales_planning/js/lib/handsontable.full.min.js'))
			.then(() => {
				console.log('✅ All Handsontable resources loaded')
				registerZhCNLanguage()
				resolve()
			})
			.catch(reject)

		// 设置总超时（10秒）
		setTimeout(() => {
			reject(new Error('Handsontable 资源加载超时，请检查网络或刷新页面'))
		}, 10000)
	})
}

/**
 * useHandsontable composable
 *
 * @param {import('vue').Ref} containerRef - 表格容器的 ref
 * @param {Object} options - 配置选项
 * @returns {Object} - { hotInstance, loading, error, selectedRows, updateData, destroy, ... }
 */
export function useHandsontable(containerRef, options = {}) {
	const hotInstance = ref(null)
	const loading = ref(true)
	const error = ref(null)
	const isDestroyed = ref(false)
	const selectedRows = ref(new Set())

	/**
	 * 解析 computed 值的辅助函数
	 * 改进版：更全面地处理 Vue 3 响应式类型
	 */
	const resolveValue = (val) => {
		// 处理 undefined 和 null
		if (val === undefined || val === null) {
			return val
		}
		
		// 处理 Vue 3 computed ref
		if (typeof val === 'object' && 'value' in val) {
			return val.value
		}
		
		// 处理 Vue 3 reactive ref
		if (typeof val === 'function') {
			try {
				return val()
			} catch (e) {
				console.warn('⚠️ Failed to resolve function value:', e)
				return val
			}
		}
		
		return val
	}

	/**
	 * 初始化 Handsontable
	 */
	const initHandsontable = async () => {
		try {
			loading.value = true
			error.value = null

			// 加载 Handsontable 资源
			await loadHandsontableResources()

			// 确保容器存在且已挂载到 DOM
			if (!containerRef.value) {
				throw new Error('Container element not found')
			}

			// 确保容器已挂载到 DOM 树
			if (!containerRef.value.parentNode) {
				throw new Error('Container element not mounted to DOM')
			}

			// 确保 Handsontable 已加载
			if (!window.Handsontable) {
				throw new Error('Handsontable library not loaded')
			}

			// 销毁旧实例（如果存在）
			if (hotInstance.value && !isDestroyed.value) {
				try {
					hotInstance.value.destroy()
					hotInstance.value = null
					console.log('✅ Old Handsontable instance destroyed')
				} catch (e) {
					console.warn('⚠️ Failed to destroy old instance:', e)
				}
			}

			// 创建 Handsontable 实例
			const config = {
				data: resolveValue(options.data) || [],
				columns: resolveValue(options.columns) || [],
				colHeaders: resolveValue(options.colHeaders) || true,
				rowHeaders: resolveValue(options.rowHeaders) !== false,

				// 固定列配置（左侧 2 列固定：商品名称和编码）
				fixedColumnsLeft: options.fixedColumnsLeft !== undefined ? options.fixedColumnsLeft : 3,

				// 许可证
				licenseKey: 'non-commercial-and-evaluation',

				// 布局配置
				stretchH: 'all',
				autoWrapRow: false,
				autoWrapCol: false,
				manualColumnResize: true,
				manualRowResize: true,
				manualRowMove: false,
				manualColumnMove: false,

				// 右键菜单配置（增强版）
				contextMenu: options.contextMenu !== false ? {
					items: {
						'row_above': { name: '在上方插入行' },
						'row_below': { name: '在下方插入行' },
						'separator1': '---------',
						'remove_row': {
							name: '删除选中行',
							disabled: () => selectedRows.value.size === 0
						},
						'separator2': '---------',
						'undo': { name: '撤销' },
						'redo': { name: '重做' },
						'separator3': '---------',
						'make_read_only': { name: '设为只读' },
						'alignment': { name: '对齐方式' },
						'separator4': '---------',
						'copy': { name: '复制' },
						'cut': { name: '剪切' }
					}
				} : false,

				// 下拉菜单配置（包含列隐藏功能）
				dropdownMenu: options.dropdownMenu !== false ? [
					'filter_by_condition',
					'filter_by_value',
					'filter_action_bar',
					'alignment'
				] : false,

				// 启用筛选器
				filters: options.filters !== false,

				// 启用列排序
				columnSorting: options.columnSorting !== false,
				sortIndicator: true,

				// 启用隐藏列功能
				hiddenColumns: {
					indicators: true,
					columns: resolveValue(options.hiddenColumns) || [],
					copyPasteEnabled: true
				},

				// 启用复制粘贴
				copyPaste: true,

				// 性能优化
				renderAllRows: false,
				viewportRowRenderingOffset: 30,
				viewportColumnRenderingOffset: 10,
				selectionMode: 'multiple',
				language: 'zh-CN',
				wordWrap: false,

				// 事件回调
				afterChange: (changes, source) => {
					if (source !== 'loadData' && options.onDataChange) {
						options.onDataChange(changes, source)
					}
				},
				afterSelection: (row, col, row2, col2) => {
					if (options.onSelection) {
						options.onSelection(row, col, row2, col2)
					}
				},
				afterSelectionEnd: (row, col, row2, col2) => {
					// 跟踪选中的行（支持范围选择）
					const minRow = Math.min(row, row2)
					const maxRow = Math.max(row, row2)
					const newSelection = new Set()

					for (let i = minRow; i <= maxRow; i++) {
						newSelection.add(i)
					}

					selectedRows.value = newSelection

					// 触发选择变化回调
					if (options.onSelectionChange) {
						options.onSelectionChange(Array.from(newSelection))
					}
				},
				afterDeselect: () => {
					// 清空选择
					selectedRows.value = new Set()
					if (options.onSelectionChange) {
						options.onSelectionChange([])
					}
				},

				// 合并额外配置（解析 computed 值）
				...(options.config ? Object.keys(options.config).reduce((acc, key) => {
					acc[key] = resolveValue(options.config[key])
					return acc
				}, {}) : {})
			}

			hotInstance.value = new window.Handsontable(containerRef.value, config)
			isDestroyed.value = false
			console.log('✅ Handsontable initialized successfully')
			loading.value = false

			// 🔧 修复：延迟加载初始数据，确保 computed 链路完成
			await nextTick()
			await nextTick() // 双重 nextTick 确保所有 computed 都已计算

			const initialData = resolveValue(options.data)
			console.log('📦 Attempting to load initial data:', {
				hasData: !!initialData,
				isArray: Array.isArray(initialData),
				length: initialData?.length,
				sampleRow: initialData?.[0]
			})

			if (initialData && Array.isArray(initialData) && initialData.length > 0) {
				console.log('✅ Loading initial data:', initialData.length, 'rows')
				updateData(initialData)
			} else {
				console.warn('⚠️ No initial data to load, will wait for watch trigger')
			}
		} catch (err) {
			console.error('❌ Handsontable initialization error:', err)
			error.value = err.message
			loading.value = false
		}
	}

	/**
	 * 更新表格数据
	 * @param {Array} newData - 新数据
	 */
	const updateData = (newData) => {
		console.log('🔄 updateData called:', {
			hasInstance: !!hotInstance.value,
			isDestroyed: isDestroyed.value,
			isLoading: loading.value,
			dataLength: newData?.length,
			dataType: typeof newData,
			isArray: Array.isArray(newData),
			sampleData: newData?.[0]
		})
		
		if (!hotInstance.value || isDestroyed.value) {
			console.warn('⚠️ Cannot update data - instance not ready:', {
				hasInstance: !!hotInstance.value,
				isDestroyed: isDestroyed.value
			})
			return
		}
		
		if (!newData || !Array.isArray(newData)) {
			console.warn('⚠️ Invalid data provided:', newData)
			return
		}
		
		try {
			// 确保数据是纯对象数组，移除所有 Vue 响应式包装
			const plainData = newData.map(row => {
				const plainRow = {}
				for (const key in row) {
					if (Object.prototype.hasOwnProperty.call(row, key)) {
						plainRow[key] = row[key]
					}
				}
				return plainRow
			})
			
			console.log('📦 Loading data into Handsontable:', {
				rowCount: plainData.length,
				columnCount: Object.keys(plainData[0] || {}).length,
				firstRow: plainData[0]
			})
			
			hotInstance.value.loadData(plainData)
			
			// 强制重新渲染
			nextTick(() => {
				if (hotInstance.value && !isDestroyed.value) {
					hotInstance.value.render()
					console.log('✅ Data loaded and rendered successfully')
					
					// 验证渲染结果
					const renderedRows = hotInstance.value.countRows()
					const renderedCols = hotInstance.value.countCols()
					console.log('📊 Rendered table size:', {
						rows: renderedRows,
						cols: renderedCols
					})
					
					if (renderedRows === 0) {
						console.error('❌ Table rendered but has 0 rows!')
					}
				}
			})
		} catch (error) {
			console.error('❌ Error loading data:', error)
			console.error('Error stack:', error.stack)
		}
	}

	/**
	 * 更新表格列配置
	 * @param {Array} newColumns - 新列配置
	 */
	const updateColumns = (newColumns) => {
		if (hotInstance.value && !isDestroyed.value) {
			hotInstance.value.updateSettings({
				columns: newColumns
			})
		}
	}

	/**
	 * 获取表格数据
	 * @returns {Array} - 表格数据
	 */
	const getData = () => {
		if (hotInstance.value && !isDestroyed.value) {
			return hotInstance.value.getData()
		}
		return []
	}

	/**
	 * 获取指定单元格的数据
	 * @param {number} row - 行索引
	 * @param {number} col - 列索引
	 * @returns {*} - 单元格数据
	 */
	const getDataAtCell = (row, col) => {
		if (hotInstance.value && !isDestroyed.value) {
			return hotInstance.value.getDataAtCell(row, col)
		}
		return null
	}

	/**
	 * 设置指定单元格的数据
	 * @param {number} row - 行索引
	 * @param {number} col - 列索引
	 * @param {*} value - 新值
	 */
	const setDataAtCell = (row, col, value) => {
		if (hotInstance.value && !isDestroyed.value) {
			hotInstance.value.setDataAtCell(row, col, value)
		}
	}

	/**
	 * 渲染表格
	 */
	const render = () => {
		if (hotInstance.value && !isDestroyed.value) {
			hotInstance.value.render()
		}
	}

	/**
	 * 获取选中的行索引
	 * @returns {Array} - 选中的行索引数组
	 */
	const getSelectedRows = () => {
		return Array.from(selectedRows.value)
	}

	/**
	 * 清空选择
	 */
	const clearSelection = () => {
		selectedRows.value = new Set()
		if (hotInstance.value && !isDestroyed.value) {
			hotInstance.value.deselectCell()
		}
		if (options.onSelectionChange) {
			options.onSelectionChange([])
		}
	}

	/**
	 * 选择所有行
	 */
	const selectAllRows = () => {
		if (hotInstance.value && !isDestroyed.value) {
			const rowCount = hotInstance.value.countRows()
			const newSelection = new Set()
			for (let i = 0; i < rowCount; i++) {
				newSelection.add(i)
			}
			selectedRows.value = newSelection

			// 选中所有单元格
			if (rowCount > 0) {
				const colCount = hotInstance.value.countCols()
				hotInstance.value.selectCell(0, 0, rowCount - 1, colCount - 1)
			}

			if (options.onSelectionChange) {
				options.onSelectionChange(Array.from(newSelection))
			}
		}
	}

	/**
	 * 销毁 Handsontable 实例
	 */
	const destroy = () => {
		if (hotInstance.value && !isDestroyed.value) {
			hotInstance.value.destroy()
			hotInstance.value = null
			isDestroyed.value = true
			selectedRows.value = new Set()
			console.log('✅ Handsontable destroyed')
		}
	}

	// 组件挂载时初始化
	onMounted(() => {
		initHandsontable()
	})

	// 组件卸载时销毁
	onBeforeUnmount(() => {
		destroy()
	})

	// 🔧 修复：恢复数据监听，确保数据变化时自动更新表格
	if (options.data) {
		watch(() => options.data, async (newData) => {
			const resolvedData = resolveValue(newData)
			console.log('👀 Data watch triggered:', {
				hasData: !!resolvedData,
				dataLength: resolvedData?.length,
				hasInstance: !!hotInstance.value,
				isLoading: loading.value,
				isDestroyed: isDestroyed.value
			})
			
			// 等待实例完全初始化
			if (!hotInstance.value || loading.value || isDestroyed.value) {
				console.log('⏳ Waiting for instance to be ready...')
				return
			}
			
			if (resolvedData && Array.isArray(resolvedData) && resolvedData.length > 0) {
				await nextTick()
				console.log('🔄 Auto-updating data from watch:', resolvedData.length, 'rows')
				updateData(resolvedData)
			} else {
				console.warn('⚠️ Watch triggered but no valid data:', resolvedData)
			}
		}, { deep: false, immediate: true })  // ✅ 改为 immediate: true
	}

	// 监听列配置变化
	if (options.columns) {
		watch(() => options.columns, async (newColumns) => {
			const resolvedColumns = resolveValue(newColumns)
			if (resolvedColumns && Array.isArray(resolvedColumns) &&
			    hotInstance.value && !loading.value && !isDestroyed.value) {
				await nextTick()
				updateColumns(resolvedColumns)
			}
		}, { deep: false, immediate: false })
	}

	return {
		hotInstance,
		loading,
		error,
		selectedRows,
		updateData,
		updateColumns,
		getData,
		getDataAtCell,
		setDataAtCell,
		render,
		destroy,
		getSelectedRows,
		clearSelection,
		selectAllRows
	}
}
