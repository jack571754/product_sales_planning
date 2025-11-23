frappe.pages['demo-page'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '店铺提报执行看板',
        single_column: true
    });

    page.set_secondary_action('刷新数据', () => load_data(wrapper), 'refresh');

    // 注入样式
    $('head').append(get_css());

    // 初始加载
    load_data(wrapper);
};

function load_data(wrapper) {
    frappe.call({
        method: "product_sales_planning.planning_system.page.demo_page.get_dashboard_data",
        callback: function(r) {
            if (r.message) {
                render_demo_page(wrapper, r.message);
                console.log(r.message);
            }
        }
    });
}

function render_demo_page(wrapper, data) {
    const $body = $(wrapper).find('.layout-main-section');
    $body.empty();

    // 1. 顶部统计卡片
    const stats_html = `
        <div class="dashboard-stats-row">
            <div class="stat-card">
                <div class="stat-icon-box box-blue">
                    ${frappe.utils.icon('folder', 'md')}
                </div>
                <div class="stat-content">
                    <h4>${data.stats.ongoing || 0}</h4>
                    <span>进行中计划</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-box box-green">
                    ${frappe.utils.icon('check-square', 'md')}
                </div>
                <div class="stat-content">
                    <h4>${data.tasks.length || 0}</h4>
                    <span>待处理店铺</span>
                </div>
            </div>
        </div>
    `;

    // 2. 任务列表渲染
    let list_html = '';
    if (!data.tasks || data.tasks.length === 0) {
        list_html = `
            <div class="empty-state">
                <div class="empty-icon">${frappe.utils.icon('box', 'xl')}</div>
                <div class="empty-text">暂无开启中的提报任务</div>
            </div>`;
    } else {
        data.tasks.forEach(task => {
            // 数据准备
            const avatar = task.title ? task.title.charAt(0) : '店';
            const urgent_badge = task.is_urgent ? `<span class="badge-urgent">急</span>` : '';
            
            // 时间逻辑
            let time_html = '';
            // if (task.submit_time) {
            //     time_html = `<span class="text-success">${frappe.utils.icon('check', 'xs')} 已交 ${task.submit_time}</span>`;
            // } else {
			const style = task.is_urgent ? 'color:#FA5252; font-weight:bold;' : 'color:#868E96;';
			time_html = `<span style="${style}">${frappe.utils.icon('calendar', 'xs')} 截止 ${task.deadline}</span>`;
		// }

            // 状态徽章 (合并提交状态和审批状态)
            const status_badges = `
                ${get_status_badge(task.child_status, 'sub')}
                ${get_status_badge(task.approval_status, 'app')}
            `;

			list_html += `
				<div class="task-card" onclick="frappe.set_route('store-detail', '${task.store_id}','${task.parent_id}', '${task.deadline}')">
					
					<div class="card-left">
						<div class="store-avatar">${avatar}</div>
					</div>

					<div class="card-center">
						<div class="row-title">
							<span class="store-name">${task.title}</span>
							<span class="channel-badge">${task.channel}</span>
							${urgent_badge}
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
						<div class="row-time">${time_html}</div>
						<div class="row-status">${status_badges}</div>
					</div>
				</div>
			`;
        });
    }

    const layout = `
        <div class="page-container">
            ${stats_html}
            <div class="section-header">
                <span>执行明细列表</span>
                <span class="count-badge">${data.tasks.length}</span>
            </div>
            <div class="task-list-wrapper">
                ${list_html}
            </div>
        </div>
    `;

    $body.append(layout);
}

// 辅助：获取状态样式
function get_status_badge(status, type) {
    if (!status || status === '-' || status === '未开始') {
        if (type === 'app') return ''; // 未开始时，审批状态不显示
        return `<span class="status-pill st-gray">未开始</span>`;
    }

    let cls = 'st-gray';
    const s = status.toString();

    // 提交状态颜色
    if (type === 'sub') {
        if (['已提交', 'Submitted'].some(k => s.includes(k))) cls = 'st-blue';
        else if (['草稿', 'Draft'].some(k => s.includes(k))) cls = 'st-orange';
    }
    
    // 审批状态颜色
    if (type === 'app') {
        if (['通过', 'Approved'].some(k => s.includes(k))) cls = 'st-green';
        else if (['驳回', 'Rejected'].some(k => s.includes(k))) cls = 'st-red';
        else if (['审核', 'Pending'].some(k => s.includes(k))) cls = 'st-yellow';
    }

    return `<span class="status-pill ${cls}">${status}</span>`;
}

