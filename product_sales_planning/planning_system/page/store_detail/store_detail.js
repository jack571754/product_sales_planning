// product_sales_planning/planning_system/page/store_detail/store_detail.js

// 1. 页面加载入口 (只执行一次)
frappe.pages['store-detail'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '商品规划管理',
        single_column: true
    });

    // 预留 DOM 挂载点 (移除加载动画,直接显示空白)
    $(wrapper).find('.layout-main-section').html(`
        <div id="store-detail-app" style="min-height: 600px;">
            <!-- 无加载动画,直接初始化 -->
        </div>
    `);

    // 样式注入（优先加载，确保只执行一次）
    if (!document.getElementById('store-detail-css')) {
        $('<style>').attr('id', 'store-detail-css').text(`
            /* 可滚动的主容器 */
            .store-planning-body {
                padding: 10px;
                max-width: 100%;
                margin: 0 auto;
                min-height: 100vh;
            }

            /* 固定头部区域（操作栏 + 筛选器 + 统计卡片） */
            .fixed-header-area {
                flex-shrink: 0;
                background: var(--bg-color, #fff);
                padding-bottom: 10px;
                border-bottom: 2px solid var(--border-color);
                margin-bottom: 10px;
            }

            .filter-card {
                background: var(--app-card-bg, #ffffff);
                padding: 12px 15px;
                border-radius: var(--app-border-radius-md, 8px);
                border: 1px solid var(--app-border-color, #e3e6ea);
                margin-bottom: 10px;
                box-shadow: var(--app-shadow-sm, 0 1px 2px rgba(0,0,0,0.05));
            }
            .filter-card .row {
                align-items: flex-end;
            }

            /* 表格容器样式 */
            .datatable-container {
                background: #fff;
                border-radius: 6px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                overflow: visible;
            }

            #handsontable-container {
                width: 100%;
            }

            /* 操作按钮样式 */
            .action-buttons {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
                align-items: center;
            }
            .action-buttons .btn-sm {
                padding: 6px 12px;
                font-size: 13px;
            }

            /* 统计卡片样式 */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 10px;
                margin-bottom: 0;
            }
            .stat-card {
                padding: 16px;
                background: var(--app-card-bg, #ffffff);
                border-radius: var(--app-border-radius-md, 8px);
                border: 1px solid var(--app-border-color, #e3e6ea);
                box-shadow: var(--app-shadow-md, 0 1px 3px rgba(0,0,0,0.05));
                display: flex;
                align-items: center;
            }
            .stat-icon-box {
                width: var(--app-stat-icon-size, 48px);
                height: var(--app-stat-icon-size, 48px);
                border-radius: var(--app-border-radius-md, 8px);
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
            }
            .stat-icon-box svg {
                width: 22px;
                height: 22px;
            }
            .box-blue { background: #e8f4fd; color: #2c7be5; }
            .box-green { background: #e8f8f0; color: #00ba88; }
            .stat-content h4 {
                font-size: var(--app-stat-number-size, 24px);
                margin: 0;
                font-weight: var(--app-stat-number-weight, 700);
                color: var(--app-text-dark, #111314);
                line-height: 1.2;
            }
            .stat-content span {
                color: var(--app-text-muted, #6c757d);
                font-size: 12px;
                font-weight: 500;
            }
            .text-primary { color: #4472C4; }
            .text-success { color: #28a745; }

            /* AG Grid 统一字体颜色 */
            .ag-theme-alpine .ag-cell {
                color: var(--app-text-dark, #111314) !important;
            }
            .btn-search {
                margin-bottom: 10px;
            }
            .w-100 {
                width: 100%;
            }

            /* 列设置样式 */
            .column-settings-section {
                flex-shrink: 0;
                margin-bottom: 10px;
            }

            /* Handsontable 容器 */
            .handsontable-container {
                border: 1px solid #d1d5db;
                border-radius: 6px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                margin-bottom: 20px;
            }

            /* 分页器样式 */
            .pagination-controls {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background: #f9fafb;
                border-top: 1px solid #e5e7eb;
                border-radius: 0 0 6px 6px;
                margin-top: -1px;
            }

            .pagination-info {
                font-size: 14px;
                color: #6b7280;
            }

            .pagination-buttons {
                display: flex;
                gap: 8px;
                align-items: center;
            }

            .pagination-buttons .btn {
                padding: 6px 12px;
                font-size: 13px;
            }

            .pagination-buttons input {
                width: 60px;
                text-align: center;
                padding: 6px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
            }

            .pagination-buttons select {
                padding: 6px 10px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                background: white;
            }
            .column-settings-card {
                background: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            }
            .column-settings-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
            }
            .column-settings-title {
                font-size: 14px;
                font-weight: 600;
                color: #374151;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .column-settings-actions {
                display: flex;
                gap: 10px;
            }
            .column-checkboxes {
                padding: 20px;
                display: none;
            }
        `).appendTo('head');
    }

    // 资源加载（优化版：移除不必要的延迟）
    const loadResources = () => {
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (window.Handsontable) {
                console.log('✅ Handsontable already loaded');
                resolve();
                return;
            }

            // 加载CSS
            const loadCSS = (id, href) => {
                return new Promise((res, rej) => {
                    if (document.getElementById(id)) {
                        res();
                        return;
                    }
                    const link = document.createElement('link');
                    link.id = id;
                    link.rel = 'stylesheet';
                    link.href = href;
                    link.onload = () => res();
                    link.onerror = () => rej(new Error(`${id}加载失败`));
                    document.head.appendChild(link);
                });
            };

            // 加载JS
            const loadJS = (src) => {
                return new Promise((res, rej) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.async = false;
                    script.onload = () => {
                        if (window.Handsontable) {
                            res();
                        } else {
                            rej(new Error('Handsontable对象未初始化'));
                        }
                    };
                    script.onerror = () => rej(new Error('Handsontable JS加载失败'));
                    document.head.appendChild(script);
                });
            };

            // 串行加载：CSS -> JS
            Promise.resolve()
                .then(() => loadCSS('handsontable-css', '/assets/product_sales_planning/js/lib/handsontable.full.min.css'))
                .then(() => loadJS('/assets/product_sales_planning/js/lib/handsontable.full.min.js'))
                .then(() => {
                    console.log('✅ All resources loaded');
                    resolve();
                })
                .catch(reject);

            // 设置总超时（10秒）
            setTimeout(() => {
                reject(new Error('资源加载超时，请检查网络或刷新页面'));
            }, 10000);
        });
    };

    // 加载资源并初始化
    loadResources()
        .then(() => {
            console.log('✅ Resources loaded, initializing manager...');
            try {
                wrapper.store_manager = new StorePlanningManager(wrapper, page);
                console.log('✅ StorePlanningManager initialized');
            } catch (error) {
                console.error('❌ Manager initialization error:', error);
                $(wrapper).find('#store-detail-app').html(`
                    <div class="alert alert-danger m-5">
                        <h4>页面初始化失败</h4>
                        <p>${error.message}</p>
                        <button class="btn btn-primary" onclick="location.reload()">刷新页面</button>
                    </div>
                `);
            }
        })
        .catch((error) => {
            console.error('❌ Resource loading error:', error);
            $(wrapper).find('#store-detail-app').html(`
                <div class="alert alert-danger m-5">
                    <h4>资源加载失败</h4>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="location.reload()">刷新页面</button>
                </div>
            `);
        });
};

// 2. 页面显示入口 (路由变化、切换Tab都会触发)
frappe.pages['store-detail'].on_page_show = function(wrapper) {
    if (wrapper.store_manager) {
        // ✅ 跳过首次加载（构造函数已经调用了 refresh_from_route）
        if (wrapper.store_manager.is_first_load) {
            console.log('⏭️ 跳过 on_page_show 调用（首次加载）');
            wrapper.store_manager.is_first_load = false;
            return;
        }

        // ✅ 避免在页面加载期间重复调用
        if (!wrapper.store_manager.is_loading) {
            wrapper.store_manager.refresh_from_route();
        } else {
            console.log('⏭️ 跳过 on_page_show 调用（正在加载中）');
        }
    }
};

// --- 核心业务类 ---
class StorePlanningManager {
    constructor(wrapper, page) {
        this.wrapper = $(wrapper);
        this.page = page;
        this.data = [];
        this.months = [];
        this.checked_rows = new Set();
        this.view_mode = 'multi';  // 固定使用多月视图
        

        // 程序锁：防止 set_value 触发 change 事件导致死循环
        this.is_programmatic_update = false;

        // 标记是否正在加载数据（避免重复加载）
        this.is_loading = false;

        // 标记是否是首次加载（避免 on_page_show 重复调用）
        this.is_first_load = true;

        this.init_ui();

        // ✅ 初始化时立即尝试读取一次路由
        this.refresh_from_route();
    }

