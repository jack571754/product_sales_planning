/**
 * useHandsontable.js
 * Handsontable 集成逻辑 - 在 Vue 3 中封装 Handsontable
 *
 * 参考 store_detail.js 中的加载方式，使用本地资源文件
 */

import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

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
 * @returns {Object} - { hotInstance, loading, error, updateData, destroy }
 */
export function useHandsontable(containerRef, options = {}) {
	const hotInstance = ref(null)
	const loading = ref(true)
	const error = ref(null)
	const isDestroyed = ref(false)

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

			// 解析配置中的 computed 值
			const resolveValue = (val) => {
				return val && typeof val === 'object' && 'value' in val ? val.value : val
			}

			// 创建 Handsontable 实例
			const config = {
				data: resolveValue(options.data) || [],
				columns: resolveValue(options.columns) || [],
				colHeaders: resolveValue(options.colHeaders) !== false,
				rowHeaders: resolveValue(options.rowHeaders) !== false,
				fixedColumnsLeft: options.fixedColumnsLeft || 2,
				licenseKey: 'non-commercial-and-evaluation',
				stretchH: 'all',
				autoWrapRow: false,
				autoWrapCol: false,
				manualColumnResize: true,
				manualRowResize: true,
				// 使用简化的 contextMenu 配置避免循环引用
				contextMenu: options.contextMenu !== false ? true : false,
				dropdownMenu: options.dropdownMenu || false,
				filters: options.filters || false,
				columnSorting: options.columnSorting || false,
				// 性能优化
				renderAllRows: false,
				viewportRowRenderingOffset: 30,
				viewportColumnRenderingOffset: 10,
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
		if (hotInstance.value && !isDestroyed.value) {
			hotInstance.value.loadData(newData)
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
	 * 销毁 Handsontable 实例
	 */
	const destroy = () => {
		if (hotInstance.value && !isDestroyed.value) {
			hotInstance.value.destroy()
			hotInstance.value = null
			isDestroyed.value = true
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

	// 监听数据变化
	if (options.data) {
		watch(() => options.data, (newData) => {
			if (newData && hotInstance.value && !loading.value) {
				updateData(newData)
			}
		}, { deep: true })
	}

	// 监听列配置变化
	if (options.columns) {
		watch(() => options.columns, (newColumns) => {
			if (newColumns && hotInstance.value && !loading.value) {
				updateColumns(newColumns)
			}
		}, { deep: true })
	}

	return {
		hotInstance,
		loading,
		error,
		updateData,
		updateColumns,
		getData,
		getDataAtCell,
		setDataAtCell,
		render,
		destroy
	}
}