// 样式表
function get_css() {
    return `
    <style>
        /* 基础布局 */
        .page-container { padding: 15px; max-width: 1200px; margin: 0 auto; }
        
        /* 统计卡片 */
        .dashboard-stats-row { display: flex; gap: 20px; margin-bottom: 25px; }
        .stat-card { flex: 1; background: #fff; border: 1px solid #EBF1F5; border-radius: 12px; padding: 24px; display: flex; align-items: center; box-shadow: 0 2px 6px rgba(0,0,0,0.02); }
        .stat-icon-box { width: 52px; height: 52px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 16px; }
        .box-blue { background: #E7F5FF; color: #1864AB; }
        .box-green { background: #EBFBEE; color: #2B8A3E; }
        .stat-content h4 { font-size: 26px; margin: 0; font-weight: 700; color: #343A40; line-height: 1.2; }
        .stat-content span { color: #868E96; font-size: 14px; font-weight: 500; }

        /* 列表标题 */
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; color: #495057; font-weight: 600; font-size: 15px; }
        .count-badge { background: #E9ECEF; padding: 2px 8px; border-radius: 10px; font-size: 12px; color: #495057; }
        .task-list-wrapper { max-height: 70vh; overflow-y: auto; padding-right: 4px; }

        /* --- 核心：任务卡片布局 --- */
        .task-card {
            background: #fff;
            border: 1px solid #E9ECEF;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 12px;
            display: flex; /* 启用Flex布局 */
            align-items: center; /* 垂直居中 */
            transition: all 0.2s;
            cursor: pointer;
        }
        .task-card:hover { border-color: #CED4DA; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transform: translateY(-1px); }

        /* 左侧 */
        .card-left { flex-shrink: 0; margin-right: 16px; }
        .store-avatar { width: 48px; height: 48px; background: #F8F9FA; color: #495057; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px; border: 1px solid #DEE2E6; }

        /* 中间 (自适应宽度) */
        .card-center { flex-grow: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        
        .row-title { display: flex; align-items: center; gap: 8px; }
        .store-name { font-size: 16px; font-weight: 700; color: #212529; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .channel-badge { font-size: 11px; background: #F1F3F5; padding: 2px 6px; border-radius: 4px; color: #6C757D; border: 1px solid #DEE2E6; flex-shrink: 0; }
        .badge-urgent { background: #FFF5F5; color: #FA5252; font-size: 10px; padding: 2px 6px; border-radius: 4px; border: 1px solid #FFC9C9; font-weight: bold; }

        .row-meta { display: flex; align-items: center; font-size: 13px; color: #868E96; }
        .meta-item { display: flex; align-items: center; gap: 4px; }
        .user-item { color: #495057; }
        .meta-sep { margin: 0 8px; color: #DEE2E6; }

        /* 右侧 (固定对齐) */
        .card-right { flex-shrink: 0; text-align: right; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 6px; min-width: 140px; margin-left: 15px; }
        
        .row-time { font-size: 12px; display: flex; align-items: center; }
        .row-status { display: flex; gap: 5px; }

        /* 状态胶囊 */
        .status-pill { font-size: 11px; padding: 3px 10px; border-radius: 12px; font-weight: 600; letter-spacing: 0.3px; }
        .st-gray   { background: #F8F9FA; color: #ADB5BD; border: 1px solid #F1F3F5; }
        .st-blue   { background: #E7F5FF; color: #1971C2; }
        .st-green  { background: #EBFBEE; color: #2F9E44; border: 1px solid #D3F9D8; }
        .st-red    { background: #FFF5F5; color: #FA5252; border: 1px solid #FFC9C9; }
        .st-orange { background: #FFF4E6; color: #FD7E14; }
        .st-yellow { background: #FFF9DB; color: #FAB005; }

        /* 空状态 */
        .empty-state { text-align: center; padding: 60px 20px; background: #fff; border-radius: 8px; border: 1px dashed #DEE2E6; color: #ADB5BD; margin-top: 10px; }
        .empty-icon { font-size: 32px; margin-bottom: 10px; opacity: 0.5; }
    </style>
    `;
}