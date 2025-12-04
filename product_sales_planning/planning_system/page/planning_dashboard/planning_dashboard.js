// product_sales_planning/planning_system/page/planning_dashboard/planning_dashboard.js

// 1. 页面加载（只执行一次，用于初始化）
frappe.pages['planning-dashboard'].on_page_load = function(wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: '计划任务看板',
		single_column: true
	});

	// 注入 CSS（优先加载）
	inject_css();

	// 初始化管理器
	wrapper.dashboard_manager = new DashboardManager(wrapper, page);
};

// 2. 页面显示（每次切换回来都会执行）
frappe.pages['planning-dashboard'].on_page_show = function(wrapper) {
	if (wrapper.dashboard_manager) {
		console.log("页面显示，自动刷新数据...");
		wrapper.dashboard_manager.fetch_data();
	}
};

// 3. 页面卸载（清理资源）
frappe.pages['planning-dashboard'].on_page_unload = function(wrapper) {
	if (wrapper.dashboard_manager) {
		wrapper.dashboard_manager = null;
	}
};

// 看板管理器类
class DashboardManager {
	constructor(wrapper, page) {
		this.wrapper = $(wrapper);
		this.page = page;
		this.current_tab = 'pending'; // 默认显示待完成
		this.filters = {
			store_ids: [],
			task_ids: [],
			approval_status: ''
		};
		this.filter_options = {
			stores: [],
			tasks: [],
			channels: []
		};
		this.data = {
			stats: { ongoing: 0, tasks_count: 0, pending_count: 0, completed_count: 0 },
			tasks: []
		};

		this.init_ui();
		this.fetch_data();
	}

	init_ui() {
		// 创建完整的页面结构
		this.wrapper.find('.layout-main-section').html(`
			<div id="planning-dashboard-app">
				<!-- 筛选器区域 -->
				<div class="filter-section">
					<div class="filter-card">
						<div class="row">
							<div class="col-lg-3 col-md-6 col-sm-6 col-12">
								<div class="filter-store"></div>
							</div>
							<div class="col-lg-3 col-md-6 col-sm-6 col-12">
								<div class="filter-task"></div>
							</div>
							<div class="col-lg-3 col-md-6 col-sm-6 col-12">
								<div class="filter-approval"></div>
							</div>
							<div class="col-lg-3 col-md-6 col-sm-6 col-12">
								<div class="filter-actions">
									<button class="btn btn-sm btn-primary btn-apply-filters" title="应用筛选条件">
										<i class="fa fa-search"></i> 查询
									</button>
									<button class="btn btn-sm btn-default btn-clear-filters" title="清空所有筛选">
										<i class="fa fa-eraser"></i> 清空
									</button>
								</div>
							</div>
						</div>
						<div class="row" style="margin-top: 12px;">
							<div class="col-12">
								<div class="quick-actions">
									<button class="btn btn-sm btn-warning btn-my-approvals" title="查看待我审批的任务">
										<i class="fa fa-check-circle"></i> 待我审批
									</button>
									<button class="btn btn-sm btn-info btn-goto-data-view" title="跳转到数据查看页面">
										<i class="fa fa-table"></i> 数据查看
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- 统计卡片区域 -->
				<div class="dashboard-stats-row">
					<div class="stat-card">
						<div class="stat-icon-box box-blue">${frappe.utils.icon('folder', 'md')}</div>
						<div class="stat-content">
							<h4 id="stat-ongoing">0</h4>
							<span>进行中计划</span>
						</div>
					</div>
					<div class="stat-card">
						<div class="stat-icon-box box-green">${frappe.utils.icon('check-square', 'md')}</div>
						<div class="stat-content">
							<h4 id="stat-tasks">0</h4>
							<span>待处理店铺</span>
						</div>
					</div>
				</div>

				<!-- Tabs 区域 -->
				<div class="dashboard-tabs">
					<button class="tab-btn active" data-tab="pending">
						待完成 <span id="pending-count">(0)</span>
					</button>
					<button class="tab-btn" data-tab="completed">
						已完成 <span id="completed-count">(0)</span>
					</button>
				</div>

				<!-- 任务列表区域 -->
				<div class="section-header">
					<span>执行明细列表</span>
					<span class="count-badge" id="list-count">0</span>
				</div>
				<div class="task-list-wrapper" id="task-list">
					<div class="text-center p-5">
						<div class="spinner-border text-primary" role="status"></div>
						<div class="mt-2 text-muted">正在加载数据...</div>
					</div>
				</div>
			</div>
		`);

		// 初始化筛选器字段
		this.init_filters();

		// 绑定事件
		this.bind_events();
	}

