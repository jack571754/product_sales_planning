frappe.pages['demo-page'].on_page_load = function(wrapper) {
    // 1. 初始化页面框架
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '待提报店铺总览', // 标题更新
        single_column: true
    });

    // 右上角辅助按钮
    page.set_secondary_action('刷新数据', () => {
        load_data(wrapper);
    }, 'refresh');

    // 2. 初始化加载数据
    load_data(wrapper);
};

function load_data(wrapper) {
    // 调用后端 API
    // 【注意】请将 'planning_system' 替换为你实际的 App 名称
    // 请将 'api' 替换为你存放 get_dashboard_data 的模块名
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

    // --- A. CSS 样式 (增加新样式) ---
    const styles = `
        <style>
            .layout-main-section { padding-top: 15px; }
            
            /* 统计卡片 (不变) */
            .dashboard-stats-row { display: flex; gap: 20px; margin-bottom: 20px; }
            .stat-card { flex: 1; background: #fff; border-radius: 12px; padding: 24px 20px; display: flex; align-items: center; box-shadow: 0 2px 6px rgba(0,0,0,0.04); border: 1px solid #F3F5F7; }
            .stat-icon-box { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin-right: 16px; }
            .stat-content h4 { font-size: 28px; font-weight: 700; margin: 0; color: #1F272E; line-height: 1.2; }
            .stat-content span { font-size: 14px; color: #8D99A6; font-weight: 500; }

            /* 滚动容器 */
            .section-header { font-size: 15px; font-weight: 600; color: #5F6C7B; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between; }
            .task-scroll-container { max-height: 65vh; overflow-y: auto; padding-right: 5px; }
            .task-scroll-container::-webkit-scrollbar { width: 6px; }
            .task-scroll-container::-webkit-scrollbar-thumb { background: #dce0e5; border-radius: 3px; }

            /* --- 任务卡片 (升级布局) --- */
            .task-card { background: #fff; border-radius: 12px; padding: 16px 20px; margin-bottom: 10px; display: flex; align-items: flex-start; border: 1px solid #EBF1F5; transition: all 0.2s ease; cursor: pointer; }
            .task-card:hover { border-color: #D1D8DD; box-shadow: 0 4px 12px rgba(0,0,0,0.06); transform: translateY(-1px); }
            
            .store-avatar { width: 48px; height: 48px; background: #F8F9FA; color: #495057; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-right: 15px; flex-shrink: 0; font-weight: bold; font-size: 18px; margin-top: 2px;}

            .task-info { flex-grow: 1; }
            .store-name { font-size: 16px; font-weight: 700; color: #212529; margin-bottom: 4px; display: flex; align-items: center; }
            
            .channel-badge { font-size: 10px; background: #E9ECEF; padding: 2px 6px; border-radius: 4px; color: #495057; margin-left: 8px; font-weight: normal; border: 1px solid #DEE2E6; }
            .badge-urgent { background: #FFF5F5; color: #FA5252; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 8px; border: 1px solid #FFC9C9; }

            /* 负责人行 */
            .user-row { font-size: 13px; color: #555; margin-bottom: 4px; display: flex; align-items: center; }
            .user-icon { margin-right: 6px; color: #adb5bd; }

            .plan-name { font-size: 12px; color: #999; }

            /* 右侧元数据区域 */
            .task-meta { text-align: right; min-width: 150px; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; height: 100%; }
            
            /* 状态标签组 */
            .status-group { display: flex; gap: 5px; margin-top: 5px; }
            .status-pill { padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block; }
            
            /* 提交状态颜色 */
            .st-default { background: #F1F3F5; color: #495057; } /* 未开始 */
            .st-submitted { background: #E7F5FF; color: #1864AB; } /* 已提交 */
            
            /* 审批状态颜色 */
            .ap-approved { background: #EBFbee; color: #2B8A3E; border: 1px solid #D3F9D8; } /* 通过 */
            .ap-rejected { background: #FFF5F5; color: #FA5252; border: 1px solid #FFC9C9; } /* 驳回 */
        </style>
    `;
    $body.append(styles);

    // --- B. 列表渲染 ---
    let list_items_html = '';
    
    if (data.tasks.length === 0) {
        list_items_html = `<div style="text-align: center; padding: 60px; color: #ccc;">暂无任务</div>`;
    } else {
        data.tasks.forEach(task => {
            // 1. 渠道
            const channel_html = task.channel ? `<span class="channel-badge">${task.channel}</span>` : '';
            // 2. 紧急
            const urgent_html = task.is_urgent ? `<span class="badge-urgent">即将截止</span>` : '';
            // 3. 头像
            const avatar_char = task.title ? task.title.charAt(0) : '店';
            
            // 4. 状态样式逻辑
            let submit_class = 'st-default';
            if(task.child_status === '已提交' || task.child_status === 'Submitted') submit_class = 'st-submitted';
            
            let approval_html = '';
            if(task.approval_status) {
                let ap_class = 'ap-approved'; // 默认绿色
                if(task.approval_status.includes('驳回') || task.approval_status === 'Rejected') ap_class = 'ap-rejected';
                approval_html = `<span class="status-pill ${ap_class}">${task.approval_status}</span>`;
            }

            // 5. 时间显示逻辑
            // 如果有提交时间，显示提交时间；否则显示截止日期
            let time_display = '';
            if (task.submit_time) {
                time_display = `已提交: ${task.submit_time}`;
            } else {
                time_display = `截止: ${task.deadline}`;
            }

            list_items_html += `
                <div class="task-card" onclick="frappe.set_route('Form', 'Schedule tasks', '${task.id}')">
                    <div class="store-avatar">${avatar_char}</div>
                    
                    <div class="task-info">
                        <div class="store-name">
                            ${task.title} ${channel_html} ${urgent_html}
                        </div>
                        
                        <div class="user-row">
                            <span class="user-icon">${frappe.utils.icon('users', 'sm')}</span>
                            <span>${task.user}</span>
                        </div>

                        <div class="plan-name">
                            ${task.plan_type} <span style="color:#eee">|</span> ${task.task_code}
                        </div>
                    </div>
                    
                    <div class="task-meta">
                        <div style="font-size: 12px; color: #98A6B5; margin-bottom: 4px;">
                            ${time_display}
                        </div>
                        <div class="status-group">
                            <span class="status-pill ${submit_class}">
                                ${task.child_status}
                            </span>
                            ${approval_html}
                        </div>
                    </div>
                </div>
            `;
        });
    }

    // 组装
    // (注意：为了节省篇幅，这里省略了统计卡片 stats_html 的代码，你需要保留原来的 stats_html)
    const stats_html = `
        <div class="dashboard-stats-row">
            <div class="stat-card"><div class="stat-content"><h4>${data.stats.ongoing}</h4><span>进行中</span></div></div>
             <div class="stat-card"><div class="stat-content"><h4>${data.tasks.length}</h4><span>店铺数</span></div></div>
        </div>
    `; // 简写示例，请用回你原来的完整版

    const full_layout = `
        <div class="container-fluid">
            ${stats_html}
            <div class="section-header">
                <div>${frappe.utils.icon('list', 'sm')} <span style="margin-left: 8px;">执行明细表 (${data.tasks.length})</span></div>
            </div>
            <div class="task-scroll-container">
                ${list_items_html}
            </div>
        </div>
    `;

    $body.append(full_layout);
}