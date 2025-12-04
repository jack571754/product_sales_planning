// product_sales_planning/planning_system/page/store_detail/store_detail_vue.js
// Vue 组件文件：使用 Vue 3 Composition API + Handsontable

window.initStoreDetailVueApp = function(wrapper, page) {
	const { createApp, reactive, computed, watch, onMounted, ref, nextTick } = Vue;

	const app = createApp({
		setup() {
			// ==================== 响应式状态 ====================
			const state = reactive({
				storeId: null,
				taskId: null,
				data: [],
				months: [],
				stats: { total: 0, filledCount: 0 },
				approvalData: null,
				checkedRows: new Set(),
				isLoading: false,
				isFirstLoad: true,
				isProgrammaticUpdate: false,
				// 高级筛选
				showAdvancedFilters: false,
				advancedFilters: {
					productSearch: '',
					brands: [],
					categories: [],
					quantityMin: null,
					quantityMax: null
				}
			});

			// ==================== Refs ====================
			const hotInstance = ref(null);
			const hotContainer = ref(null);
			const filterStore = ref(null);
			const filterTask = ref(null);
			const filterGroup = ref(null);

			// ==================== 计算属性 ====================
			const canEdit = computed(() => {
				if (!state.approvalData?.workflow?.has_workflow) return true;
				const currentState = state.approvalData.workflow.current_state;
				return state.approvalData.can_edit &&
					currentState.approval_status !== '待审批';
			});

			const showOperationButtons = computed(() => {
				if (!state.approvalData?.workflow?.has_workflow) return true;
				const currentState = state.approvalData.workflow.current_state;
				return (currentState.status === '未开始' && currentState.current_step === 0) ||
					(currentState.approval_status === '已驳回' && state.approvalData.can_edit);
			});

			// ==================== 数据转换函数 ====================
			const prepareDataForHandsontable = (apiData, months) => {
				return apiData.map(item => {
					const row = {
						_code: item.code, // 内部使用
						code: item.code,
						name1: item.name1,
						specifications: item.specifications,
						brand: item.brand,
						category: item.category
					};

					// 添加月份列
					months.forEach(month => {
						row[`month_${month}`] = item.months?.[month]?.quantity || 0;
					});

					return row;
				});
			};

			// ==================== Handsontable 初始化 ====================
			const initHandsontable = () => {
				if (!hotContainer.value) {
					console.error('❌ Handsontable 容器未找到');
					return;
				}

				// 如果已存在实例，先销毁
				if (hotInstance.value) {
					hotInstance.value.destroy();
				}

				// 准备列定义
				const columnDefs = [
					{
						data: 'code',
						title: '编码',
						width: 120,
						readOnly: true
					},
					{
						data: 'name1',
						title: '商品名称',
						width: 200,
						readOnly: true
					},
					{
						data: 'specifications',
						title: '规格',
						width: 100,
						readOnly: true
					},
					{
						data: 'brand',
						title: '品牌',
						width: 100,
						readOnly: true
					},
					{
						data: 'category',
						title: '类别',
						width: 100,
						readOnly: true
					}
				];

				// 动态添加月份列
				state.months.forEach(month => {
					columnDefs.push({
						data: `month_${month}`,
						title: month,
						type: 'numeric',
						width: 120,
						readOnly: !canEdit.value,
						numericFormat: {
							pattern: '0,0'
						}
					});
				});

				// 创建 Handsontable 实例
				hotInstance.value = new Handsontable(hotContainer.value, {
					data: prepareDataForHandsontable(state.data, state.months),
					columns: columnDefs,
					colHeaders: true,
					rowHeaders: true,
					width: '100%',
					height: '100%',
					licenseKey: 'non-commercial-and-evaluation',
					stretchH: 'all',
					autoWrapRow: true,
					autoWrapCol: true,
					manualColumnResize: true,
					manualRowResize: true,
					filters: true,
					dropdownMenu: ['filter_by_condition', 'filter_by_value', 'filter_action_bar'],
					contextMenu: true,
					copyPaste: true,
					fillHandle: {
						direction: 'vertical',
						autoInsertRow: false
					},
					// 单元格编辑后事件
					afterChange: (changes, source) => {
						if (source === 'edit' || source === 'Autofill.fill') {
							handleCellChanges(changes);
						}
					},
					// 粘贴后事件
					afterPaste: (data, coords) => {
						console.log('📋 粘贴数据:', data, coords);
						frappe.show_alert({
							message: '数据已粘贴，正在保存...',
							indicator: 'blue'
						}, 2);
						// 批量保存会在 afterChange 中处理
					},
					// 本地化
					language: 'zh-CN'
				});

				console.log('✅ Handsontable 初始化完成');
			};

			// ==================== 单元格变化处理 ====================
			const handleCellChanges = (changes) => {
				if (!changes || changes.length === 0) return;

				const currentStoreId = state.storeId;
				const currentTaskId = state.taskId;

				if (!currentStoreId || !currentTaskId) {
					frappe.show_alert({
						message: '请先选择店铺和计划任务',
						indicator: 'red'
					}, 3);
					return;
				}

				// 收集所有需要保存的更改
				const updates = [];
				changes.forEach(([row, prop, oldValue, newValue]) => {
					if (oldValue === newValue) return;

					// 检查是否是月份列
					const monthMatch = prop.match(/^month_(.+)$/);
					if (monthMatch) {
						const month = monthMatch[1];
						const rowData = hotInstance.value.getSourceDataAtRow(row);
						const code = rowData._code || rowData.code;

						updates.push({
							code: code,
							month: month,
							quantity: parseInt(newValue) || 0
						});
					}
				});

				if (updates.length > 0) {
					// 批量保存
					batchSaveQuantities(currentStoreId, currentTaskId, updates);
				}
			};

			// ==================== 数据获取 ====================
			const fetchData = (params = null) => {
				const storeId = params ? params.storeId : state.storeId;
				const taskId = params ? params.taskId : state.taskId;

				state.checkedRows.clear();
				state.isLoading = true;

				frappe.call({
					method: "product_sales_planning.planning_system.page.store_detail.store_detail.get_store_commodity_data",
					args: {
						store_id: storeId && storeId !== 'undefined' && storeId !== 'null' ? storeId : null,
						task_id: taskId && taskId !== 'undefined' && taskId !== 'null' ? taskId : null,
						start: 0,
						page_length: 2000,
						view_mode: 'multi'
					},
					freeze: true,
					freeze_message: "加载数据...",
					callback: (r) => {
						if (r.message && !r.message.error) {
							state.data = r.message.data || [];
							state.months = r.message.months || [];

							// 更新 Handsontable
							if (hotInstance.value) {
								hotInstance.value.loadData(prepareDataForHandsontable(state.data, state.months));
								// 更新列定义（月份可能变化）
								updateHandsontableColumns();
							} else {
								initHandsontable();
							}

							updateStats();
							loadApprovalStatus(storeId, taskId);
						} else {
							state.data = [];
							state.months = [];
							if (hotInstance.value) {
								hotInstance.value.loadData([]);
							}
							updateStats();
							loadApprovalStatus(storeId, taskId);
							if (r.message && r.message.error) {
								frappe.msgprint(r.message.error);
							}
						}
						state.isLoading = false;
					},
					error: (err) => {
						console.error('数据加载失败:', err);
						frappe.msgprint('数据加载失败，请稍后重试');
						state.data = [];
						state.months = [];
						if (hotInstance.value) {
							hotInstance.value.loadData([]);
						}
						updateStats();
						loadApprovalStatus(storeId, taskId);
						state.isLoading = false;
					}
				});
			};

			// ==================== 更新 Handsontable 列 ====================
			const updateHandsontableColumns = () => {
				if (!hotInstance.value) return;

				const columnDefs = [
					{ data: 'code', title: '编码', width: 120, readOnly: true },
					{ data: 'name1', title: '商品名称', width: 200, readOnly: true },
					{ data: 'specifications', title: '规格', width: 100, readOnly: true },
					{ data: 'brand', title: '品牌', width: 100, readOnly: true },
					{ data: 'category', title: '类别', width: 100, readOnly: true }
				];

				state.months.forEach(month => {
					columnDefs.push({
						data: `month_${month}`,
						title: month,
						type: 'numeric',
						width: 120,
						readOnly: !canEdit.value,
						numericFormat: { pattern: '0,0' }
					});
				});

				hotInstance.value.updateSettings({
					columns: columnDefs
				});
			};

			// ==================== 批量保存数量 ====================
			const batchSaveQuantities = (storeId, taskId, updates) => {
				frappe.call({
					method: "product_sales_planning.planning_system.page.store_detail.store_detail.batch_update_month_quantities",
					args: {
						store_id: storeId,
						task_id: taskId,
						updates: updates
					},
					callback: (r) => {
						if (r.message && r.message.status === "success") {
							frappe.show_alert({
								message: `成功保存 ${r.message.count} 条记录`,
								indicator: 'green'
							}, 2);
							updateStats();
						} else {
							frappe.show_alert({
								message: r.message?.msg || '保存失败',
								indicator: 'red'
							}, 3);
						}
					},
					error: (err) => {
						frappe.show_alert({ message: '保存失败', indicator: 'red' }, 3);
						console.error("保存失败:", err);
					}
				});
			};

			// ==================== 统计卡片更新 ====================
			const updateStats = () => {
				let total = 0;
				let filledCount = 0;

				state.data.forEach(item => {
					let itemTotal = 0;
					if (item.months) {
						Object.values(item.months).forEach(monthData => {
							itemTotal += monthData.quantity || 0;
						});
					}
					total += itemTotal;
					if (itemTotal > 0) {
						filledCount++;
					}
				});

				state.stats.total = total;
				state.stats.filledCount = filledCount;
			};

			// ==================== Frappe 筛选器初始化 ====================
			const initFrappeFilters = () => {
				filterGroup.value = new frappe.ui.FieldGroup({
					fields: [
						{
							fieldname: 'store_id',
							label: '店铺',
							fieldtype: 'Link',
							options: 'Store List',
							change: () => {
								if (!state.isProgrammaticUpdate) {
									console.log('🔄 店铺筛选器变化');
									setTimeout(() => onFilterChange(), 50);
								}
							}
						},
						{
							fieldname: 'task_id',
							label: '计划任务',
							fieldtype: 'Link',
							options: 'Schedule tasks',
							change: () => {
								if (!state.isProgrammaticUpdate) {
									console.log('🔄 任务筛选器变化');
									setTimeout(() => onFilterChange(), 50);
								}
							}
						}
					],
					body: $(wrapper).find('.filter-card')
				});

				filterGroup.value.make();

				// 手动布局到指定位置
				if (filterStore.value && filterTask.value) {
					filterGroup.value.fields_dict.store_id.$wrapper.appendTo(filterStore.value);
					filterGroup.value.fields_dict.task_id.$wrapper.appendTo(filterTask.value);
				}
			};

			// ==================== 筛选器变化处理 ====================
			const onFilterChange = () => {
				if (state.isProgrammaticUpdate) return;

				const storeId = filterGroup.value.get_value('store_id');
				const taskId = filterGroup.value.get_value('task_id');

				// 更新路由
				const currentRoute = frappe.get_route();
				const newStoreId = storeId || '';
				const newTaskId = taskId || '';

				if (currentRoute[1] !== newStoreId || currentRoute[2] !== newTaskId) {
					frappe.set_route('store-detail', newStoreId, newTaskId);
				} else {
					fetchData();
				}
			};

			// ==================== 路由同步 ====================
			const refreshFromRoute = () => {
				const route = frappe.get_route();
				console.log('🔄 路由刷新:', route);

				const hasValidParams = route[1] && route[1] !== 'undefined' && route[1] !== 'null' && route[1] !== '';

				if (hasValidParams) {
					const storeId = decodeURIComponent(route[1]);
					const taskId = route[2] && route[2] !== 'undefined' && route[2] !== 'null' && route[2] !== ''
						? decodeURIComponent(route[2])
						: null;

					console.log('📍 解析路由参数:', { storeId, taskId });

					state.isProgrammaticUpdate = true;

					setTimeout(() => {
						if (!filterGroup.value || !filterGroup.value.fields_dict) {
							console.warn('⚠️ 筛选器未初始化，延迟重试...');
							setTimeout(() => refreshFromRoute(), 300);
							return;
						}

						const promises = [];

						if (storeId && filterGroup.value.fields_dict.store_id) {
							promises.push(
								filterGroup.value.fields_dict.store_id.set_value(storeId)
									.catch(err => {
										console.error('设置store_id失败:', err);
										return Promise.resolve();
									})
							);
						}

						if (taskId && filterGroup.value.fields_dict.task_id) {
							promises.push(
								filterGroup.value.fields_dict.task_id.set_value(taskId)
									.catch(err => {
										console.error('设置task_id失败:', err);
										return Promise.resolve();
									})
							);
						}

						const timeoutPromise = new Promise((resolve) => {
							setTimeout(() => {
								console.warn('⚠️ 筛选器设置超时，继续加载数据');
								resolve();
							}, 3000);
						});

						Promise.race([
							Promise.all(promises),
							timeoutPromise
						]).then(() => {
							console.log('✅ 筛选器值已设置');
							state.isProgrammaticUpdate = false;
							state.storeId = storeId;
							state.taskId = taskId;
							fetchData({ storeId, taskId });
						}).catch(err => {
							console.error('❌ 设置过滤器值失败:', err);
							state.isProgrammaticUpdate = false;
							state.storeId = storeId;
							state.taskId = taskId;
							fetchData({ storeId, taskId });
						});
					}, 200);
				} else {
					console.log('⚠️ 路由参数无效，清空筛选器');
					state.isProgrammaticUpdate = true;

					setTimeout(() => {
						if (!filterGroup.value || !filterGroup.value.fields_dict) {
							console.warn('⚠️ 筛选器未初始化');
							state.isProgrammaticUpdate = false;
							return;
						}

						Promise.all([
							filterGroup.value.fields_dict.store_id.set_value('').catch(() => Promise.resolve()),
							filterGroup.value.fields_dict.task_id.set_value('').catch(() => Promise.resolve())
						]).then(() => {
							state.isProgrammaticUpdate = false;
							state.storeId = null;
							state.taskId = null;
							fetchData();
						}).catch(err => {
							console.error('清空过滤器值失败:', err);
							state.isProgrammaticUpdate = false;
							state.storeId = null;
							state.taskId = null;
							fetchData();
						});
					}, 200);
				}
			};

			// ==================== 审批状态加载 ====================
			const loadApprovalStatus = (storeId, taskId) => {
				if (!storeId) storeId = state.storeId;
				if (!taskId) taskId = state.taskId;

				console.log('🔍 load_approval_status called with:', { storeId, taskId });

				if (!storeId || !taskId || storeId === 'undefined' || taskId === 'undefined') {
					state.approvalData = null;
					return;
				}

				frappe.call({
					method: "product_sales_planning.planning_system.page.store_detail.store_detail.get_approval_status",
					args: {
						task_id: taskId,
						store_id: storeId
					},
					callback: (r) => {
						if (r.message && r.message.status === "success") {
							console.log('✅ 审批状态加载成功:', r.message);
							state.approvalData = r.message;
							// 更新 Handsontable 可编辑状态
							if (hotInstance.value) {
								updateHandsontableColumns();
							}
						} else {
							console.warn('⚠️ 审批状态返回失败');
							state.approvalData = null;
						}
					},
					error: (err) => {
						console.error('❌ 加载审批状态失败:', err);
						state.approvalData = null;
					}
				});
			};

			// ==================== 按钮操作方法 ====================
			const returnToPrevious = () => {
				frappe.set_route('planning-dashboard');
			};

			const openProductDialog = () => {
				const storeId = state.storeId;
				const taskId = state.taskId;

				if (!storeId || storeId === 'undefined' || storeId === 'null') {
					frappe.msgprint('请先选择店铺');
					return;
				}

				new frappe.ui.form.MultiSelectDialog({
					doctype: "Product List",
					target: {},
					setters: { name1: null, brand: null, category: null },
					action: (selections) => {
						if (!selections.length) return;
						frappe.call({
							method: "product_sales_planning.planning_system.page.store_detail.store_detail.bulk_insert_commodity_schedule",
							args: { store_id: storeId, task_id: taskId, codes: selections },
							freeze: true,
							callback: (r) => {
								if (r.message?.status === "success") {
									frappe.show_alert(`添加成功 ${r.message.count} 条`);
									fetchData();
								} else {
									frappe.msgprint(r.message?.msg || "添加失败");
								}
							},
							error: (err) => {
								frappe.msgprint("添加失败");
								console.error("添加失败:", err);
							}
						});
					}
				});
			};

			const handleBatchDelete = () => {
				const storeId = state.storeId;
				const taskId = state.taskId;

				if (!storeId || !taskId || storeId === 'undefined' || taskId === 'undefined') {
					frappe.msgprint('请先选择店铺和计划任务');
					return;
				}

				// 获取选中的行
				const selected = hotInstance.value.getSelected();
				if (!selected || selected.length === 0) {
					frappe.msgprint('请先选择要删除的行');
					return;
				}

				// 收集选中行的产品编码
				const codes = [];
				selected.forEach(([startRow, startCol, endRow, endCol]) => {
					for (let row = startRow; row <= endRow; row++) {
						const rowData = hotInstance.value.getSourceDataAtRow(row);
						if (rowData && rowData.code) {
							codes.push(rowData.code);
						}
					}
				});

				if (codes.length === 0) {
					frappe.msgprint('未找到有效的产品编码');
					return;
				}

				// 确认删除
				frappe.confirm(
					`确定要删除选中的 ${codes.length} 个产品吗？此操作不可撤销。`,
					() => {
						frappe.call({
							method: "product_sales_planning.planning_system.page.store_detail.store_detail.batch_delete_by_codes",
							args: {
								store_id: storeId,
								task_id: taskId,
								codes: codes
							},
							freeze: true,
							freeze_message: "正在删除...",
							callback: (r) => {
								if (r.message && r.message.status === "success") {
									frappe.show_alert({
										message: r.message.msg || `成功删除 ${r.message.count} 条记录`,
										indicator: 'green'
									}, 3);
									// 刷新数据
									fetchData();
								} else {
									frappe.msgprint({
										title: '删除失败',
										message: r.message?.msg || '删除操作失败',
										indicator: 'red'
									});
								}
							},
							error: (err) => {
								frappe.msgprint({
									title: '删除失败',
									message: '删除操作失败，请稍后重试',
									indicator: 'red'
								});
								console.error("删除失败:", err);
							}
						});
					}
				);
			};

			const openImportDialog = () => {
				const storeId = state.storeId;
				const taskId = state.taskId;

				if (!storeId || !taskId || storeId === 'undefined' || taskId === 'undefined') {
					frappe.msgprint('请先选择店铺和计划任务');
					return;
				}

				const dialog = new frappe.ui.Dialog({
					title: 'Excel 导入',
					fields: [
						{
							fieldtype: 'HTML',
							options: `
								<div class="import-instructions">
									<h5>导入说明：</h5>
									<ul>
										<li>Excel 文件第一行必须包含：产品编码、产品名称、月份列（如 2025-01）</li>
										<li>产品编码必须在系统中存在</li>
										<li>月份格式支持：2025-01、202501、2025/01</li>
										<li>数量必须为非负整数</li>
									</ul>
									<p><a href="#" class="download-template">下载导入模板</a></p>
								</div>
							`
						},
						{
							fieldname: 'import_file',
							label: '选择 Excel 文件',
							fieldtype: 'Attach',
							reqd: 1
						}
					],
					primary_action_label: '开始导入',
					primary_action: (values) => {
						if (!values.import_file) {
							frappe.msgprint('请选择要导入的文件');
							return;
						}

						frappe.call({
							method: "product_sales_planning.planning_system.page.store_detail.store_detail.import_commodity_data",
							args: {
								store_id: storeId,
								task_id: taskId,
								file_url: values.import_file
							},
							freeze: true,
							freeze_message: "正在导入数据...",
							callback: (r) => {
								if (r.message && r.message.status === "success") {
									dialog.hide();
									frappe.show_alert({
										message: `导入成功！成功: ${r.message.success_count}, 失败: ${r.message.error_count}`,
										indicator: 'green'
									}, 5);

									// 显示详细结果
									if (r.message.errors && r.message.errors.length > 0) {
										const errorMsg = r.message.errors.slice(0, 10).join('<br>');
										frappe.msgprint({
											title: '导入结果',
											message: `<p>成功导入 ${r.message.success_count} 条记录</p>
													  <p>失败 ${r.message.error_count} 条记录</p>
													  <p><strong>错误详情（前10条）：</strong></p>
													  <div style="max-height: 200px; overflow-y: auto;">${errorMsg}</div>`,
											indicator: 'orange'
										});
									}

									// 刷新数据
									fetchData();
								} else {
									frappe.msgprint({
										title: '导入失败',
										message: r.message?.msg || '导入操作失败',
										indicator: 'red'
									});
								}
							},
							error: (err) => {
								frappe.msgprint({
									title: '导入失败',
									message: '导入操作失败，请检查文件格式',
									indicator: 'red'
								});
								console.error("导入失败:", err);
							}
						});
					}
				});

				// 绑定下载模板链接
				dialog.$wrapper.find('.download-template').on('click', (e) => {
					e.preventDefault();
					window.open(
						`/api/method/product_sales_planning.planning_system.page.store_detail.store_detail.download_import_template?store_id=${storeId}&task_id=${taskId}`,
						'_blank'
					);
				});

				dialog.show();
			};

			const openMechanismImportDialog = () => {
				const storeId = state.storeId;
				const taskId = state.taskId;

				if (!storeId || !taskId || storeId === 'undefined' || taskId === 'undefined') {
					frappe.msgprint('请先选择店铺和计划任务');
					return;
				}

				const dialog = new frappe.ui.Dialog({
					title: '机制导入',
					fields: [
						{
							fieldtype: 'HTML',
							options: `
								<div class="import-instructions">
									<h5>导入说明：</h5>
									<ul>
										<li>Excel 文件第一行必须包含：机制名称、产品编码、产品名称、单位数量、月份列</li>
										<li>机制名称：产品机制的名称</li>
										<li>产品编码：必须在系统中存在</li>
										<li>单位数量：每个机制单位包含的产品数量</li>
										<li>月份数据：每个月份的机制数量（最终数量 = 机制数量 × 单位数量）</li>
									</ul>
								</div>
							`
						},
						{
							fieldname: 'import_file',
							label: '选择 Excel 文件',
							fieldtype: 'Attach',
							reqd: 1
						}
					],
					primary_action_label: '开始导入',
					primary_action: (values) => {
						if (!values.import_file) {
							frappe.msgprint('请选择要导入的文件');
							return;
						}

						frappe.call({
							method: "product_sales_planning.planning_system.page.store_detail.store_detail.import_mechanism_excel",
							args: {
								store_id: storeId,
								task_id: taskId,
								file_url: values.import_file
							},
							freeze: true,
							freeze_message: "正在导入机制数据...",
							callback: (r) => {
								if (r.message && r.message.status === "success") {
									dialog.hide();
									frappe.show_alert({
										message: `导入成功！成功: ${r.message.success_count}, 失败: ${r.message.error_count}`,
										indicator: 'green'
									}, 5);

									// 显示详细结果
									if (r.message.errors && r.message.errors.length > 0) {
										const errorMsg = r.message.errors.slice(0, 10).join('<br>');
										frappe.msgprint({
											title: '导入结果',
											message: `<p>成功导入 ${r.message.success_count} 条记录</p>
													  <p>失败 ${r.message.error_count} 条记录</p>
													  <p><strong>错误详情（前10条）：</strong></p>
													  <div style="max-height: 200px; overflow-y: auto;">${errorMsg}</div>`,
											indicator: 'orange'
										});
									}

									// 刷新数据
									fetchData();
								} else {
									frappe.msgprint({
										title: '导入失败',
										message: r.message?.msg || '导入操作失败',
										indicator: 'red'
									});
								}
							},
							error: (err) => {
								frappe.msgprint({
									title: '导入失败',
									message: '导入操作失败，请检查文件格式',
									indicator: 'red'
								});
								console.error("导入失败:", err);
							}
						});
					}
				});

				dialog.show();
			};

			const openApplyMechanismDialog = () => {
				const storeId = state.storeId;
				const taskId = state.taskId;

				if (!storeId || storeId === 'undefined' || storeId === 'null') {
					frappe.msgprint('请先选择店铺');
					return;
				}

				// 使用 Frappe 的 MultiSelectDialog 选择机制
				new frappe.ui.form.MultiSelectDialog({
					doctype: "Product Mechanism",
					target: {},
					setters: { name: null },
					action: (selections) => {
						if (!selections.length) return;

						frappe.call({
							method: "product_sales_planning.planning_system.page.store_detail.store_detail.apply_mechanisms",
							args: {
								store_id: storeId,
								task_id: taskId,
								mechanism_names: selections
							},
							freeze: true,
							freeze_message: "正在应用机制...",
							callback: (r) => {
								if (r.message && r.message.status === "success") {
									frappe.show_alert({
										message: `应用成功！插入: ${r.message.inserted_count}, 跳过: ${r.message.skipped_count}`,
										indicator: 'green'
									}, 5);

									// 显示详细结果
									if (r.message.errors && r.message.errors.length > 0) {
										const errorMsg = r.message.errors.slice(0, 10).join('<br>');
										frappe.msgprint({
											title: '应用结果',
											message: `<p>成功插入 ${r.message.inserted_count} 条记录</p>
													  <p>跳过 ${r.message.skipped_count} 条记录</p>
													  <p><strong>错误详情（前10条）：</strong></p>
													  <div style="max-height: 200px; overflow-y: auto;">${errorMsg}</div>`,
											indicator: 'orange'
										});
									}

									// 刷新数据
									fetchData();
								} else {
									frappe.msgprint({
										title: '应用失败',
										message: r.message?.msg || '应用机制失败',
										indicator: 'red'
									});
								}
							},
							error: (err) => {
								frappe.msgprint({
									title: '应用失败',
									message: '应用机制失败，请稍后重试',
									indicator: 'red'
								});
								console.error("应用机制失败:", err);
							}
						});
					}
				});
			};

			// 高级筛选
			const toggleAdvancedFilters = () => {
				state.showAdvancedFilters = !state.showAdvancedFilters;
			};

			const applyAdvancedFilters = () => {
				if (!hotInstance.value) return;

				// 客户端筛选数据
				const filtered = state.data.filter(row => {
					// 产品搜索
					if (state.advancedFilters.productSearch) {
						const search = state.advancedFilters.productSearch.toLowerCase();
						if (!row.name1.toLowerCase().includes(search) &&
							!row.code.toLowerCase().includes(search)) {
							return false;
						}
					}

					// 品牌筛选
					if (state.advancedFilters.brands.length > 0) {
						if (!state.advancedFilters.brands.includes(row.brand)) {
							return false;
						}
					}

					// 类别筛选
					if (state.advancedFilters.categories.length > 0) {
						if (!state.advancedFilters.categories.includes(row.category)) {
							return false;
						}
					}

					// 数量范围筛选
					const totalQty = Object.values(row.months || {})
						.reduce((sum, m) => sum + (m.quantity || 0), 0);

					if (state.advancedFilters.quantityMin !== null &&
						totalQty < state.advancedFilters.quantityMin) {
						return false;
					}

					if (state.advancedFilters.quantityMax !== null &&
						totalQty > state.advancedFilters.quantityMax) {
						return false;
					}

					return true;
				});

				// 更新 Handsontable 数据
				hotInstance.value.loadData(prepareDataForHandsontable(filtered, state.months));

				frappe.show_alert({
					message: `筛选完成，显示 ${filtered.length} 条记录`,
					indicator: 'blue'
				}, 2);
			};

			const clearAdvancedFilters = () => {
				state.advancedFilters = {
					productSearch: '',
					brands: [],
					categories: [],
					quantityMin: null,
					quantityMax: null
				};

				// 重新加载所有数据
				if (hotInstance.value && state.data.length > 0) {
					hotInstance.value.loadData(prepareDataForHandsontable(state.data, state.months));
					frappe.show_alert({
						message: '筛选已清空',
						indicator: 'blue'
					}, 2);
				}
			};

			// ==================== 生命周期 ====================
			onMounted(() => {
				console.log('🎯 Vue 组件已挂载');

				// 初始化 Frappe 筛选器
				nextTick(() => {
					initFrappeFilters();
					// 初始化 Handsontable
					initHandsontable();
					// 从路由加载数据
					refreshFromRoute();
				});

				// 设置页面主操作按钮
				page.clear_primary_action();
				page.set_primary_action('刷新', () => fetchData());
			});

			// ==================== 返回值 ====================
			return {
				state,
				canEdit,
				showOperationButtons,
				hotContainer,
				filterStore,
				filterTask,
				returnToPrevious,
				openProductDialog,
				handleBatchDelete,
				openImportDialog,
				openMechanismImportDialog,
				openApplyMechanismDialog,
				toggleAdvancedFilters,
				applyAdvancedFilters,
				clearAdvancedFilters,
				// 暴露给外部使用
				hotInstance,
				isLoading: computed(() => state.isLoading),
				isFirstLoad: state.isFirstLoad,
				refreshFromRoute
			};
		},

		template: `
			<div class="store-planning-body">
				<!-- 固定头部区域 -->
				<div class="fixed-header-area">
					<!-- 顶部操作栏 -->
					<div class="action-buttons">
						<button class="btn btn-sm btn-secondary" @click="returnToPrevious">
							<span class="fa fa-arrow-left"></span> 返回
						</button>
						<button v-if="showOperationButtons" class="btn btn-sm btn-success" @click="openProductDialog">
							<span class="fa fa-plus"></span> 添加商品
						</button>
						<button v-if="showOperationButtons" class="btn btn-sm btn-info" @click="openImportDialog">
							<span class="fa fa-upload"></span> 单品导入
						</button>
						<button v-if="showOperationButtons" class="btn btn-sm btn-primary" @click="openMechanismImportDialog">
							<span class="fa fa-cubes"></span> 机制导入
						</button>
						<button v-if="showOperationButtons" class="btn btn-sm btn-default" @click="openApplyMechanismDialog">
							<span class="fa fa-magic"></span> 应用机制
						</button>
					</div>

					<!-- 筛选区域 -->
					<div class="filter-card">
						<div class="row">
							<div class="col-md-6" ref="filterStore"></div>
							<div class="col-md-6" ref="filterTask"></div>
						</div>
					</div>

					<!-- 统计信息 -->
					<div class="stats-grid">
						<div class="stat-card">
							<div class="stat-icon-box box-blue">
								<svg class="icon icon-md"><use href="#icon-package"></use></svg>
							</div>
							<div class="stat-content">
								<h4>{{ state.stats.total }}</h4>
								<span>总计划量</span>
							</div>
						</div>
						<div class="stat-card">
							<div class="stat-icon-box box-green">
								<svg class="icon icon-md"><use href="#icon-check-square"></use></svg>
							</div>
							<div class="stat-content">
								<h4>{{ state.stats.filledCount }} / {{ state.data.length }}</h4>
								<span>已规划SKU</span>
							</div>
						</div>
					</div>

					<!-- 高级筛选区域 -->
					<div class="advanced-filters-section">
						<button class="btn btn-sm btn-default" @click="toggleAdvancedFilters">
							<i class="fa fa-filter"></i> 高级筛选
						</button>
						<div v-if="state.showAdvancedFilters" class="advanced-filters-panel">
							<div class="filter-item">
								<label>产品搜索</label>
								<input v-model="state.advancedFilters.productSearch"
									   type="text"
									   placeholder="输入产品名称或编码" />
							</div>
							<div class="filter-actions">
								<button @click="applyAdvancedFilters" class="btn btn-sm btn-primary">
									应用筛选
								</button>
								<button @click="clearAdvancedFilters" class="btn btn-sm btn-default">
									清空
								</button>
							</div>
						</div>
					</div>

					<!-- 审批状态显示区域 -->
					<div v-if="state.approvalData?.workflow?.has_workflow" class="approval-status-area">
						<div class="alert alert-info">
							<div class="d-flex justify-content-between align-items-center">
								<div>
									<strong>审批状态：</strong>
									<span>{{ state.approvalData.workflow.current_state.approval_status || '-' }}</span>
									<span v-if="state.approvalData.workflow.current_state.current_step > 0" style="margin-left: 10px;">
										(第{{ state.approvalData.workflow.current_state.current_step }}级审批)
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Handsontable 容器 -->
				<div ref="hotContainer" class="datatable-container"></div>
			</div>
		`
	});

	// 挂载 Vue 应用
	const container = $(wrapper).find('#store-detail-app')[0];
	const vueInstance = app.mount(container);

	// 返回实例，供外部访问
	return vueInstance;
};