	init_filters() {
		const self = this;

		// 先获取筛选器选项数据
		this.fetch_filter_options().then(() => {
			// 准备店铺选项（添加"全部"选项）- 显示格式：店铺名称 (店铺ID)
			const store_options = [
				{ label: '全部店铺', value: '' },
				...self.filter_options.stores.map(s => ({
					label: `${s.shop_name} (${s.name})`,
					value: s.name
				}))
			];

			// 准备任务选项（添加"全部"选项）- 显示格式：任务ID (日期范围)
			const task_options = [
				{ label: '全部任务', value: '' },
				...self.filter_options.tasks.map(t => {
					const dateRange = (t.start_date && t.end_date)
						? `${t.start_date} ~ ${t.end_date}`
						: (t.start_date || t.end_date || '无日期');
					return {
						label: `${t.name} (${dateRange})`,
						value: t.name
					};
				})
			];

			// 创建筛选器字段组
			this.filter_group = new frappe.ui.FieldGroup({
				fields: [
					{
						fieldname: 'store_ids',
						label: '店铺（可多选）',
						fieldtype: 'MultiSelectList',
						get_data: () => {
							return store_options;
						},
						change: () => {
							const values = self.filter_group.get_value('store_ids') || [];
							// 过滤掉空值（"全部"选项）
							self.filters.store_ids = Array.isArray(values) ? values.filter(v => v) : [];
						}
					},
					{
						fieldname: 'task_ids',
						label: '计划任务（可多选）',
						fieldtype: 'MultiSelectList',
						get_data: () => {
							return task_options;
						},
						change: () => {
							const values = self.filter_group.get_value('task_ids') || [];
							// 过滤掉空值（"全部"选项）
							self.filters.task_ids = Array.isArray(values) ? values.filter(v => v) : [];
						}
					},
					{
						fieldname: 'approval_status',
						label: '审批状态',
						fieldtype: 'Select',
						options: ['全部', '待审批', '已通过', '已驳回'],
						default: '全部',
						change: () => {
							const value = self.filter_group.get_value('approval_status') || '全部';
							self.filters.approval_status = value === '全部' ? '' : value;
						}
					}
				],
				body: this.wrapper.find('.filter-card')
			});

			this.filter_group.make();

			// 手动布局筛选器到指定位置
			this.filter_group.fields_dict.store_ids.$wrapper.appendTo(this.wrapper.find('.filter-store'));
			this.filter_group.fields_dict.task_ids.$wrapper.appendTo(this.wrapper.find('.filter-task'));
			this.filter_group.fields_dict.approval_status.$wrapper.appendTo(this.wrapper.find('.filter-approval'));

			// 确保筛选器可见
			this.wrapper.find('.filter-store, .filter-task, .filter-approval').show();
		});
	}

	fetch_filter_options() {
		const self = this;
		return new Promise((resolve, reject) => {
			frappe.call({
				method: "product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_filter_options",
				callback: function(r) {
					if (r.message) {
						self.filter_options = {
							stores: r.message.stores || [],
							tasks: r.message.tasks || [],
							channels: r.message.channels || []
						};
					} else {
						self.filter_options = {
							stores: [],
							tasks: [],
							channels: []
						};
					}
					resolve();
				},
				error: function(err) {
					console.error('获取筛选选项失败:', err);
					self.filter_options = {
						stores: [],
						tasks: [],
						channels: []
					};
					resolve();
				}
			});
		});
	}

	bind_events() {
		const self = this;

		// Tab 切换事件
		this.wrapper.find('.tab-btn').on('click', function() {
			const tab = $(this).data('tab');
			self.switch_tab(tab);
		});

		// 应用筛选按钮
		this.wrapper.find('.btn-apply-filters').on('click', () => {
			this.fetch_data();
		});

		// 清空筛选按钮
		this.wrapper.find('.btn-clear-filters').on('click', () => {
			this.clear_filters();
		});

		// 待我审批按钮
		this.wrapper.find('.btn-my-approvals').on('click', () => {
			this.show_my_approvals();
		});

		// 跳转到数据查看页面按钮
		this.wrapper.find('.btn-goto-data-view').on('click', () => {
			frappe.set_route('data-view');
		});
	}

