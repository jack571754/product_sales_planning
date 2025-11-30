// product_sales_planning/planning_system/page/planning_dashboard/planning_dashboard.js

// 1. 页面加载（只执行一次，用于初始化）
frappe.pages['planning-dashboard'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '计划任务看板',
        single_column: true
    });

    // 预留挂载点
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

    // 初始化 Vue
    if (window.Vue) {
        init_vue_app(wrapper, page);
    } else {
        frappe.require("/assets/frappe/node_modules/vue/dist/vue.global.js", function() {
            init_vue_app(wrapper, page);
        });
    }
};

// 2. 页面显示（每次切换回来都会执行）
frappe.pages['planning-dashboard'].on_page_show = function(wrapper) {
    // 检查 Vue 实例是否存在且具备 fetchData 方法
    if (wrapper.vue_app && wrapper.vue_app.fetchData) {
        console.log("页面显示，自动刷新数据...");
        wrapper.vue_app.fetchData();
    }
};

// 3. 页面卸载（清理资源）
frappe.pages['planning-dashboard'].on_page_unload = function(wrapper) {
    if (wrapper.vue_app && wrapper.vue_app.$destroy) {
        wrapper.vue_app.$destroy();
    }
};

function init_vue_app(wrapper, page) {
    if (!window.Vue) return;

    const { createApp, reactive, onMounted, toRefs } = window.Vue;

    const App = {
        template: `
            <div class="page-container">
                <div class="dashboard-stats-row">
                    <div class="stat-card">
                        <div class="stat-icon-box box-blue" v-html="getIcon('folder', 'md')"></div>
                        <div class="stat-content">
                            <h4>{{ stats.ongoing || 0 }}</h4>
                            <span>进行中计划</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon-box box-green" v-html="getIcon('check-square', 'md')"></div>
                        <div class="stat-content">
                            <h4>{{ stats.tasks_count || 0 }}</h4>
                            <span>待处理店铺</span>
                        </div>
                    </div>
                </div>

                <div class="section-header">
                    <span>执行明细列表</span>
                    <span class="count-badge">{{ tasks.length }}</span>
                </div>

                <div class="task-list-wrapper">
                    
                    <div v-if="loading" class="text-center p-5">
                        <div class="spinner-border spinner-border-sm text-muted"></div>
                    </div>

                    <div v-else-if="tasks.length === 0" class="empty-state">
                        <div class="empty-icon" v-html="getIcon('box', 'xl')"></div>
                        <div class="empty-text">暂无开启中的提报任务</div>
                    </div>

                    <div v-else 
                        v-for="task in tasks" 
                        :key="task.row_id" 
                        class="task-card" 
                        @click="goToDetail(task)">
                        
                        <div class="card-left">
                            <div class="store-avatar">{{ getAvatar(task.title) }}</div>
                        </div>

                        <div class="card-center">
                            <div class="row-title">
                                <span class="store-name">{{ task.title }}</span>
                                <span class="channel-badge">{{ task.channel }}</span>
                                <span v-if="task.is_urgent" class="badge-urgent">急</span>
                            </div>
                            <div class="row-meta">
                                <span class="meta-item user-item">
                                    <span v-html="getIcon('users', 'xs')"></span> {{ task.user }}
                                </span>
                                <span class="meta-sep">•</span>
                                <span class="meta-item">{{ task.plan_type }}</span>
                            </div>
                        </div>

                        <div class="card-right">
                            <div class="row-time">
                                <span :style="getTimeStyle(task.is_urgent)">
                                    <span v-html="getIcon('calendar', 'xs')"></span> 截止 {{ task.deadline }}
                                </span>
                            </div>
                            <div class="row-status">
                                <span v-html="getStatusBadgeHTML(task.child_status, 'sub')"></span>
                                <span v-html="getStatusBadgeHTML(task.approval_status, 'app')"></span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        `,
        setup() {
            const state = reactive({
                stats: { ongoing: 0, tasks_count: 0 },
                tasks: [],
                loading: false
            });

            const fetchData = () => {
                state.loading = true;
                frappe.call({
                    method: "product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_dashboard_data",
                    callback: function(r) {
                        state.loading = false;
                        if (r.message) {
                            // 检查是否有错误
                            if (r.message.error) {
                                frappe.msgprint({
                                    title: '加载失败',
                                    message: r.message.error,
                                    indicator: 'red'
                                });
                                state.stats = { ongoing: 0, tasks_count: 0 };
                                state.tasks = [];
                                return;
                            }

                            state.stats = r.message.stats || { ongoing: 0, tasks_count: 0 };
                            state.tasks = r.message.tasks || [];
                            state.stats.tasks_count = state.tasks.length;
                        } else {
                            // 没有返回数据
                            state.stats = { ongoing: 0, tasks_count: 0 };
                            state.tasks = [];
                        }
                    },
                    error: function(err) {
                        state.loading = false;
                        console.error('获取看板数据失败:', err);
                        frappe.msgprint({
                            title: '加载失败',
                            message: '无法加载看板数据，请稍后重试',
                            indicator: 'red'
                        });
                        state.stats = { ongoing: 0, tasks_count: 0 };
                        state.tasks = [];
                    }
                });
            };

            const goToDetail = (task) => {
                // 修复：只传递 store_id 和 task_id (parent_id)，移除多余的 deadline 参数
                frappe.set_route('store-detail', task.store_id, task.parent_id);
            };

            // 辅助函数
            const getIcon = (iconName, size) => frappe.utils.icon(iconName, size || 'sm');
            const getAvatar = (title) => title ? title.charAt(0) : '店';
            const getTimeStyle = (isUrgent) => isUrgent ? 'color:#FA5252; font-weight:bold;' : 'color:#868E96;';
            
            const getStatusBadgeHTML = (status, type) => {
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
            };

            onMounted(() => {
                fetchData();
            });

            page.set_secondary_action('刷新数据', fetchData, 'refresh');

            return {
                ...toRefs(state),
                getIcon,
                getAvatar,
                getTimeStyle,
                getStatusBadgeHTML,
                goToDetail,
                fetchData // <--- 关键：必须返回这个方法，on_page_show 才能调用
            };
        }
    };

    const app = createApp(App);
    // 关键：将挂载后的 Vue 实例保存到 wrapper 上
    wrapper.vue_app = app.mount($(wrapper).find('#planning-dashboard-app')[0]);
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