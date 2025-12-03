// product_sales_planning/planning_system/page/planning_dashboard/planning_dashboard.js

// 1. 页面加载（只执行一次，用于初始化）
frappe.pages['planning-dashboard'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '计划任务看板',
        single_column: true
    });

    // 添加 Frappe 原生筛选器
    const store_field = page.add_field({
        fieldname: 'store_id',
        label: __('店铺'),
        fieldtype: 'Link',
        options: 'Store List',
        change: function() {
            console.log('店铺筛选器变化:', this.get_value());
            if (wrapper.dashboard_manager) {
                wrapper.dashboard_manager.fetch_data();
            }
        }
    });

    const task_field = page.add_field({
        fieldname: 'task_id',
        label: __('计划任务'),
        fieldtype: 'Link',
        options: 'Schedule tasks',
        change: function() {
            console.log('任务筛选器变化:', this.get_value());
            if (wrapper.dashboard_manager) {
                wrapper.dashboard_manager.fetch_data();
            }
        }
    });

    // 添加审批状态筛选器
    const approval_status_field = page.add_field({
        fieldname: 'approval_status',
        label: __('审批状态'),
        fieldtype: 'Select',
        options: ['', '待审批', '已通过', '已驳回'],
        change: function() {
            console.log('审批状态筛选器变化:', this.get_value());
            if (wrapper.dashboard_manager) {
                wrapper.dashboard_manager.fetch_data();
            }
        }
    });

    // 添加"待我审批"快捷按钮
    page.add_inner_button(__('待我审批'), function() {
        if (wrapper.dashboard_manager) {
            wrapper.dashboard_manager.show_my_approvals();
        }
    });

    console.log('筛选器已添加:', { store_field, task_field, approval_status_field });

    // 创建内容容器
    $(wrapper).find('.layout-main-section').html(`
        <div id="planning-dashboard-app">
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="mt-2 text-muted">正在加载数据看板...</div>
            </div>
        </div>
    `);

    // 注入 CSS
    inject_css();

    // 初始化管理器
    wrapper.dashboard_manager = new DashboardManager(wrapper, page);
    wrapper.dashboard_manager.fetch_data();
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
    // 清理资源
    if (wrapper.dashboard_manager) {
        wrapper.dashboard_manager = null;
    }
};

// 看板管理器类
class DashboardManager {
    constructor(wrapper, page) {
        this.wrapper = $(wrapper);
        this.page = page;
        this.data = {
            stats: { ongoing: 0, tasks_count: 0 },
            tasks: []
        };
    }

    fetch_data() {
        const self = this;

        // 从 Frappe 原生筛选器获取值
        const filters = {
            store_id: this.page.fields_dict.store_id?.get_value() || '',
            task_id: this.page.fields_dict.task_id?.get_value() || '',
            approval_status: this.page.fields_dict.approval_status?.get_value() || ''
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
                        self.data = { stats: { ongoing: 0, tasks_count: 0 }, tasks: [] };
                    } else {
                        self.data.stats = r.message.stats || { ongoing: 0, tasks_count: 0 };
                        self.data.tasks = r.message.tasks || [];
                        self.data.stats.tasks_count = self.data.tasks.length;
                    }
                } else {
                    self.data = { stats: { ongoing: 0, tasks_count: 0 }, tasks: [] };
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
                self.data = { stats: { ongoing: 0, tasks_count: 0 }, tasks: [] };
                self.render();
            }
        });
    }

    render_loading() {
        this.wrapper.find('#planning-dashboard-app').html(`
            <div class="text-center p-5">
                <div class="spinner-border spinner-border-sm text-muted"></div>
                <div class="mt-2 text-muted">加载中...</div>
            </div>
        `);
    }

    render() {
        const self = this;
        const { stats, tasks } = this.data;

        // 构建统计卡片 HTML
        const statsHTML = `
            <div class="dashboard-stats-row">
                <div class="stat-card">
                    <div class="stat-icon-box box-blue">${frappe.utils.icon('folder', 'md')}</div>
                    <div class="stat-content">
                        <h4>${stats.ongoing || 0}</h4>
                        <span>进行中计划</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon-box box-green">${frappe.utils.icon('check-square', 'md')}</div>
                    <div class="stat-content">
                        <h4>${stats.tasks_count || 0}</h4>
                        <span>待处理店铺</span>
                    </div>
                </div>
            </div>
        `;

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

        // 渲染完整页面
        this.wrapper.find('#planning-dashboard-app').html(`
            <div class="page-container">
                ${statsHTML}
                <div class="section-header">
                    <span>执行明细列表</span>
                    <span class="count-badge">${tasks.length}</span>
                </div>
                <div class="task-list-wrapper">
                    ${tasksHTML}
                </div>
            </div>
        `);

        // 绑定点击事件
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

    show_my_approvals() {
        // 设置审批状态筛选器为"待审批"
        this.page.fields_dict.approval_status.set_value('待审批');
        // 清空其他筛选器
        this.page.fields_dict.store_id.set_value('');
        this.page.fields_dict.task_id.set_value('');
        // 刷新数据
        this.fetch_data();
    }
}

function inject_css() {
    const css = `
        .page-container { padding: 15px; max-width: 1200px; margin: 0 auto; }
        .dashboard-stats-row { display: flex; gap: 20px; margin-bottom: 25px; }
        .stat-card { flex: 1; background: #fff; border: 1px solid #EBF1F5; border-radius: 12px; padding: 24px; display: flex; align-items: center; box-shadow: 0 2px 6px rgba(0,0,0,0.02); }
        .stat-icon-box { width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px; }
        .stat-icon-box svg { width: 24px; height: 24px; }
        .box-blue { background: #E7F5FF; color: #1864AB; }
        .box-green { background: #EBFBEE; color: #2B8A3E; }
        .stat-content h4 { font-size: 26px; margin: 0; font-weight: 700; color: #343A40; line-height: 1.2; }
        .stat-content span { color: #868E96; font-size: 14px; font-weight: 500; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; color: #495057; font-weight: 600; font-size: 15px; }
        .count-badge { background: #E9ECEF; padding: 2px 8px; border-radius: 10px; font-size: 12px; color: #495057; }
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
        .status-pill { font-size: 11px; padding: 3px 10px; border-radius: 12px; font-weight: 600; letter-spacing: 0.3px; }
        .st-gray { background: #F8F9FA; color: #ADB5BD; border: 1px solid #F1F3F5; }
        .st-blue { background: #E7F5FF; color: #1971C2; }
        .st-green { background: #EBFBEE; color: #2F9E44; border: 1px solid #D3F9D8; }
        .st-red { background: #FFF5F5; color: #FA5252; border: 1px solid #FFC9C9; }
        .st-orange { background: #FFF4E6; color: #FD7E14; }
        .st-yellow { background: #FFF9DB; color: #FAB005; }
        .empty-state { text-align: center; padding: 60px 20px; background: #fff; border-radius: 8px; border: 1px dashed #DEE2E6; color: #ADB5BD; margin-top: 10px; }
        .empty-icon { font-size: 32px; margin-bottom: 10px; opacity: 0.5; }
        .empty-icon svg { width: 48px; height: 48px; }
    `;
    $('<style>').text(css).appendTo('head');
}