	switch_tab(tab) {
		if (this.current_tab === tab) return;

		this.current_tab = tab;

		// 更新 Tab 样式
		this.wrapper.find('.tab-btn').removeClass('active');
		this.wrapper.find(`.tab-btn[data-tab="${tab}"]`).addClass('active');

		// 根据 tab 更新审批状态筛选器的显示/隐藏
		this.update_filter_visibility();

		// 重新获取数据
		this.fetch_data();
	}

	update_filter_visibility() {
		if (!this.filter_group || !this.filter_group.fields_dict) return;

		const approval_field = this.filter_group.fields_dict.approval_status;
		if (!approval_field) return;

		if (this.current_tab === 'completed') {
			// 已完成 tab：隐藏审批状态筛选器
			approval_field.$wrapper.hide();
			approval_field.set_value('');
			this.filters.approval_status = '';
		} else {
			// 待完成 tab：显示审批状态筛选器
			approval_field.$wrapper.show();
		}
	}

	clear_filters() {
		if (this.filter_group) {
			this.filter_group.set_values({
				store_ids: [],
				task_ids: [],
				approval_status: '全部'
			});
		}
		this.filters = {
			store_ids: [],
			task_ids: [],
			approval_status: ''
		};
		this.fetch_data();
	}

	show_my_approvals() {
		if (this.filter_group) {
			// 设置审批状态筛选器为"待审批"
			this.filter_group.set_value('approval_status', '待审批');
			this.filters.approval_status = '待审批';
			// 清空其他筛选器
			this.filter_group.set_value('store_ids', []);
			this.filter_group.set_value('task_ids', []);
			this.filters.store_ids = [];
			this.filters.task_ids = [];
		}
		// 刷新数据
		this.fetch_data();
	}

	fetch_data() {
		const self = this;

		// 构建筛选参数（支持多选）
		const filters = {
			store_ids: this.filters.store_ids || [],
			task_ids: this.filters.task_ids || [],
			approval_status: this.filters.approval_status,
			tab: this.current_tab
		};

		// 显示加载状态
		this.render_loading();

		frappe.call({
			method: "product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_dashboard_data",
			args: { filters: filters },
			callback: function(r) {
				if (r.message) {
					if (r.message.error) {
						frappe.msgprint({
							title: '加载失败',
							message: r.message.error,
							indicator: 'red'
						});
						self.data = { stats: { ongoing: 0, tasks_count: 0, pending_count: 0, completed_count: 0 }, tasks: [] };
					} else {
						self.data.stats = r.message.stats || { ongoing: 0, tasks_count: 0, pending_count: 0, completed_count: 0 };
						self.data.tasks = r.message.tasks || [];
						self.data.stats.tasks_count = self.data.tasks.length;
					}
				} else {
					self.data = { stats: { ongoing: 0, tasks_count: 0, pending_count: 0, completed_count: 0 }, tasks: [] };
				}
				self.render();
			},
			error: function(err) {
				console.error('获取看板数据失败:', err);
				frappe.msgprint({
					title: '加载失败',
					message: '无法加载看板数据，请稍后重试',
					indicator: 'red'
				});
				self.data = { stats: { ongoing: 0, tasks_count: 0, pending_count: 0, completed_count: 0 }, tasks: [] };
				self.render();
			}
		});
	}

	render_loading() {
		this.wrapper.find('#task-list').html(`
			<div class="text-center p-5">
				<div class="spinner-border spinner-border-sm text-muted"></div>
				<div class="mt-2 text-muted">加载中...</div>
			</div>
		`);
	}

