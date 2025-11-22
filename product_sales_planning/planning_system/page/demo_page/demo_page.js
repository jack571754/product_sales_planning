frappe.pages['demo-page'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '店铺提报执行看板',
        single_column: true
    });

    page.set_secondary_action('刷新', () => load_data(wrapper), 'refresh');

    // 加载样式
    $('head').append(get_css());

    load_data(wrapper);
};

function load_data(wrapper) {
    frappe.call({
        method: "product_sales_planning.planning_system.page.demo_page.get_dashboard_data",
        callback: function(r) {
            if (r.message) {
                render_demo_page(wrapper, r.message);
            }
        }
    });
}

function render_demo_page(wrapper, data) {
    const $body = $(wrapper).find('.layout-main-section');
    $body.empty();

    // 1. 统计栏 (简单版)
    const stats_html = `
        <div class="dashboard-stats-row">
            <div class="stat-card">
                <div class="stat-icon-box" style="background:#E8F5FE; color:#007BFF">
                    ${frappe.utils.icon('folder', 'md')}
                </div>
                <div class="stat-content"><h4>${data.stats.ongoing}</h4><span>进行中计划</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-icon-box" style="background:#E6FCF5; color:#0CA678">
                    ${frappe.utils.icon('check-square', 'md')}
                </div>
                <div class="stat-content"><h4>${data.tasks.length}</h4><span>待处理店铺</span></div>
            </div>
        </div>
    `;

    // 2. 任务列表
    let list_html = '';
    if (data.tasks.length === 0) {
        list_html = `<div class="empty-state">暂无开启中的提报任务</div>`;
    } else {
        data.tasks.forEach(task => {
            // 头像首字
            const avatar = task.title ? task.title.charAt(0) : '店';
            
            // 标签
            const urgent_badge = task.is_urgent 
                ? `<span class="badge-urgent">即将截止</span>` : '';
            
            // 时间显示逻辑：有提交时间显示提交时间，否则显示截止日
            let time_info = '';
            let time_icon = 'calendar';
            let time_color = '#98A6B5';

            if (task.submit_time) {
                time_info = `已提: ${task.submit_time}`;
                time_icon = 'check';
                time_color = '#2B8A3E'; // 绿色
            } else {
                time_info = `截止: ${task.deadline}`;
                if(task.is_urgent) time_color = '#FA5252'; // 红色
            }

            list_html += `
                <div class="task-card" onclick="frappe.set_route('Form', 'Schedule tasks', '${task.parent_id}')">
                    <div class="store-avatar">${avatar}</div>
                    
                    <div class="task-info">
                        <div class="store-name">
                            ${task.title} 
                            <span class="channel-badge">${task.channel}</span>
                            ${urgent_badge}
                        </div>
                        <div class="plan-info">
                             ${frappe.utils.icon('users', 'xs')} ${task.user} 
                             <span class="separator">•</span> 
                             ${task.plan_type}
                        </div>
                    </div>

                    <div class="task-meta">
                        <div class="time-row" style="color: ${time_color}">
                            ${frappe.utils.icon(time_icon, 'xs')} ${time_info}
                        </div>
                        <div class="status-group">
                            ${get_status_badge(task.child_status, 'sub')}
                            ${get_status_badge(task.approval_status, 'app')}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    const layout = `
        <div class="page-container">
            ${stats_html}
            <div class="list-header">执行明细 (${data.tasks.length})</div>
            <div class="task-scroll-container">
                ${list_html}
            </div>
        </div>
    `;

    $body.append(layout);
}

// 辅助函数：生成状态徽章
function get_status_badge(status, type) {
    if (!status || status === '-' || status === '未开始') {
        // 如果是审批状态且为空，不显示
        if (type === 'app') return ''; 
        return `<span class="status-pill st-default">未开始</span>`;
    }

    let cls = 'st-default';
    
    // 提交状态颜色映射
    if (type === 'sub') {
        if (['已提交', 'Submitted', '完成'].includes(status)) cls = 'st-submitted';
        if (['草稿', 'Draft'].includes(status)) cls = 'st-draft';
    }
    
    // 审批状态颜色映射
    if (type === 'app') {
        if (['通过', 'Approved'].includes(status)) cls = 'ap-approved';
        if (['驳回', 'Rejected'].includes(status)) cls = 'ap-rejected';
        if (['审核中', 'Pending'].includes(status)) cls = 'ap-pending';
    }

    return `<span class="status-pill ${cls}">${status}</span>`;
}

function get_css() {
    return `
    <style>
        .page-container { padding: 15px; max-width: 1000px; margin: 0 auto; }
        
        /* 统计卡片 */
        .dashboard-stats-row { display: flex; gap: 20px; margin-bottom: 25px; }
        .stat-card { flex: 1; background: #fff; border: 1px solid #EBF1F5; border-radius: 8px; padding: 20px; display: flex; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
        .stat-icon-box { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 15px; }
        .stat-content h4 { font-size: 24px; margin: 0; font-weight: 700; color: #1F272E; }
        .stat-content span { color: #8D99A6; font-size: 13px; }

        /* 列表 */
        .list-header { font-size: 14px; font-weight: 600; color: #5F6C7B; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .task-scroll-container { max-height: 70vh; overflow-y: auto; }

        /* 任务卡片 */
        .task-card { background: #fff; border: 1px solid #E2E6EA; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; align-items: center; transition: all 0.2s; cursor: pointer; }
        .task-card:hover { border-color: #C0C6CC; box-shadow: 0 4px 10px rgba(0,0,0,0.05); transform: translateY(-1px); }
        
        .store-avatar { width: 42px; height: 42px; background: #F1F3F5; color: #495057; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: 700; font-size: 16px; flex-shrink: 0; }
        
        .task-info { flex: 1; min-width: 0; } /* min-width 修复 flex 文本溢出 */
        .store-name { font-size: 15px; font-weight: 600; color: #212529; margin-bottom: 4px; display: flex; align-items: center; }
        .plan-info { font-size: 12px; color: #868E96; display: flex; align-items: center; }
        .separator { margin: 0 6px; color: #DEE2E6; }

        .channel-badge { font-size: 11px; background: #F8F9FA; border: 1px solid #DEE2E6; padding: 1px 6px; border-radius: 4px; color: #495057; margin-left: 8px; font-weight: normal; }
        .badge-urgent { background: #FFF5F5; color: #E03131; font-size: 10px; padding: 1px 6px; border-radius: 4px; border: 1px solid #FFC9C9; margin-left: 6px; }

        .task-meta { text-align: right; padding-left: 15px; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; }
        .time-row { font-size: 12px; margin-bottom: 6px; display: flex; align-items: center; gap: 4px; font-weight: 500; }
        
        .status-group { display: flex; gap: 6px; }
        .status-pill { font-size: 11px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
        
        /* 状态颜色定义 */
        .st-default { background: #F1F3F5; color: #868E96; }
        .st-submitted { background: #E7F5FF; color: #1C7ED6; }
        .st-draft { background: #FFF4E6; color: #FD7E14; }
        
        .ap-approved { background: #E6FCF5; color: #0CA678; border: 1px solid #C3FAE8; }
        .ap-rejected { background: #FFF5F5; color: #FA5252; border: 1px solid #FFC9C9; }
        .ap-pending { background: #FFF9DB; color: #F08C00; border: 1px solid #FFEC99; }

        .empty-state { text-align: center; padding: 40px; color: #ADB5BD; background: #F8F9FA; border-radius: 8px; border: 1px dashed #DEE2E6; }
    </style>`;
}