    init_ui() {
        this.page.clear_primary_action();
        this.page.set_primary_action('刷新', () => this.fetch_data());
        this.page.clear_menu();

        this.wrapper.find('#store-detail-app').html(`
            <div class="store-planning-body">
                <!-- 🔥 固定头部区域 -->
                <div class="fixed-header-area">
                    <!-- 顶部操作栏 -->
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h5 class="mb-0">商品计划填报</h5>
                        <div class="action-buttons">
                            <button class="btn btn-sm btn-secondary btn-return">
                                <span class="fa fa-arrow-left"></span> 返回
                            </button>
                            <button class="btn btn-sm btn-danger btn-batch-delete-inline" style="display: none;">
                                <span class="fa fa-trash"></span> 批量删除
                            </button>
                            <button class="btn btn-sm btn-info btn-import-excel" style="display: none;">
                                <span class="fa fa-upload"></span> 单品导入
                            </button>
                            <button class="btn btn-sm btn-primary btn-import-mechanism" style="display: none;">
                                <span class="fa fa-cubes"></span> 机制导入
                            </button>
                            <button class="btn btn-sm btn-success btn-add-product" style="display: none;">
                                <span class="fa fa-plus"></span> 添加商品
                            </button>
                            <button class="btn btn-sm btn-default btn-apply-mechanism" style="display: none;">
                                <span class="fa fa-magic"></span> 应用机制
                            </button>
                            <!-- 审批相关按钮 -->
                            <button class="btn btn-sm btn-warning btn-submit-approval" style="display: none;">
                                <span class="fa fa-paper-plane"></span> 提交审批
                            </button>
                            <button class="btn btn-sm btn-secondary btn-withdraw-approval" style="display: none;">
                                <span class="fa fa-undo"></span> 撤回
                            </button>
                            <button class="btn btn-sm btn-success btn-approve" style="display: none;">
                                <span class="fa fa-check"></span> 通过
                            </button>
                            <button class="btn btn-sm btn-danger btn-reject-previous" style="display: none;">
                                <span class="fa fa-undo"></span> 退回上一级
                            </button>
                            <button class="btn btn-sm btn-danger btn-reject-submitter" style="display: none;">
                                <span class="fa fa-reply"></span> 退回提交人
                            </button>
                            <button class="btn btn-sm btn-info btn-view-history" style="display: none;">
                                <span class="fa fa-history"></span> 审批历史
                            </button>
                        </div>
                    </div>

                    <!-- 筛选区域 -->
                    <div class="filter-card">
                        <div class="row">
                            <div class="col-md-6 filter-store"></div>
                            <div class="col-md-6 filter-task"></div>
                        </div>
                    </div>

                    <!-- 统计信息 -->
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon-box box-blue">${frappe.utils.icon('package', 'md')}</div>
                            <div class="stat-content">
                                <h4 id="stat-total">0</h4>
                                <span>总计划量</span>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon-box box-green">${frappe.utils.icon('check-square', 'md')}</div>
                            <div class="stat-content">
                                <h4 id="stat-count">0 / 0</h4>
                                <span>已规划SKU</span>
                            </div>
                        </div>
                    </div>

                    <!-- 审批状态显示区域 -->
                    <div class="approval-status-area" style="display: none; margin-top: 10px;">
                        <div class="alert" id="approval-alert">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>审批状态：</strong>
                                    <span id="approval-status-text">-</span>
                                    <span id="approval-step-text" style="margin-left: 10px;"></span>
                                </div>
                                <div id="rejection-reason-area" style="display: none;">
                                    <strong>退回原因：</strong>
                                    <span id="rejection-reason-text" class="text-danger"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 列设置区域 -->
                <div class="column-settings-section">
                    <div class="column-settings-card">
                        <div class="column-settings-header">
                            <div class="column-settings-title">
                                <i class="fa fa-columns"></i> 列显示设置
                            </div>
                            <div class="column-settings-actions">
                                <button class="btn btn-sm btn-default btn-toggle-column-settings">
                                    <i class="fa fa-cog"></i> 管理列
                                </button>
                                <button class="btn btn-sm btn-success btn-export-excel">
                                    <span class="fa fa-download"></span> 导出Excel
                                </button>
                            </div>
                        </div>
                        <div id="column-checkboxes" class="column-checkboxes"></div>
                    </div>
                </div>

                <!-- 表格容器（可滚动） -->
                <div class="handsontable-container">
                    <div id="datatable-container" class="datatable-container"></div>

                    <!-- 分页器 -->
                    <div class="pagination-controls" style="display: flex; justify-content: flex-end; align-items: center; padding: 12px 16px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
                        <div class="pagination-info-left" style="display: flex; align-items: center; gap: 16px; font-size: 13px; color: #6b7280; margin-right: auto;">
                            <span style="display: flex; align-items: center; gap: 6px;">
                                共 <strong id="total-records" style="color: #111827; font-weight: 600;">0</strong> 条记录
                            </span>
                            <span style="color: #d1d5db;">|</span>
                            <span style="display: flex; align-items: center; gap: 6px;">
                                每页
                                <select class="form-control input-xs" id="page-size-selector" style="display: inline-block; width: 75px; height: 32px; padding: 4px 8px; font-size: 13px; border: 1px solid #d1d5db; border-radius: 6px; margin: 0; vertical-align: middle; background: #fff; cursor: pointer;">
                                    <option value="20" selected>20</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="200">200</option>
                                </select>
                                条
                            </span>
                        </div>
                        <div class="pagination-buttons" style="display: flex; align-items: center; gap: 8px;">
                            <span class="pagination-page-info" style="font-size: 13px; color: #6b7280; margin-right: 12px;">
                                第 <strong id="current-page" style="color: #111827; font-weight: 600;">1</strong> / <strong id="total-pages" style="color: #111827; font-weight: 600;">1</strong> 页
                            </span>
                            <button class="btn btn-xs btn-default btn-first-page" title="首页" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; min-width: 36px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">
                                <i class="fa fa-angle-double-left"></i>
                            </button>
                            <button class="btn btn-xs btn-default btn-prev-page" title="上一页" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; min-width: 36px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">
                                <i class="fa fa-angle-left"></i>
                            </button>
                            <input type="number" class="form-control input-xs" id="goto-page-input" min="1" placeholder="页码" style="width: 70px; height: 32px; padding: 4px 8px; font-size: 13px; text-align: center; border: 1px solid #d1d5db; border-radius: 6px;">
                            <button class="btn btn-xs btn-primary btn-goto-page" style="padding: 6px 14px; border-radius: 6px; font-size: 13px; height: 32px;">跳转</button>
                            <button class="btn btn-xs btn-default btn-next-page" title="下一页" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; min-width: 36px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">
                                <i class="fa fa-angle-right"></i>
                            </button>
                            <button class="btn btn-xs btn-default btn-last-page" title="末页" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; min-width: 36px; height: 32px; display: inline-flex; align-items: center; justify-content: center;">
                                <i class="fa fa-angle-double-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        // 绑定按钮事件
        this.wrapper.find('.btn-return').on('click', () => this.return_to_previous());
        this.wrapper.find('.btn-export-excel').on('click', () => this.export_to_excel());
        this.wrapper.find('.btn-add-product').on('click', () => this.open_product_dialog());
        this.wrapper.find('.btn-import-excel').on('click', () => this.open_import_dialog());
        this.wrapper.find('.btn-import-mechanism').on('click', () => this.open_mechanism_import_dialog());
        this.wrapper.find('.btn-apply-mechanism').on('click', () => this.open_apply_mechanism_dialog());

        // 内联批量删除按钮
        this.wrapper.find('.btn-batch-delete-inline').on('click', () => this.handle_batch_delete());

        // 审批相关按钮
        this.wrapper.find('.btn-submit-approval').on('click', () => this.submit_for_approval());
        this.wrapper.find('.btn-withdraw-approval').on('click', () => this.withdraw_approval());
        this.wrapper.find('.btn-approve').on('click', () => this.approve_task());
        this.wrapper.find('.btn-reject-previous').on('click', () => this.reject_to_previous());
        this.wrapper.find('.btn-reject-submitter').on('click', () => this.reject_to_submitter());
        this.wrapper.find('.btn-view-history').on('click', () => this.view_approval_history());

        // 列设置器按钮
        this.wrapper.find('.btn-toggle-column-settings').on('click', () => this.toggle_column_settings());

        // 分页按钮事件
        this.wrapper.find('.btn-first-page').on('click', () => this.goto_page(1));
        this.wrapper.find('.btn-prev-page').on('click', () => this.goto_page(this.currentPage - 1));
        this.wrapper.find('.btn-next-page').on('click', () => this.goto_page(this.currentPage + 1));
        this.wrapper.find('.btn-last-page').on('click', () => {
            const totalPages = Math.ceil(this.hotData.length / this.pageSize);
            this.goto_page(totalPages);
        });
        this.wrapper.find('.btn-goto-page').on('click', () => {
            const page = parseInt(this.wrapper.find('#goto-page-input').val());
            if (page && page > 0) this.goto_page(page);
        });
        this.wrapper.find('#goto-page-input').on('keypress', (e) => {
            if (e.which === 13) { // Enter键
                const page = parseInt(this.wrapper.find('#goto-page-input').val());
                if (page && page > 0) this.goto_page(page);
            }
        });
        this.wrapper.find('#page-size-selector').on('change', (e) => {
            this.pageSize = parseInt($(e.target).val());
            this.currentPage = 1;
            this.updateTableData();
        });

        this.init_filter_fields();
    }

    init_filter_fields() {
        this.filter_group = new frappe.ui.FieldGroup({
            fields: [
                {
                    fieldname: 'store_id',
                    label: '店铺',
                    fieldtype: 'Link',
                    options: 'Store List',
                    change: () => {
                        if (!this.is_programmatic_update) {
                            console.log('🔄 店铺筛选器变化');
                            setTimeout(() => this.on_filter_change(), 50);
                        }
                    }
                },
                {
                    fieldname: 'task_id',
                    label: '计划任务',
                    fieldtype: 'Link',
                    options: 'Schedule tasks',
                    change: () => {
                        if (!this.is_programmatic_update) {
                            console.log('🔄 任务筛选器变化');
                            setTimeout(() => this.on_filter_change(), 50);
                        }
                    }
                }
            ],
            body: this.wrapper.find('.filter-card')
        });

        this.filter_group.make();

        // 手动布局到 Grid
        const f = this.filter_group.fields_dict;
        f.store_id.$wrapper.appendTo(this.wrapper.find('.filter-store'));
        f.task_id.$wrapper.appendTo(this.wrapper.find('.filter-task'));
    }

    // 返回上一级页面
    return_to_previous() {
        frappe.set_route('planning-dashboard');
    }

    // 🔥 核心：安全的路由同步逻辑（增强版）
    refresh_from_route() {
        const route = frappe.get_route();
        console.log('🔄 路由刷新:', route);

        // 检查路由是否包含有效的参数
        const hasValidParams = route[1] && route[1] !== 'undefined' && route[1] !== 'null' && route[1] !== '';

        if (hasValidParams) {
            const storeId = decodeURIComponent(route[1]);
            const taskId = route[2] && route[2] !== 'undefined' && route[2] !== 'null' && route[2] !== ''
                ? decodeURIComponent(route[2])
                : null;

            console.log('📍 解析路由参数:', { storeId, taskId });

            // 1. 上锁：防止 set_value 触发 change -> set_route 导致死循环
            this.is_programmatic_update = true;

            // 使用更长的延迟确保 Frappe 的 Link 字段完全初始化（针对慢速网络）
            const initDelay = 200;

            setTimeout(() => {
                // 检查筛选器是否已初始化
                if (!this.filter_group || !this.filter_group.fields_dict) {
                    console.warn('⚠️ 筛选器未初始化，延迟重试...');
                    setTimeout(() => this.refresh_from_route(), 300);
                    return;
                }

                // 设置筛选器值
                const promises = [];

                if (storeId && this.filter_group.fields_dict.store_id) {
                    promises.push(
                        this.filter_group.fields_dict.store_id.set_value(storeId)
                            .catch(err => {
                                console.error('设置store_id失败:', err);
                                return Promise.resolve(); // 继续执行
                            })
                    );
                }

                if (taskId && this.filter_group.fields_dict.task_id) {
                    promises.push(
                        this.filter_group.fields_dict.task_id.set_value(taskId)
                            .catch(err => {
                                console.error('设置task_id失败:', err);
                                return Promise.resolve(); // 继续执行
                            })
                    );
                }

                // 使用超时保护
                const timeoutPromise = new Promise((resolve) => {
                    setTimeout(() => {
                        console.warn('⚠️ 筛选器设置超时，继续加载数据');
                        resolve();
                    }, 3000); // 3秒超时
                });

                Promise.race([
                    Promise.all(promises),
                    timeoutPromise
                ]).then(() => {
                    console.log('✅ 筛选器值已设置');
                    this.is_programmatic_update = false; // 解锁

                    // 2. 直接查询，不依赖 UI 取值 (解决回显慢/需点击的问题)
                    this.fetch_data({ storeId, taskId });
                }).catch(err => {
                    console.error('❌ 设置过滤器值失败:', err);
                    this.is_programmatic_update = false;
                    // 即使失败也尝试加载数据
                    this.fetch_data({ storeId, taskId });
                });
            }, initDelay);
        } else {
            // 路由无有效参数或参数无效，清空过滤器并加载数据
            console.log('⚠️ 路由参数无效，清空筛选器');
            this.is_programmatic_update = true;

            setTimeout(() => {
                if (!this.filter_group || !this.filter_group.fields_dict) {
                    console.warn('⚠️ 筛选器未初始化');
                    this.is_programmatic_update = false;
                    return;
                }

                Promise.all([
                    this.filter_group.fields_dict.store_id.set_value('').catch(() => Promise.resolve()),
                    this.filter_group.fields_dict.task_id.set_value('').catch(() => Promise.resolve())
                ]).then(() => {
                    this.is_programmatic_update = false;
                    this.fetch_data();
                }).catch(err => {
                    console.error('清空过滤器值失败:', err);
                    this.is_programmatic_update = false;
                    this.fetch_data();
                });
            }, 200);
        }
    }

    // 用户手动筛选触发
    on_filter_change() {
        if (this.is_programmatic_update) return;

        const storeId = this.filter_group.get_value('store_id');
        const taskId = this.filter_group.get_value('task_id');
        
        // 更新路由，这会触发 on_page_show
        const currentRoute = frappe.get_route();
        const newStoreId = storeId || '';
        const newTaskId = taskId || '';
        
        // 只有当路由参数真正改变时才更新路由
        if (currentRoute[1] !== newStoreId || currentRoute[2] !== newTaskId) {
            frappe.set_route('store-detail', newStoreId, newTaskId);
        } else {
            // 路由没变（例如只改了搜索词），直接查询
            this.fetch_data();
        }
    }

    fetch_data(params = null) {
        // 优先用传入参数，否则取 UI 值
        const storeId = params ? params.storeId : this.filter_group.get_value('store_id');
        const taskId = params ? params.taskId : this.filter_group.get_value('task_id');
        const searchTerm = this.filter_group.get_value('search_term');

        // 清除状态
        this.checked_rows.clear();
        this.update_batch_btn();

        // ✅ 设置加载标志
        this.is_loading = true;

        frappe.call({
            method: "product_sales_planning.planning_system.page.store_detail.store_detail.get_store_commodity_data",
            args: {
                store_id: storeId && storeId !== 'undefined' && storeId !== 'null' ? storeId : null,
                task_id: taskId && taskId !== 'undefined' && taskId !== 'null' ? taskId : null,
                search_term: searchTerm && searchTerm !== 'undefined' && searchTerm !== 'null' ? searchTerm : null,
                start: 0,
                page_length: 2000, // 大数据量一次拉取
                view_mode: this.view_mode
            },
            freeze: false,  // 不显示加载动画
            async: true,    // 异步加载，不阻塞UI
            callback: (r) => {
                if (r.message && !r.message.error) {
                    this.data = r.message.data || [];
                    this.months = r.message.months || [];
                    this.init_table();
                    this.update_stats();
                    // ✅ 加载审批状态，传递参数确保使用正确的值
                    this.load_approval_status(storeId, taskId);
                } else {
                    // 处理无数据或错误情况
                    this.data = [];
                    this.months = [];
                    this.init_table();
                    this.update_stats();
                    // ✅ 即使没有数据也要加载审批状态
                    this.load_approval_status(storeId, taskId);
                    if (r.message && r.message.error) {
                        frappe.msgprint(r.message.error);
                    }
                }
                // ✅ 清除加载标志
                this.is_loading = false;
            },
            error: (err) => {
                console.error('数据加载失败:', err);
                frappe.msgprint('数据加载失败，请稍后重试');
                // 即使失败也要更新界面
                this.data = [];
                this.months = [];
                this.init_table();
                this.update_stats();
                // ✅ 即使失败也要加载审批状态
                this.load_approval_status(storeId, taskId);
                // ✅ 清除加载标志
                this.is_loading = false;
            }
        });
    }

    init_table() {
        const container = document.getElementById('datatable-container');
        if (!container) return;

        // 只使用多月视图
        this.init_multi_month_table(container);
    }

    init_multi_month_table(container) {
        const self = this;

        // 如果Handsontable还未加载，等待加载
        if (!window.Handsontable) {
            setTimeout(() => this.init_multi_month_table(container), 200);
            return;
        }

        // 清空容器并创建 Handsontable 容器
        container.innerHTML = '';

        // 准备表头（移除 # 列，使用 rowHeaders 代替）
        const headers = ['商品名称', '编码', '规格', '品牌', '类别'];
        const colHeaders = [...headers, ...this.months];

        // 准备列配置（移除 index 列）
        const hotColumns = [
            {
                data: 'name1',
                readOnly: true,
                width: 250,
                className: 'htLeft htMiddle',
                renderer: function(_instance, td, _row, _col, _prop, value, _cellProperties) {
                    // 自定义渲染器：不换行，文本溢出显示省略号
                    td.style.whiteSpace = 'nowrap';
                    td.style.overflow = 'hidden';
                    td.style.textOverflow = 'ellipsis';
                    td.textContent = value || '';
                    return td;
                }
            },
            { data: 'code', readOnly: true, width: 120 },
            { data: 'specifications', readOnly: true, width: 100 },
            { data: 'brand', readOnly: true, width: 100 },
            { data: 'category', readOnly: true, width: 100 }
        ];

        // 动态添加月份列
        this.months.forEach(month => {
            hotColumns.push({
                data: `month_${month}`,
                type: 'numeric',
                numericFormat: {
                    pattern: '0'
                },
                width: 120
            });
        });

        // 准备数据（移除 index 字段）
        const hotData = this.data.map((item) => {
            const row = {
                name1: item.name1,
                code: item.code,
                specifications: item.specifications,
                brand: item.brand,
                category: item.category
            };

            // 添加月份数据
            this.months.forEach(month => {
                row[`month_${month}`] = (item.months && item.months[month]) ? item.months[month].quantity || 0 : 0;
            });

            return row;
        });

        // 分页配置
        this.pageSize = 20;
        this.currentPage = 1;
        this.hotData = hotData;

        // 获取当前页数据
        const getPageData = (page) => {
            const start = (page - 1) * this.pageSize;
            const end = start + this.pageSize;
            return this.hotData.slice(start, end);
        };

        // 使用固定表格高度，参照 data_view.js 的设置
        const currentPageData = getPageData(this.currentPage);
        const tableHeight = 500; // 固定高度 600px，避免动态高度导致的布局问题

        // 创建 Handsontable 实例（参照 data_view.js 的配置）
        this.hot = new Handsontable(container, {
            data: currentPageData,
            colHeaders: colHeaders,
            columns: hotColumns,
            rowHeaders: true,  // 使用内置行号
            width: '100%',
            height: tableHeight,  // 固定高度 600px
            licenseKey: 'non-commercial-and-evaluation',
            stretchH: 'all',
            autoWrapRow: false,  // 禁用自动换行
            autoWrapCol: false,
            manualRowResize: true,
            manualColumnResize: true,
            manualRowMove: false,
            manualColumnMove: false,

            // 新增配置项（参照 data_view.js）
            fixedColumnsLeft: 2,           // 固定左侧2列（商品名称和编码），横向滚动时保持可见
            renderAllRows: false,          // 优化渲染性能，只渲染可见行
            selectionMode: 'multiple',     // 支持多选模式
            language: 'zh-CN',             // 中文语言设置
            wordWrap: false,               // 禁用自动换行，保持表格整洁

            // 右键菜单配置
            contextMenu: {
                items: {
                    'row_above': {},
                    'row_below': {},
                    'separator1': '---------',
                    'remove_row': {},
                    'separator2': '---------',
                    'undo': {},
                    'redo': {},
                    'separator3': '---------',
                    'make_read_only': {},
                    'alignment': {},
                    'separator4': '---------',
                    'copy': {},
                    'cut': {}
                }
            },

            // 启用筛选器
            filters: true,

            // 下拉菜单配置（包含列隐藏功能）
            dropdownMenu: ['filter_by_condition', 'filter_by_value', 'filter_action_bar', '---------', 'hidden_columns_hide', 'hidden_columns_show', '---------', 'alignment'],

            // 启用列排序
            columnSorting: true,
            sortIndicator: true,

            // 启用隐藏列功能
            hiddenColumns: {
                indicators: true,
                columns: [],
                copyPasteEnabled: true
            },

            // 启用复制粘贴
            copyPaste: true,

            afterChange: (changes, source) => {
                if (source === 'loadData' || !changes) {
                    return;
                }

                changes.forEach(([row, prop, oldValue, newValue]) => {
                    if (oldValue === newValue) return;

                    const monthMatch = prop.match(/^month_(.+)$/);
                    if (monthMatch) {
                        const month = monthMatch[1];
                        const actualRow = (self.currentPage - 1) * self.pageSize + row;
                        const rowData = self.hotData[actualRow];
                        const code = rowData.code;
                        const quantity = parseInt(newValue) || 0;

                        const currentStoreId = self.filter_group.get_value('store_id');
                        const currentTaskId = self.filter_group.get_value('task_id');

                        if (!currentStoreId || !currentTaskId) {
                            frappe.show_alert({
                                message: '请先选择店铺和计划任务',
                                indicator: 'red'
                            }, 3);
                            return;
                        }

                        // 保存到后端
                        self.save_month_quantity(currentStoreId, currentTaskId, code, month, quantity);
                    }
                });
            }
        });

        console.log('✅ Handsontable 表格初始化完成');

        // 初始化列设置器
        this.init_column_checkboxes();

        // 渲染分页控件
        this.renderPagination();
    }


    renderPagination() {
        const totalPages = Math.ceil(this.hotData.length / this.pageSize) || 1;

        // 更新分页信息
        this.wrapper.find('#total-records').text(this.hotData.length || 0);
        this.wrapper.find('#current-page').text(this.currentPage);
        this.wrapper.find('#total-pages').text(totalPages);

        // 更新分页按钮状态
        this.wrapper.find('.btn-first-page').prop('disabled', this.currentPage === 1);
        this.wrapper.find('.btn-prev-page').prop('disabled', this.currentPage === 1);
        this.wrapper.find('.btn-next-page').prop('disabled', this.currentPage >= totalPages);
        this.wrapper.find('.btn-last-page').prop('disabled', this.currentPage >= totalPages);

        // 更新页面大小选择器
        this.wrapper.find('#page-size-selector').val(this.pageSize);
    }

    goto_page(page) {
        const totalPages = Math.ceil(this.hotData.length / this.pageSize) || 1;
        if (page < 1) page = 1;
        else if (page > totalPages) page = totalPages;
        if (page === this.currentPage) return;
        this.currentPage = page;
        this.updateTableData();
    }

    updateTableData() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageData = this.hotData.slice(start, end);

        if (this.hot) {
            // 只更新数据，不调整高度（保持固定高度 600px）
            this.hot.loadData(pageData);
            this.renderPagination();
        }
    }

    handle_batch_delete() {
        const codes = Array.from(this.checked_rows);
        if (!codes.length) return;

        const storeId = this.filter_group.get_value('store_id');
        const taskId = this.filter_group.get_value('task_id');

        frappe.confirm(`确定删除选中的 ${codes.length} 个商品的所有计划记录?`, () => {
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
                    if (r.message?.status === 'success') {
                        frappe.show_alert({
                            message: `成功删除 ${r.message.count} 条记录`,
                            indicator: 'green'
                        }, 3);
                        this.fetch_data();
                    } else {
                        frappe.msgprint(r.message?.msg || "删除失败");
                    }
                },
                error: (err) => {
                    frappe.msgprint("删除失败");
                    console.error("删除失败:", err);
                }
            });
        });
    }

    update_batch_btn() {
        const count = this.checked_rows.size;
        const $inlineBtn = this.wrapper.find('.btn-batch-delete-inline');

        if (count > 0) {
            // 显示内联按钮
            $inlineBtn.show().html(`<span class="fa fa-trash"></span> 批量删除 (${count})`);
        } else {
            // 隐藏按钮
            $inlineBtn.hide();
        }
    }

    update_stats() {
        // 计算所有月份的总计划量
        let total = 0;
        let filledCount = 0;

        this.data.forEach(item => {
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

        $('#stat-total').text(total);
        $('#stat-count').text(`${filledCount} / ${this.data.length}`);
    }

    open_product_dialog() {
        const storeId = this.filter_group.get_value('store_id');
        const taskId = this.filter_group.get_value('task_id');

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
                            this.fetch_data();
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
    }

    save_month_quantity(storeId, taskId, code, month, quantity) {
        const self = this;
        frappe.call({
            method: "product_sales_planning.planning_system.page.store_detail.store_detail.update_month_quantity",
            args: {
                store_id: storeId,
                task_id: taskId,
                code: code,
                month: month,
                quantity: quantity
            },
            callback: (r) => {
                if (r.message && r.message.status === "success") {
                    frappe.show_alert({message: '保存成功', indicator: 'green'}, 1);
                    // 更新统计卡片
                    self.update_stats();
                } else {
                    frappe.show_alert({message: '保存失败', indicator: 'red'}, 3);
                }
            },
            error: (err) => {
                frappe.show_alert({message: '保存失败', indicator: 'red'}, 3);
                console.error("保存失败:", err);
            }
        });
    }

    batch_save_quantities(storeId, taskId, updates) {
        const self = this;
        frappe.call({
            method: "product_sales_planning.planning_system.page.store_detail.store_detail.batch_update_month_quantities",
            args: {
                store_id: storeId,
                task_id: taskId,
                updates: updates
            },
            freeze: true,
            freeze_message: "批量保存中...",
            callback: (r) => {
                if (r.message && r.message.status === "success") {
                    frappe.show_alert({
                        message: `成功保存 ${r.message.count} 条记录`,
                        indicator: 'green'
                    }, 3);
                    // 更新统计卡片
                    self.update_stats();
                } else {
                    frappe.show_alert({
                        message: r.message?.msg || '批量保存失败',
                        indicator: 'red'
                    }, 3);
                }
            },
            error: (err) => {
                frappe.show_alert({message: '批量保存失败', indicator: 'red'}, 3);
                console.error("批量保存失败:", err);
            }
        });
    }

    open_import_dialog() {
        const storeId = this.filter_group.get_value('store_id');
        const taskId = this.filter_group.get_value('task_id');

        if (!storeId || storeId === 'undefined' || storeId === 'null') {
            frappe.msgprint('请先选择店铺');
            return;
        }

        if (!taskId || taskId === 'undefined' || taskId === 'null') {
            frappe.msgprint('请先选择计划任务');
            return;
        }

        // 创建文件上传对话框
        const dialog = new frappe.ui.Dialog({
            title: 'Excel导入',
            fields: [
                {
                    fieldtype: 'HTML',
                    fieldname: 'help_text',
                    options: `
                        <div class="alert alert-info">
                            <strong>Excel格式要求：</strong><br>
                            • 第一行：表头（产品编码 | 产品名称 | 2025-01 | 2025-02 | ...）<br>
                            • 数据行：产品编码 | 产品名称 | 数量1 | 数量2 | ...<br>
                            • 月份格式支持：2025-01、202501、2025/01<br>
                            • 空值或0将被跳过<br><br>
                            <button class="btn btn-sm btn-default" onclick="window.download_template()">
                                <i class="fa fa-download"></i> 下载导入模板
                            </button>
                        </div>
                    `
                },
                {
                    fieldtype: 'Attach',
                    fieldname: 'excel_file',
                    label: '选择Excel文件',
                    reqd: 1
                }
            ],
            primary_action_label: '开始导入',
            primary_action: (values) => {
                if (!values.excel_file) {
                    frappe.msgprint('请选择Excel文件');
                    return;
                }

                dialog.hide();

                frappe.call({
                    method: "product_sales_planning.planning_system.page.store_detail.store_detail.import_commodity_data",
                    args: {
                        store_id: storeId,
                        task_id: taskId,
                        file_url: values.excel_file
                    },
                    freeze: true,
                    freeze_message: "正在导入数据...",
                    callback: (r) => {
                        if (r.message && r.message.status === "success") {
                            let msg = r.message.msg;
                            if (r.message.errors && r.message.errors.length > 0) {
                                msg += `<br><br><strong>部分错误：</strong><br>${r.message.errors.join('<br>')}`;
                            }
                            frappe.msgprint({
                                title: '导入完成',
                                message: msg,
                                indicator: 'green'
                            });
                            this.fetch_data();
                        } else {
                            frappe.msgprint({
                                title: '导入失败',
                                message: r.message?.msg || "导入失败",
                                indicator: 'red'
                            });
                        }
                    },
                    error: (err) => {
                        frappe.msgprint("导入失败");
                        console.error("导入失败:", err);
                    }
                });
            }
        });

        dialog.show();
    }

    open_mechanism_import_dialog() {
        const storeId = this.filter_group.get_value('store_id');
        const taskId = this.filter_group.get_value('task_id');

        if (!storeId || storeId === 'undefined' || storeId === 'null') {
            frappe.msgprint('请先选择店铺');
            return;
        }

        if (!taskId || taskId === 'undefined' || taskId === 'null') {
            frappe.msgprint('请先选择计划任务');
            return;
        }

        // 创建机制导入对话框
        const dialog = new frappe.ui.Dialog({
            title: '机制Excel导入',
            fields: [
                {
                    fieldtype: 'HTML',
                    fieldname: 'help_text',
                    options: `
                        <div class="alert alert-success">
                            <strong>机制导入说明：</strong><br>
                            • 机制是预定义的产品组合（如促销套装）<br>
                            • 导入机制数量后，系统会自动拆分到各个单品<br>
                            • 例如：机制A包含产品X(2个)和产品Y(3个)<br>
                            &nbsp;&nbsp;导入10个机制A，系统会自动创建：<br>
                            &nbsp;&nbsp;- 产品X: 10 × 2 = 20个<br>
                            &nbsp;&nbsp;- 产品Y: 10 × 3 = 30个<br><br>
                            <button class="btn btn-sm btn-default" onclick="window.download_mechanism_template()">
                                <i class="fa fa-download"></i> 下载机制导入模板
                            </button>
                        </div>
                    `
                },
                {
                    fieldtype: 'Attach',
                    fieldname: 'excel_file',
                    label: '选择Excel文件',
                    reqd: 1
                }
            ],
            primary_action_label: '开始导入',
            primary_action: (values) => {
                if (!values.excel_file) {
                    frappe.msgprint('请选择Excel文件');
                    return;
                }

                dialog.hide();

                frappe.call({
                    method: "product_sales_planning.planning_system.page.store_detail.store_detail.import_mechanism_excel",
                    args: {
                        store_id: storeId,
                        task_id: taskId,
                        file_url: values.excel_file
                    },
                    freeze: true,
                    freeze_message: "正在导入机制数据...",
                    callback: (r) => {
                        if (r.message && r.message.status === "success") {
                            let msg = r.message.msg;
                            if (r.message.errors && r.message.errors.length > 0) {
                                msg += `<br><br><strong>部分错误：</strong><br>${r.message.errors.join('<br>')}`;
                            }
                            frappe.msgprint({
                                title: '导入完成',
                                message: msg,
                                indicator: 'green'
                            });
                            this.fetch_data();
                        } else {
                            frappe.msgprint({
                                title: '导入失败',
                                message: r.message?.msg || "导入失败",
                                indicator: 'red'
                            });
                        }
                    },
                    error: (err) => {
                        frappe.msgprint("导入失败");
                        console.error("导入失败:", err);
                    }
                });
            }
        });

        dialog.show();
    }

    open_apply_mechanism_dialog() {
        const storeId = this.filter_group.get_value('store_id');
        const taskId = this.filter_group.get_value('task_id');

        if (!storeId || storeId === 'undefined' || storeId === 'null') {
            frappe.msgprint('请先选择店铺');
            return;
        }

        // 创建机制选择对话框
        new frappe.ui.form.MultiSelectDialog({
            doctype: "Product Mechanism",
            target: {},
            setters: {
                mechanism_name: null,
                category: null,
                is_active: 1
            },
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
                        if (r.message?.status === "success") {
                            frappe.show_alert({
                                message: r.message.msg,
                                indicator: 'green'
                            }, 3);
                            this.fetch_data();
                        } else {
                            frappe.msgprint(r.message?.msg || "应用失败");
                        }
                    },
                    error: (err) => {
                        frappe.msgprint("应用失败");
                        console.error("应用失败:", err);
                    }
                });
            }
        });
    }

    export_to_excel() {
        const storeId = this.filter_group.get_value('store_id');
        const taskId = this.filter_group.get_value('task_id');

        frappe.call({
            method: "product_sales_planning.planning_system.page.store_detail.store_detail.export_commodity_data",
            args: {
                store_id: storeId,
                task_id: taskId
            },
            freeze: true,
            freeze_message: "正在导出数据...",
            callback: (r) => {
                if (r.message && r.message.status === "success") {
                    window.open(r.message.file_url, '_blank');
                    frappe.show_alert({
                        message: `成功导出 ${r.message.record_count} 条记录`,
                        indicator: 'green'
                    }, 3);
                } else {
                    frappe.msgprint({
                        title: '导出失败',
                        message: r.message?.message || "导出失败",
                        indicator: 'red'
                    });
                }
            },
            error: (err) => {
                frappe.msgprint("导出失败");
                console.error("导出失败:", err);
            }
        });
    }
}

// 全局函数：下载单品导入模板
window.download_template = function() {
    frappe.call({
        method: "product_sales_planning.planning_system.page.store_detail.store_detail.download_import_template",
        freeze: true,
        freeze_message: "正在生成模板...",
        callback: (r) => {
            if (r.message && r.message.status === "success") {
                window.open(r.message.file_url, '_blank');
                frappe.show_alert({
                    message: '模板已生成，正在下载...',
                    indicator: 'green'
                }, 3);
            } else {
                frappe.msgprint({
                    title: '生成失败',
                    message: r.message?.msg || "模板生成失败",
                    indicator: 'red'
                });
            }
        },
        error: (err) => {
            frappe.msgprint("模板生成失败");
            console.error("模板生成失败:", err);
        }
    });
};

// 全局函数：下载机制导入模板
window.download_mechanism_template = function() {
    frappe.call({
        method: "product_sales_planning.planning_system.page.store_detail.store_detail.download_mechanism_template",
        freeze: true,
        freeze_message: "正在生成机制模板...",
        callback: (r) => {
            if (r.message && r.message.status === "success") {
                window.open(r.message.file_url, '_blank');
                frappe.show_alert({
                    message: '机制模板已生成，正在下载...',
                    indicator: 'green'
                }, 3);
            } else {
                frappe.msgprint({
                    title: '生成失败',
                    message: r.message?.msg || "模板生成失败",
                    indicator: 'red'
                });
            }
        },
        error: (err) => {
            frappe.msgprint("模板生成失败");
            console.error("模板生成失败:", err);
        }
    });
};

// ========== 审批流程相关方法（添加到StorePlanningManager类的原型） ==========

StorePlanningManager.prototype.load_approval_status = function(storeId, taskId) {
    // ✅ 优先使用传入的参数，如果没有则从 filter_group 获取
    if (!storeId) {
        storeId = this.filter_group.get_value('store_id');
    }
    if (!taskId) {
        taskId = this.filter_group.get_value('task_id');
    }

    console.log('🔍 load_approval_status called with:', { storeId, taskId });

    if (!storeId || !taskId || storeId === 'undefined' || taskId === 'undefined') {
        // 没有选择店铺和任务，隐藏审批相关UI，显示操作按钮
        console.log('⚠️ 没有店铺/任务，显示操作按钮');
        this.wrapper.find('.approval-status-area').hide();
        this.wrapper.find('.btn-submit-approval').hide();
        this.wrapper.find('.btn-withdraw-approval').hide();
        this.wrapper.find('.btn-approve').hide();
        this.wrapper.find('.btn-reject-previous').hide();
        this.wrapper.find('.btn-reject-submitter').hide();
        this.wrapper.find('.btn-view-history').hide();

        // 没有选择店铺和任务时，显示操作按钮（允许自由操作）
        this.wrapper.find('.btn-add-product').show();
        this.wrapper.find('.btn-import-excel').show();
        this.wrapper.find('.btn-import-mechanism').show();
        this.wrapper.find('.btn-apply-mechanism').show();
        return;
    }

    const self = this;
    frappe.call({
        method: "product_sales_planning.planning_system.page.store_detail.store_detail.get_approval_status",
        args: {
            task_id: taskId,
            store_id: storeId
        },
        callback: (r) => {
            if (r.message && r.message.status === "success") {
                console.log('✅ 审批状态加载成功:', r.message);
                self.approval_data = r.message;
                self.update_approval_ui();
            } else {
                // API 返回失败，按无审批流程处理（显示操作按钮）
                console.warn('⚠️ 审批状态返回失败，按无审批流程处理');
                self.approval_data = null;
                self.update_approval_ui();
            }
        },
        error: (err) => {
            console.error('❌ 加载审批状态失败:', err);
            // 加载失败，按无审批流程处理（显示操作按钮）
            self.approval_data = null;
            self.update_approval_ui();
        }
    });
};

StorePlanningManager.prototype.update_approval_ui = function() {
    const data = this.approval_data;

    console.log('🔍 update_approval_ui called with data:', data);
    console.log('🔍 Full approval_data structure:', JSON.stringify(data, null, 2));

    // ✅ 修复：正确访问嵌套的 data.data.workflow
    const workflowData = data && data.data ? data.data.workflow : null;

    console.log('🔍 workflowData:', workflowData);
    console.log('🔍 has_workflow:', workflowData ? workflowData.has_workflow : 'workflowData is null');

    if (!workflowData || workflowData.has_workflow === false) {
        // 没有审批流程，隐藏所有审批UI
        console.log('⚠️ 没有审批流程，显示所有操作按钮');
        this.wrapper.find('.approval-status-area').hide();
        this.wrapper.find('.btn-submit-approval').hide();
        this.wrapper.find('.btn-withdraw-approval').hide();
        this.wrapper.find('.btn-approve').hide();
        this.wrapper.find('.btn-reject-previous').hide();
        this.wrapper.find('.btn-reject-submitter').hide();
        this.wrapper.find('.btn-view-history').hide();

        // 没有审批流程时，显示所有操作按钮（允许自由编辑）
        this.wrapper.find('.btn-add-product').show();
        this.wrapper.find('.btn-import-excel').show();
        this.wrapper.find('.btn-import-mechanism').show();
        this.wrapper.find('.btn-apply-mechanism').show();
        return;
    }

    console.log('✅ 有审批流程，继续处理按钮显示逻辑');
    const currentState = workflowData.current_state;
    const canEdit = data.data.can_edit;
    const canApprove = data.data.can_approve;

    console.log('📊 Current State:', {
        status: currentState.status,
        approval_status: currentState.approval_status,
        current_step: currentState.current_step,
        can_edit: canEdit,
        can_approve: canApprove
    });
    console.log('📊 Detailed state check:', {
        'status === "未开始"': currentState.status === '未开始',
        'current_step === 0': currentState.current_step === 0,
        'approval_status === "已驳回"': currentState.approval_status === '已驳回',
        'approval_status value': currentState.approval_status,
        'approval_status type': typeof currentState.approval_status,
        'canEdit': canEdit
    });

    // 显示审批状态区域
    this.wrapper.find('.approval-status-area').show();

    // 更新审批状态文本
    const statusText = currentState.approval_status || '待审批';
    const stepText = currentState.current_step > 0
        ? `(第${currentState.current_step}级审批)`
        : '';

    this.wrapper.find('#approval-status-text').text(statusText);
    this.wrapper.find('#approval-step-text').text(stepText);

    // 设置alert样式
    const alertDiv = this.wrapper.find('#approval-alert');
    alertDiv.removeClass('alert-info alert-warning alert-success alert-danger');

    if (statusText === '已通过') {
        alertDiv.addClass('alert-success');
    } else if (statusText === '已驳回') {
        alertDiv.addClass('alert-danger');
        // 显示退回原因
        if (currentState.rejection_reason) {
            this.wrapper.find('#rejection-reason-area').show();
            this.wrapper.find('#rejection-reason-text').text(currentState.rejection_reason);
        } else {
            this.wrapper.find('#rejection-reason-area').hide();
        }
    } else if (statusText === '待审批') {
        alertDiv.addClass('alert-warning');
        this.wrapper.find('#rejection-reason-area').hide();
    } else {
        alertDiv.addClass('alert-info');
        this.wrapper.find('#rejection-reason-area').hide();
    }

    // 控制按钮显示
    // 提交审批按钮：首次提交或退回后重新提交

    // 调试日志：查看当前状态
    console.log('🔍 审批状态调试:', {
        status: currentState.status,
        approval_status: currentState.approval_status,
        current_step: currentState.current_step,
        can_edit: canEdit,
        approval_status_type: typeof currentState.approval_status
    });

    if (currentState.approval_status === '已驳回' && canEdit) {
        // 被退回后，无论退回到哪一级，都允许重新提交
        console.log('✅ 匹配条件1：已驳回状态');
        this.wrapper.find('.btn-submit-approval').show();
        this.wrapper.find('.btn-withdraw-approval').hide();
    } else if (currentState.status === '未开始' && currentState.current_step === 0) {
        // 首次提交（包括 approval_status 为 null/undefined 的情况）
        console.log('✅ 匹配条件2：未开始状态');
        this.wrapper.find('.btn-submit-approval').show();
        this.wrapper.find('.btn-withdraw-approval').hide();
    } else {
        console.log('❌ 不匹配任何条件，隐藏按钮');
        this.wrapper.find('.btn-submit-approval').hide();
    }

    // 撤回按钮：只有在审批中（未完成）且是提交人时显示
    if (currentState.status === '已提交' &&
        currentState.approval_status === '待审批' &&
        currentState.current_step > 0) {
        // 审批中，显示撤回按钮
        this.wrapper.find('.btn-withdraw-approval').show();
    } else {
        this.wrapper.find('.btn-withdraw-approval').hide();
    }

    // 审批按钮：只有审批人在待审批状态时显示
    if (canApprove && currentState.approval_status === '待审批') {
        this.wrapper.find('.btn-approve').show();
        this.wrapper.find('.btn-reject-previous').show();
        this.wrapper.find('.btn-reject-submitter').show();
    } else {
        this.wrapper.find('.btn-approve').hide();
        this.wrapper.find('.btn-reject-previous').hide();
        this.wrapper.find('.btn-reject-submitter').hide();
    }

    // 审批历史按钮：有审批历史时显示
    if (data.data.history && data.data.history.length > 0) {
        this.wrapper.find('.btn-view-history').show();
    } else {
        this.wrapper.find('.btn-view-history').hide();
    }

    // 控制表格编辑权限（Handsontable）
    if (this.hot) {
        // 只有在未提交或被退回状态时才允许编辑
        const editable = (currentState.status === '未开始' && currentState.current_step === 0) ||
                        (currentState.approval_status === '已驳回' && canEdit);

        console.log('🔒 表格编辑权限:', { editable, status: currentState.status, approval_status: currentState.approval_status });

        // 更新所有月份列的 readOnly 属性
        const columns = this.hot.getSettings().columns;
        this.months.forEach((_month, index) => {
            const colIndex = 5 + index; // 前5列是固定列（商品名称、编码、规格、品牌、类别）
            if (columns[colIndex]) {
                columns[colIndex].readOnly = !editable;
            }
        });

        this.hot.updateSettings({ columns: columns });
        this.hot.render();
    }

    // 控制产品操作按钮显示
    // 只有在未提交审批或被退回状态时才显示这些按钮
    const showOperationButtons = (currentState.status === '未开始' && currentState.current_step === 0) ||
                                  (currentState.approval_status === '已驳回' && canEdit);

    console.log('🔘 Button visibility logic:', {
        showOperationButtons: showOperationButtons,
        condition1: currentState.status === '未开始' && currentState.current_step === 0,
        condition2: currentState.approval_status === '已驳回' && canEdit,
        currentState_status: currentState.status,
        currentState_approval_status: currentState.approval_status,
        currentState_current_step: currentState.current_step,
        canEdit: canEdit
    });

    if (showOperationButtons) {
        // 未提交或被退回状态：显示所有操作按钮
        console.log('✅ 显示所有操作按钮（未提交或被退回状态）');
        this.wrapper.find('.btn-add-product').show();
        this.wrapper.find('.btn-import-excel').show();
        this.wrapper.find('.btn-import-mechanism').show();
        this.wrapper.find('.btn-apply-mechanism').show();
        // 批量删除按钮根据选中状态控制，不在这里处理
    } else {
        // 审批中或已通过：隐藏所有操作按钮
        console.log('❌ 隐藏所有操作按钮（审批中或已通过）');
        this.wrapper.find('.btn-add-product').hide();
        this.wrapper.find('.btn-import-excel').hide();
        this.wrapper.find('.btn-import-mechanism').hide();
        this.wrapper.find('.btn-apply-mechanism').hide();
        this.wrapper.find('.btn-batch-delete-inline').hide();
    }
};

StorePlanningManager.prototype.submit_for_approval = function() {
    const storeId = this.filter_group.get_value('store_id');
    const taskId = this.filter_group.get_value('task_id');

    if (!storeId || !taskId) {
        frappe.msgprint('请先选择店铺和计划任务');
        return;
    }

    frappe.prompt([
        {
            fieldname: 'comment',
            label: '提交说明',
            fieldtype: 'Small Text',
            reqd: 0
        }
    ], (values) => {
        const self = this;
        frappe.call({
            method: "product_sales_planning.planning_system.doctype.approval_workflow.approval_api.submit_for_approval",
            args: {
                task_id: taskId,
                store_id: storeId,
                comment: values.comment
            },
            freeze: true,
            freeze_message: "正在提交审批...",
            callback: (r) => {
                if (r.message && r.message.status === "success") {
                    frappe.show_alert({
                        message: '提交审批成功',
                        indicator: 'green'
                    }, 3);
                    const currentStoreId = self.filter_group.get_value('store_id');
                    const currentTaskId = self.filter_group.get_value('task_id');
                    self.load_approval_status(currentStoreId, currentTaskId);
                    self.fetch_data({ storeId: currentStoreId, taskId: currentTaskId });
                } else {
                    frappe.msgprint({
                        title: '提交失败',
                        message: r.message?.message || "提交审批失败",
                        indicator: 'red'
                    });
                }
            },
            error: (err) => {
                frappe.msgprint("提交审批失败");
                console.error("提交审批失败:", err);
            }
        });
    }, '提交审批', '提交');
};

StorePlanningManager.prototype.withdraw_approval = function() {
    const storeId = this.filter_group.get_value('store_id');
    const taskId = this.filter_group.get_value('task_id');

    if (!storeId || !taskId) {
        frappe.msgprint('请先选择店铺和计划任务');
        return;
    }

    frappe.confirm(
        '确定要撤回审批吗？撤回后状态将变为未提交，可以重新编辑和提交。',
        () => {
            const self = this;
            frappe.call({
                method: "product_sales_planning.planning_system.doctype.approval_workflow.approval_api.withdraw_approval",
                args: {
                    task_id: taskId,
                    store_id: storeId,
                    comment: "撤回审批"
                },
                freeze: true,
                freeze_message: "正在撤回审批...",
                callback: (r) => {
                    if (r.message && r.message.status === "success") {
                        frappe.show_alert({
                            message: '撤回成功',
                            indicator: 'green'
                        }, 3);
                        const currentStoreId = self.filter_group.get_value('store_id');
                        const currentTaskId = self.filter_group.get_value('task_id');
                        self.load_approval_status(currentStoreId, currentTaskId);
                        self.fetch_data({ storeId: currentStoreId, taskId: currentTaskId });
                    } else {
                        frappe.msgprint({
                            title: '撤回失败',
                            message: r.message?.message || "撤回审批失败",
                            indicator: 'red'
                        });
                    }
                },
                error: (err) => {
                    frappe.msgprint("撤回审批失败");
                    console.error("撤回审批失败:", err);
                }
            });
        }
    );
};

StorePlanningManager.prototype.approve_task = function() {
    const storeId = this.filter_group.get_value('store_id');
    const taskId = this.filter_group.get_value('task_id');

    if (!storeId || !taskId) {
        frappe.msgprint('请先选择店铺和计划任务');
        return;
    }

    frappe.prompt([
        {
            fieldname: 'comments',
            label: '审批意见',
            fieldtype: 'Small Text',
            reqd: 0
        }
    ], (values) => {
        const self = this;
        frappe.call({
            method: "product_sales_planning.planning_system.doctype.approval_workflow.approval_api.approve_task_store",
            args: {
                task_id: taskId,
                store_id: storeId,
                action: 'approve',
                comments: values.comments
            },
            freeze: true,
            freeze_message: "正在审批...",
            callback: (r) => {
                if (r.message && r.message.status === "success") {
                    frappe.show_alert({
                        message: r.message.message || '审批通过',
                        indicator: 'green'
                    }, 3);
                    const currentStoreId = self.filter_group.get_value('store_id');
                    const currentTaskId = self.filter_group.get_value('task_id');
                    self.load_approval_status(currentStoreId, currentTaskId);
                    self.fetch_data({ storeId: currentStoreId, taskId: currentTaskId });
                } else {
                    frappe.msgprint({
                        title: '审批失败',
                        message: r.message?.message || "审批操作失败",
                        indicator: 'red'
                    });
                }
            },
            error: (err) => {
                frappe.msgprint("审批操作失败");
                console.error("审批操作失败:", err);
            }
        });
    }, '审批通过', '通过');
};

StorePlanningManager.prototype.reject_to_previous = function() {
    const storeId = this.filter_group.get_value('store_id');
    const taskId = this.filter_group.get_value('task_id');

    if (!storeId || !taskId) {
        frappe.msgprint('请先选择店铺和计划任务');
        return;
    }

    frappe.prompt([
        {
            fieldname: 'comments',
            label: '退回原因',
            fieldtype: 'Small Text',
            reqd: 1
        }
    ], (values) => {
        const self = this;
        frappe.call({
            method: "product_sales_planning.planning_system.doctype.approval_workflow.approval_api.approve_task_store",
            args: {
                task_id: taskId,
                store_id: storeId,
                action: 'reject_to_previous',
                comments: values.comments
            },
            freeze: true,
            freeze_message: "正在退回...",
            callback: (r) => {
                if (r.message && r.message.status === "success") {
                    frappe.show_alert({
                        message: r.message.message || '已退回上一级',
                        indicator: 'orange'
                    }, 3);
                    const currentStoreId = self.filter_group.get_value('store_id');
                    const currentTaskId = self.filter_group.get_value('task_id');
                    self.load_approval_status(currentStoreId, currentTaskId);
                    self.fetch_data({ storeId: currentStoreId, taskId: currentTaskId });
                } else {
                    frappe.msgprint({
                        title: '退回失败',
                        message: r.message?.message || "退回操作失败",
                        indicator: 'red'
                    });
                }
            },
            error: (err) => {
                frappe.msgprint("退回操作失败");
                console.error("退回操作失败:", err);
            }
        });
    }, '退回上一级', '退回');
};

StorePlanningManager.prototype.reject_to_submitter = function() {
    const storeId = this.filter_group.get_value('store_id');
    const taskId = this.filter_group.get_value('task_id');

    if (!storeId || !taskId) {
        frappe.msgprint('请先选择店铺和计划任务');
        return;
    }

    frappe.prompt([
        {
            fieldname: 'comments',
            label: '退回原因',
            fieldtype: 'Small Text',
            reqd: 1
        }
    ], (values) => {
        const self = this;
        frappe.call({
            method: "product_sales_planning.planning_system.doctype.approval_workflow.approval_api.approve_task_store",
            args: {
                task_id: taskId,
                store_id: storeId,
                action: 'reject_to_submitter',
                comments: values.comments
            },
            freeze: true,
            freeze_message: "正在退回...",
            callback: (r) => {
                if (r.message && r.message.status === "success") {
                    frappe.show_alert({
                        message: r.message.message || '已退回提交人',
                        indicator: 'orange'
                    }, 3);
                    const currentStoreId = self.filter_group.get_value('store_id');
                    const currentTaskId = self.filter_group.get_value('task_id');
                    self.load_approval_status(currentStoreId, currentTaskId);
                    self.fetch_data({ storeId: currentStoreId, taskId: currentTaskId });
                } else {
                    frappe.msgprint({
                        title: '退回失败',
                        message: r.message?.message || "退回操作失败",
                        indicator: 'red'
                    });
                }
            },
            error: (err) => {
                frappe.msgprint("退回操作失败");
                console.error("退回操作失败:", err);
            }
        });
    }, '退回提交人', '退回');
};

StorePlanningManager.prototype.view_approval_history = function() {
    const data = this.approval_data;

    // ✅ 修复：正确访问嵌套的 data.data.history
    const history = data && data.data ? data.data.history : null;

    if (!history || history.length === 0) {
        frappe.msgprint('暂无审批历史');
        return;
    }

    // 构建审批历史HTML
    let historyHTML = '<div class="approval-history-timeline">';

    history.forEach((item) => {
        const actionClass = item.action === '通过' ? 'text-success' :
                           item.action === '提交' ? 'text-primary' : 'text-danger';

        historyHTML += `
            <div class="timeline-item" style="margin-bottom: 15px; padding-left: 20px; border-left: 2px solid #ddd;">
                <div style="margin-bottom: 5px;">
                    <strong class="${actionClass}">${item.action}</strong>
                    ${item.approval_step > 0 ? `<span class="text-muted">(第${item.approval_step}级)</span>` : ''}
                </div>
                <div style="font-size: 12px; color: #666;">
                    <span>${item.approver || '系统'}</span>
                    <span style="margin-left: 10px;">${item.action_time ? (function() {
                        try {
                            return frappe.datetime.str_to_user(item.action_time);
                        } catch (e) {
                            return item.action_time;
                        }
                    })() : ''}</span>
                </div>
                ${item.comments ? `<div style="margin-top: 5px; font-size: 13px;">${item.comments}</div>` : ''}
            </div>
        `;
    });

    historyHTML += '</div>';

    // 显示对话框
    frappe.msgprint({
        title: '审批历史',
        message: historyHTML,
        indicator: 'blue',
        primary_action: {
            label: '关闭',
            action: function() {
                // 关闭对话框
            }
        }
    });
};

// 列设置器方法
StorePlanningManager.prototype.init_column_checkboxes = function() {
    if (!this.hot) return;
    const $checkboxArea = this.wrapper.find('#column-checkboxes');
    const hiddenColumnsPlugin = this.hot.getPlugin('hiddenColumns');
    const allColumns = this.hot.countCols();
    const hiddenColumns = hiddenColumnsPlugin.hiddenColumns || [];

    let html = `
        <div style="margin-bottom: 10px;">
            <label style="cursor: pointer; user-select: none; font-weight: 600;">
                <input type="checkbox" id="select-all-columns-inline" checked style="margin-right: 8px;">
                全选/取消全选
            </label>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px;">
    `;

    for (let i = 0; i < allColumns; i++) {
        const header = this.hot.getColHeader(i);
        const isVisible = !hiddenColumns.includes(i);
        const checked = isVisible ? 'checked' : '';
        html += `
            <label style="cursor: pointer; padding: 8px 12px; border: 1px solid #dee2e6; border-radius: 4px; user-select: none; display: flex; align-items: center; background: ${isVisible ? '#fff' : '#f8f9fa'};">
                <input type="checkbox" class="column-checkbox-inline" data-col-index="${i}" ${checked} style="margin-right: 8px;">
                <span style="font-size: 13px;">${header}</span>
            </label>
        `;
    }
    html += '</div>';
    $checkboxArea.html(html);

    this.wrapper.find('#select-all-columns-inline').on('change', function() {
        const checked = $(this).is(':checked');
        $checkboxArea.find('.column-checkbox-inline').prop('checked', checked).trigger('change');
    });

    this.wrapper.find('.column-checkbox-inline').on('change', (e) => {
        const $checkbox = $(e.target);
        const colIndex = parseInt($checkbox.data('col-index'));
        if ($checkbox.is(':checked')) hiddenColumnsPlugin.showColumn(colIndex);
        else hiddenColumnsPlugin.hideColumn(colIndex);
        this.hot.render();
        $checkbox.closest('label').css('background', $checkbox.is(':checked') ? '#fff' : '#f8f9fa');
    });
};

StorePlanningManager.prototype.toggle_column_settings = function() {
    const $checkboxArea = this.wrapper.find('#column-checkboxes');
    if ($checkboxArea.is(':visible')) $checkboxArea.slideUp(200);
    else $checkboxArea.slideDown(200);
};