	render() {
		const self = this;
		const { stats, tasks } = this.data;

		// 更新统计卡片
		this.wrapper.find('#stat-ongoing').text(stats.ongoing || 0);
		this.wrapper.find('#stat-tasks').text(stats.tasks_count || 0);
		this.wrapper.find('#pending-count').text(`(${stats.pending_count || 0})`);
		this.wrapper.find('#completed-count').text(`(${stats.completed_count || 0})`);
		this.wrapper.find('#list-count').text(tasks.length);

		// 构建任务列表 HTML
		let tasksHTML = '';
		if (tasks.length === 0) {
			tasksHTML = `
				<div class="empty-state">
					<div class="empty-icon">${frappe.utils.icon('box', 'xl')}</div>
					<div class="empty-text">暂无开启中的提报任务</div>
				</div>
			`;
		} else {
			tasksHTML = tasks.map(task => `
				<div class="task-card" data-store-id="${task.store_id}" data-parent-id="${task.parent_id}">
					<div class="card-left">
						<div class="store-avatar">${this.get_avatar(task.title)}</div>
					</div>
					<div class="card-center">
						<div class="row-title">
							<span class="store-name">${task.title}</span>
							<span class="channel-badge">${task.channel}</span>
							${task.is_urgent ? '<span class="badge-urgent">急</span>' : ''}
						</div>
						<div class="row-meta">
							<span class="meta-item user-item">
								${frappe.utils.icon('users', 'xs')} ${task.user}
							</span>
							<span class="meta-sep">•</span>
							<span class="meta-item">${task.plan_type}</span>
						</div>
					</div>
					<div class="card-right">
						<div class="row-time">
							<span style="${this.get_time_style(task.is_urgent)}">
								${frappe.utils.icon('calendar', 'xs')} 截止 ${task.deadline}
							</span>
						</div>
						<div class="row-status">
							${this.get_status_badge_html(task.child_status, 'sub')}
							${this.get_status_badge_html(task.approval_status, 'app')}
							${task.current_approval_step > 0 ? `<span class="status-pill st-blue">第${task.current_approval_step}级</span>` : ''}
						</div>
					</div>
				</div>
			`).join('');
		}

		// 渲染任务列表
		this.wrapper.find('#task-list').html(tasksHTML);

		// 绑定任务卡片点击事件
		this.wrapper.find('.task-card').on('click', function() {
			const storeId = $(this).data('store-id');
			const parentId = $(this).data('parent-id');
			frappe.set_route('store-detail', storeId, parentId);
		});

		// 设置刷新按钮
		this.page.set_secondary_action('刷新数据', () => this.fetch_data(), 'refresh');
	}

	get_avatar(title) {
		return title ? title.charAt(0) : '店';
	}

	get_time_style(isUrgent) {
		return isUrgent ? 'color:#FA5252; font-weight:bold;' : 'color:#868E96;';
	}

	get_status_badge_html(status, type) {
		if (!status || status === '-' || status === '未开始') {
			if (type === 'app') return '';
			return `<span class="status-pill st-gray">未开始</span>`;
		}
		let cls = 'st-gray';
		const s = status.toString();
		if (type === 'sub') {
			if (['已提交', 'Submitted'].some(k => s.includes(k))) cls = 'st-blue';
			else if (['草稿', 'Draft'].some(k => s.includes(k))) cls = 'st-orange';
		}
		if (type === 'app') {
			if (['通过', 'Approved'].some(k => s.includes(k))) cls = 'st-green';
			else if (['驳回', 'Rejected'].some(k => s.includes(k))) cls = 'st-red';
			else if (['审核', 'Pending'].some(k => s.includes(k))) cls = 'st-yellow';
		}
		return `<span class="status-pill ${cls}">${status}</span>`;
	}
}

function inject_css() {
	// 防止重复注入
	if (document.getElementById('planning-dashboard-css')) {
		return;
	}

	const css = `
		#planning-dashboard-app { padding: 15px; max-width: 1400px; margin: 0 auto; }

		/* 筛选器区域 */
		.filter-section { margin-bottom: 20px; }
		.filter-card { background: #fff; padding: 16px 20px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
		.filter-card .frappe-control { margin-bottom: 0 !important; }
		.filter-card .form-group { margin-bottom: 0 !important; }
		.filter-actions { display: flex; gap: 8px; align-items: flex-end; padding-top: 20px; flex-wrap: nowrap; }
		.filter-actions .btn { white-space: nowrap; flex-shrink: 0; }
		.quick-actions { display: flex; gap: 10px; justify-content: flex-start; flex-wrap: nowrap; }
		.quick-actions .btn { white-space: nowrap; flex-shrink: 0; }

		/* 统计卡片 */
		.dashboard-stats-row { display: flex; gap: 20px; margin-bottom: 25px; }
		.stat-card { flex: 1; background: #fff; border: 1px solid var(--app-border-color, #e3e6ea); border-radius: var(--app-border-radius-md, 8px); padding: 24px; display: flex; align-items: center; box-shadow: var(--app-shadow-md, 0 1px 3px rgba(0,0,0,0.05)); }
		.stat-icon-box { width: var(--app-stat-icon-size, 48px); height: var(--app-stat-icon-size, 48px); border-radius: var(--app-border-radius-md, 8px); display: flex; align-items: center; justify-content: center; margin-right: 16px; }
		.stat-icon-box svg { width: 22px; height: 22px; }
		.box-blue { background: #E7F5FF; color: #1864AB; }
		.box-green { background: #EBFBEE; color: #2B8A3E; }
		.stat-content h4 { font-size: var(--app-stat-number-size, 24px); margin: 0; font-weight: var(--app-stat-number-weight, 700); color: var(--app-text-dark, #343A40); line-height: 1.2; }
		.stat-content span { color: var(--app-text-muted, #868E96); font-size: 14px; font-weight: 500; }

		/* Tabs */
		.dashboard-tabs { display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #E9ECEF; }
		.tab-btn { padding: 10px 20px; background: none; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: 600; color: #868E96; transition: all 0.2s; font-size: 14px; }
		.tab-btn.active { color: #1971C2; border-bottom-color: #1971C2; }
		.tab-btn:hover { color: #1971C2; background: #F8F9FA; }

		/* 列表头部 */
		.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; color: #495057; font-weight: 600; font-size: 15px; }
		.count-badge { background: #E9ECEF; padding: 2px 8px; border-radius: 10px; font-size: 12px; color: #495057; }

		/* 任务列表 */
		.task-list-wrapper { max-height: 70vh; overflow-y: auto; padding-right: 4px; }
		.task-card { background: #fff; border: 1px solid #E9ECEF; border-radius: 8px; padding: 16px 20px; margin-bottom: 12px; display: flex; align-items: center; transition: all 0.2s; cursor: pointer; }
		.task-card:hover { border-color: #CED4DA; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transform: translateY(-1px); }
		.card-left { flex-shrink: 0; margin-right: 16px; }
		.store-avatar { width: 48px; height: 48px; background: #F8F9FA; color: #495057; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; border: 1px solid #DEE2E6; }
		.card-center { flex-grow: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
		.row-title { display: flex; align-items: center; gap: 8px; }
		.store-name { font-size: 16px; font-weight: 700; color: #212529; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
		.channel-badge { font-size: 11px; background: #F1F3F5; padding: 2px 6px; border-radius: 4px; color: #6C757D; border: 1px solid #DEE2E6; flex-shrink: 0; }
		.badge-urgent { background: #FFF5F5; color: #FA5252; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid #FFC9C9; font-weight: bold; }
		.row-meta { display: flex; align-items: center; font-size: 13px; color: #868E96; }
		.meta-item { display: flex; align-items: center; gap: 4px; }
		.user-item { color: #495057; }
		.meta-sep { margin: 0 8px; color: #DEE2E6; }
		.card-right { flex-shrink: 0; text-align: right; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 6px; min-width: 140px; margin-left: 15px; }
		.row-time { font-size: 12px; display: flex; align-items: center; }
		.row-time svg { margin-right: 4px; }
		.row-status { display: flex; gap: 5px; }

		/* 状态标签 */
		.status-pill { font-size: 11px; padding: 3px 10px; border-radius: 12px; font-weight: 600; letter-spacing: 0.3px; }
		.st-gray { background: #F8F9FA; color: #ADB5BD; border: 1px solid #F1F3F5; }
		.st-blue { background: #E7F5FF; color: #1971C2; }
		.st-green { background: #EBFBEE; color: #2F9E44; border: 1px solid #D3F9D8; }
		.st-red { background: #FFF5F5; color: #FA5252; border: 1px solid #FFC9C9; }
		.st-orange { background: #FFF4E6; color: #FD7E14; }
		.st-yellow { background: #FFF9DB; color: #FAB005; }

		/* 空状态 */
		.empty-state { text-align: center; padding: 60px 20px; background: #fff; border-radius: 8px; border: 1px dashed #DEE2E6; color: #ADB5BD; margin-top: 10px; }
		.empty-icon { font-size: 32px; margin-bottom: 10px; opacity: 0.5; }
		.empty-icon svg { width: 48px; height: 48px; }
	`;
	$('<style>').attr('id', 'planning-dashboard-css').text(css).appendTo('head');
}
