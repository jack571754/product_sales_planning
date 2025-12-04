// product_sales_planning/planning_system/page/data_view/data_view.js

// 1. 页面加载（只执行一次，用于初始化）
frappe.pages['data-view'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '数据查看',
        single_column: true
    });

    // 显示初始加载状态
    $(wrapper).find('.layout-main-section').html(`
        <div id="data-view-app">
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="mt-2 text-muted">正在加载资源...</div>
                <div class="mt-2 text-muted" style="font-size: 12px;">请稍候，正在初始化页面组件...</div>
            </div>
        </div>
    `);

    // 加载 Handsontable CSS 和 JS（使用 frappe.require 优化）
    load_handsontable_assets().then(() => {
        console.log('✅ 资源加载完成，初始化管理器');
        // 创建内容容器
        $(wrapper).find('.layout-main-section').html(`
            <div id="data-view-app">
                <div class="data-view-loading">
                    <div class="spinner-border text-primary" role="status"></div>
                    <div class="mt-2 text-muted">正在初始化页面...</div>
                </div>
            </div>
        `);

        // 初始化管理器
        wrapper.data_view_manager = new DataViewManager(wrapper, page);
    }).catch(error => {
        console.error('❌ Handsontable 加载失败:', error);
        $(wrapper).find('.layout-main-section').html(`
            <div class="text-center p-5">
                <div class="alert alert-danger">
                    <h4>资源加载失败</h4>
                    <p>${error.message || '未知错误'}</p>
                    <button class="btn btn-primary me-2" onclick="location.reload()">
                        <i class="fa fa-refresh"></i> 刷新页面
                    </button>
                    <button class="btn btn-secondary" onclick="history.back()">
                        <i class="fa fa-arrow-left"></i> 返回上一页
                    </button>
                </div>
            </div>
        `);
    });
};

// 2. 页面显示（每次切换回来都会执行）
frappe.pages['data-view'].on_page_show = function(wrapper) {
    if (wrapper.data_view_manager && wrapper.data_view_manager.filter_group) {
        console.log("页面显示，自动刷新数据...");
        // 可选：如果不需要每次切回来都刷新，可以注释掉下面这行
        // wrapper.data_view_manager.fetch_data();
    }
};

// 3. 页面卸载（清理资源）
frappe.pages['data-view'].on_page_unload = function(wrapper) {
    if (wrapper.data_view_manager) {
        if (wrapper.data_view_manager.hot) {
            wrapper.data_view_manager.hot.destroy();
        }
        wrapper.data_view_manager = null;
    }
};

// 加载 Handsontable 资源（优化版：使用 frappe.require）
function load_handsontable_assets() {
    return new Promise((resolve, reject) => {
        const assets = [
            '/assets/product_sales_planning/js/lib/handsontable.full.min.css',
            '/assets/product_sales_planning/js/lib/handsontable.full.min.js'
        ];
        
        frappe.require(assets, () => {
            if (window.Handsontable) {
                resolve();
            } else {
                reject(new Error('Handsontable 对象未找到'));
            }
        });
    });
}

// 数据查看管理器类
class DataViewManager {
    constructor(wrapper, page) {
        this.wrapper = $(wrapper);
        this.page = page;
        this.current_page = 1;
        this.page_size = 50; // 默认每页50条
        this.filters = {};
        this.filter_options = {
            tasks: [],
            stores: [],
            products: [],
            channels: []
        };
        this.data = {
            stats: {
                total_stores: 0,
                total_products: 0,
                total_quantity: 0,
                completed_stores: 0,
                pending_stores: 0,
                rejected_stores: 0
            },
            data: [],
            total: 0
        };
        this.hot = null; // Handsontable 实例
        this.cached_filters_key = 'data_view_column_filters'; // 缓存键名

        this.init_ui();
    }

    init_ui() {
        this.page.clear_primary_action();
        this.page.set_primary_action('刷新', () => this.fetch_data());

        // 添加返回按钮
        this.page.add_inner_button('返回首页', () => {
            frappe.set_route('planning-dashboard');
        }, null, 'btn-default');

        // 创建内容容器
        this.wrapper.find('#data-view-app').html(`
            <style>
                /* 统计卡片样式 */
                .stats-section {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 16px;
                    margin-bottom: 20px;
                }
                .stat-card {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    padding: 20px;
                    background: #fff;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .stat-icon-box {
                    width: 48px;
                    height: 48px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .stat-icon-box.box-blue { background: #dbeafe; color: #1e40af; }
                .stat-icon-box.box-success { background: #d1fae5; color: #065f46; }
                .stat-icon-box.box-warning { background: #fef3c7; color: #92400e; }
                .stat-icon-box.box-danger { background: #fee2e2; color: #991b1b; }
                .stat-content h4 {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 700;
                    color: #111827;
                }
                .stat-content span {
                    font-size: 13px;
                    color: #6b7280;
                }

                /* 筛选器样式 */
                .filters-section {
                    margin-bottom: 20px;
                }
                .filter-card {
                    background: #fff;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                .filter-controls-row {
                    margin-left: -8px;
                    margin-right: -8px;
                }
                .filter-controls-row > div {
                    padding-left: 8px;
                    padding-right: 8px;
                }
                .filter-actions {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                }
                /* 覆盖 FieldGroup 默认样式 */
                .filter-card .frappe-control {
                    margin-bottom: 0 !important;
                }
                .filter-card .form-group {
                    margin-bottom: 0 !important;
                }

                /* 列设置样式 */
                .column-settings-section {
                    margin-bottom: 20px;
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
            </style>

            <div class="data-view-body">
                <div class="stats-section">
                    <div class="stat-card">
                        <div class="stat-icon-box box-blue">${frappe.utils.icon('package', 'md')}</div>
                        <div class="stat-content">
                            <h4 id="stat-total-quantity">0</h4>
                            <span>总数量</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon-box box-success">${frappe.utils.icon('check-circle', 'md')}</div>
                        <div class="stat-content">
                            <h4 id="stat-completed-stores">0</h4>
                            <span>已完成店铺</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon-box box-warning">${frappe.utils.icon('clock', 'md')}</div>
                        <div class="stat-content">
                            <h4 id="stat-pending-stores">0</h4>
                            <span>待审批店铺</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon-box box-danger">${frappe.utils.icon('x-circle', 'md')}</div>
                        <div class="stat-content">
                            <h4 id="stat-rejected-stores">0</h4>
                            <span>已驳回店铺</span>
                        </div>
                    </div>
                </div>

                <div class="filters-section">
                    <div class="filter-card">
                        <div class="filter-controls-row row">
                            <div class="col-md-2 col-sm-6 col-12 filter-task"></div>
                            <div class="col-md-2 col-sm-6 col-12 filter-store"></div>
                            <div class="col-md-2 col-sm-6 col-12 filter-product"></div>
                            <div class="col-md-2 col-sm-6 col-12 filter-channel"></div>
                            <div class="col-md-2 col-sm-6 col-12 filter-approval-status"></div>
                            <div class="col-md-2 col-sm-6 col-12 filter-submission-status"></div>
                        </div>
                        <div class="filter-controls-row row" style="margin-top: 10px;">
                            <div class="col-12 filter-actions">
                                <button class="btn btn-sm btn-default btn-clear-filters" title="清空筛选">
                                    <i class="fa fa-eraser"></i> 清空
                                </button>
                                <button class="btn btn-sm btn-primary btn-apply-filters" title="应用筛选">
                                    <i class="fa fa-search"></i> 查询
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

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
                                <button class="btn btn-sm btn-primary btn-export-excel">
                                    <i class="fa fa-file-excel-o"></i> 导出 Excel
                                </button>
                            </div>
                        </div>
                        <div id="column-checkboxes" class="column-checkboxes"></div>
                    </div>
                </div>

                <div class="handsontable-container" style="border: 1px solid #d1d5db; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                    <div id="data-grid"></div>
                    <div class="pagination-section" style="display: flex; justify-content: flex-end; align-items: center; padding: 12px 16px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
                        <div class="pagination-info-left" style="display: flex; align-items: center; gap: 16px; font-size: 13px; color: #6b7280; margin-right: auto;">
                            <span style="display: flex; align-items: center; gap: 6px;">
                                共 <strong id="total-records" style="color: #111827; font-weight: 600;">0</strong> 条记录
                            </span>
                            <span style="color: #d1d5db;">|</span>
                            <span style="display: flex; align-items: center; gap: 6px;">
                                每页
                                <select class="form-control input-xs" id="page-size-selector" style="display: inline-block; width: 75px; height: 32px; padding: 4px 8px; font-size: 13px; border: 1px solid #d1d5db; border-radius: 6px; margin: 0; vertical-align: middle; background: #fff; cursor: pointer;">
                                    <option value="20">20</option>
                                    <option value="50" selected>50</option>
                                    <option value="100">100</option>
                                    <option value="200">200</option>
                                    <option value="500">500</option>
                                </select>
                                条
                            </span>
                        </div>
                        <div class="pagination-controls" style="display: flex; align-items: center; gap: 8px;">
                            <span class="pagination-page-info" style="font-size: 13px; color: #6b7280; margin-right: 12px;">
                                第 <strong id="current-page" style="color: #111827; font-weight: 600;">1</strong> / <strong id="total-pages" style="color: #111827; font-weight: 600;">1</strong> 页
                            </span>
                            <button class="btn btn-xs btn-default btn-first-page" title="首页" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; min-width: 36px; height: 32px; display: inline-flex; align-items: center; justify-content: center;"><i class="fa fa-angle-double-left"></i></button>
                            <button class="btn btn-xs btn-default btn-prev-page" title="上一页" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; min-width: 36px; height: 32px; display: inline-flex; align-items: center; justify-content: center;"><i class="fa fa-angle-left"></i></button>
                            <input type="number" class="form-control input-xs" id="goto-page-input" min="1" placeholder="页码" style="width: 70px; height: 32px; padding: 4px 8px; font-size: 13px; text-align: center; border: 1px solid #d1d5db; border-radius: 6px;">
                            <button class="btn btn-xs btn-primary btn-goto-page" style="padding: 6px 14px; border-radius: 6px; font-size: 13px; height: 32px;">跳转</button>
                            <button class="btn btn-xs btn-default btn-next-page" title="下一页" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; min-width: 36px; height: 32px; display: inline-flex; align-items: center; justify-content: center;"><i class="fa fa-angle-right"></i></button>
                            <button class="btn btn-xs btn-default btn-last-page" title="末页" style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; min-width: 36px; height: 32px; display: inline-flex; align-items: center; justify-content: center;"><i class="fa fa-angle-double-right"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        // 绑定按钮事件
        this.wrapper.find('.btn-clear-filters').on('click', () => this.clear_filters());
        this.wrapper.find('.btn-apply-filters').on('click', () => this.apply_filters());
        this.wrapper.find('.btn-export-excel').on('click', () => this.export_excel());
        this.wrapper.find('.btn-toggle-column-settings').on('click', () => this.toggle_column_settings());

        // 绑定分页按钮事件
        this.wrapper.find('.btn-first-page').on('click', () => this.goto_page(1));
        this.wrapper.find('.btn-prev-page').on('click', () => this.goto_page(this.current_page - 1));
        this.wrapper.find('.btn-next-page').on('click', () => this.goto_page(this.current_page + 1));
        this.wrapper.find('.btn-last-page').on('click', () => {
            const totalPages = Math.ceil(this.data.total / this.page_size);
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
            this.page_size = parseInt($(e.target).val());
            this.current_page = 1;
            this.fetch_data();
        });

        this.init_filter_fields();
        this.init_handsontable();
    }

    init_filter_fields() {
        const self = this;

        // 清空筛选器容器
        this.wrapper.find('.filter-task').empty();
        this.wrapper.find('.filter-store').empty();
        this.wrapper.find('.filter-product').empty();
        this.wrapper.find('.filter-channel').empty();
        this.wrapper.find('.filter-approval-status').empty();
        this.wrapper.find('.filter-submission-status').empty();

        // 等待筛选器选项加载完成后再初始化字段
        this.fetch_filter_options().then(() => {

            // --- 预处理数据为 MultiSelectList 格式 {label, value} ---

            // 任务数据源
            const task_options = self.filter_options.tasks.map(t => {
                const dateRange = (t.start_date && t.end_date)
                    ? `${t.start_date} ~ ${t.end_date}`
                    : (t.start_date || t.end_date || '无日期');
                return {
                    label: `${t.name} (${dateRange})`,
                    value: t.name
                };
            });

            // 店铺数据源
            const store_options = self.filter_options.stores.map(s => ({
                label: `${s.shop_name} (${s.name})`,
                value: s.name
            }));

            // 商品数据源
            const product_options = self.filter_options.products.map(p => ({
                label: `${p.name1 || p.name} (${p.code || p.name})`,
                value: p.code || p.name
            }));

            // 渠道数据源
            const channel_options = self.filter_options.channels.map(c => ({
                label: c,
                value: c
            }));

            // 状态数据源
            const approval_opts = ['待审批', '已通过', '已驳回'].map(s => ({label: s, value: s}));
            const submission_opts = ['未开始', '已提交'].map(s => ({label: s, value: s}));

            // --- 创建 FieldGroup ---
            self.filter_group = new frappe.ui.FieldGroup({
                fields: [
                    {
                        fieldname: 'task_ids',
                        label: '任务（可多选）',
                        fieldtype: 'MultiSelectList',
                        get_data: () => {
                            return task_options;
                        },
                        change: () => {
                            const values = self.filter_group.get_value('task_ids') || [];
                            self.filters.task_ids = Array.isArray(values) ? values.filter(v => v) : [];
                        }
                    },
                    {
                        fieldname: 'store_ids',
                        label: '店铺（可多选）',
                        fieldtype: 'MultiSelectList',
                        get_data: () => {
                            return store_options;
                        },
                        change: () => {
                            const values = self.filter_group.get_value('store_ids') || [];
                            self.filters.store_ids = Array.isArray(values) ? values.filter(v => v) : [];
                        }
                    },
                    {
                        fieldname: 'product_codes',
                        label: '商品（可多选）',
                        fieldtype: 'MultiSelectList',
                        get_data: () => {
                            return product_options;
                        },
                        change: () => {
                            const values = self.filter_group.get_value('product_codes') || [];
                            self.filters.product_codes = Array.isArray(values) ? values.filter(v => v) : [];
                        }
                    },
                    {
                        fieldname: 'channels',
                        label: '渠道（可多选）',
                        fieldtype: 'MultiSelectList',
                        get_data: () => {
                            return channel_options;
                        },
                        change: () => {
                            const values = self.filter_group.get_value('channels') || [];
                            self.filters.channels = Array.isArray(values) ? values.filter(v => v) : [];
                        }
                    },
                    {
                        fieldname: 'approval_statuses',
                        label: '审批状态（可多选）',
                        fieldtype: 'MultiSelectList',
                        get_data: () => {
                            return approval_opts;
                        },
                        change: () => {
                            const values = self.filter_group.get_value('approval_statuses') || [];
                            self.filters.approval_statuses = Array.isArray(values) ? values.filter(v => v) : [];
                        }
                    },
                    {
                        fieldname: 'submission_statuses',
                        label: '提交状态（可多选）',
                        fieldtype: 'MultiSelectList',
                        get_data: () => {
                            return submission_opts;
                        },
                        change: () => {
                            const values = self.filter_group.get_value('submission_statuses') || [];
                            self.filters.submission_statuses = Array.isArray(values) ? values.filter(v => v) : [];
                        }
                    }
                ],
                body: this.wrapper.find('.filter-card')
            });

            self.filter_group.make();

            // 手动布局到 Grid
            const f = this.filter_group.fields_dict;
            if (f.task_ids) f.task_ids.$wrapper.appendTo(this.wrapper.find('.filter-task'));
            if (f.store_ids) f.store_ids.$wrapper.appendTo(this.wrapper.find('.filter-store'));
            if (f.product_codes) f.product_codes.$wrapper.appendTo(this.wrapper.find('.filter-product'));
            if (f.channels) f.channels.$wrapper.appendTo(this.wrapper.find('.filter-channel'));
            if (f.approval_statuses) f.approval_statuses.$wrapper.appendTo(this.wrapper.find('.filter-approval-status'));
            if (f.submission_statuses) f.submission_statuses.$wrapper.appendTo(this.wrapper.find('.filter-submission-status'));

            // 筛选器初始化完成后，尝试恢复缓存的筛选器值
            setTimeout(() => {
                self.load_cached_filters();
            }, 100);

            // 加载数据
            console.log('✅ 筛选器初始化完成，开始加载数据');
            this.fetch_data();
        }).catch(error => {
            console.error('❌ 筛选器初始化失败:', error);
            frappe.msgprint('筛选器初始化失败，请刷新页面重试');
            // 即使筛选器失败，也尝试加载数据
            this.fetch_data();
        });
    }

    // 初始化 Handsontable
    init_handsontable() {
        const container = document.getElementById('data-grid');
        if (!container) return;

        // 定义列配置
        this.columns = [
            { data: 'shop_name', title: '店铺名称', width: 150, readOnly: true },
            { data: 'channel', title: '渠道', width: 120, readOnly: true },
            { data: 'code', title: '商品编码', width: 120, readOnly: true },
            { data: 'product_name', title: '商品名称', width: 200, readOnly: true },
            { data: 'specifications', title: '规格', width: 150, readOnly: true },
            { data: 'brand', title: '品牌', width: 120, readOnly: true },
            { data: 'category', title: '类别', width: 120, readOnly: true },
            { data: 'quantity', title: '数量', width: 100, type: 'numeric' },
            {
                data: 'sub_date', title: '提交时间', width: 150, readOnly: true,
                renderer: (instance, td, row, col, prop, value) => {
                    td.innerHTML = value ? new Date(value).toLocaleString('zh-CN', {
                        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                    }) : '-';
                }
            },
            { data: 'approval_status', title: '审批状态', width: 100, readOnly: true },
            { data: 'submission_status', title: '提交状态', width: 100, readOnly: true },
            { data: 'user', title: '负责人', width: 100, readOnly: true },
            { data: 'task_type', title: '任务类型', width: 120, readOnly: true },
            {
                data: 'start_date', title: '开始日期', width: 120, readOnly: true,
                renderer: (instance, td, row, col, prop, value) => {
                    td.innerHTML = value ? new Date(value).toLocaleDateString('zh-CN') : '-';
                }
            },
            {
                data: 'end_date', title: '结束日期', width: 120, readOnly: true,
                renderer: (instance, td, row, col, prop, value) => {
                    td.innerHTML = value ? new Date(value).toLocaleDateString('zh-CN') : '-';
                }
            }
        ];

        // 初始化 Handsontable 实例
        this.hot = new Handsontable(container, {
            data: [],
            columns: this.columns,
            colHeaders: true,
            rowHeaders: true,
            width: '100%',
            height: 600,
            licenseKey: 'non-commercial-and-evaluation',
            copyPaste: true,
            manualColumnResize: true,
            manualColumnMove: true,
            manualRowResize: true,
            filters: true,
            dropdownMenu: ['filter_by_condition', 'filter_by_value', 'filter_action_bar'],
            columnSorting: true,
            hiddenColumns: { indicators: true },
            selectionMode: 'multiple',
            language: 'zh-CN',
            wordWrap: false,
            fixedColumnsLeft: 2,
            renderAllRows: false,
            contextMenu: true, // 使用默认右键菜单
            afterFilter: () => this.cache_column_filters()
        });

        console.log('✅ Handsontable 表格初始化完成');

        // 初始化列设置和恢复缓存
        this.init_column_checkboxes();
        setTimeout(() => this.restore_column_filters(), 500);
    }

    // 缓存 Handsontable 列筛选器状态
    cache_column_filters() {
        if (!this.hot) return;
        try {
            const filtersPlugin = this.hot.getPlugin('filters');
            if (filtersPlugin && filtersPlugin.isEnabled()) {
                const filterConditions = [];
                const columns = this.hot.countCols();
                for (let col = 0; col < columns; col++) {
                    const conditions = filtersPlugin.getConditions(col);
                    if (conditions && conditions.length > 0) {
                        filterConditions.push({ column: col, conditions: conditions });
                    }
                }
                localStorage.setItem(this.cached_filters_key, JSON.stringify(filterConditions));
            }
        } catch (e) {
            console.error('缓存列筛选器失败:', e);
        }
    }

    // 恢复 Handsontable 列筛选器状态
    restore_column_filters() {
        if (!this.hot) return;
        try {
            const cached = localStorage.getItem(this.cached_filters_key);
            if (cached) {
                const filterConditions = JSON.parse(cached);
                const filtersPlugin = this.hot.getPlugin('filters');
                if (filtersPlugin && filtersPlugin.isEnabled()) {
                    filtersPlugin.clearConditions();
                    filterConditions.forEach(item => {
                        item.conditions.forEach(condition => {
                            filtersPlugin.addCondition(item.column, condition.name, condition.args);
                        });
                    });
                    filtersPlugin.filter();
                }
            }
        } catch (e) {
            console.error('恢复列筛选器失败:', e);
        }
    }

    // 显示加载状态
    show_loading_state() {
        if (this.hot) {
            this.hot.updateSettings({ data: [] });
        }
    }

    hide_loading_state() {}

    // 显示重试按钮
    show_retry_button() {
        const retryHtml = `
            <div class="text-center p-4">
                <div class="alert alert-warning">
                    <h5>数据加载失败</h5>
                    <p>无法获取数据，请检查网络连接或稍后重试</p>
                    <button class="btn btn-primary btn-retry-data">
                        <i class="fa fa-refresh"></i> 重试
                    </button>
                </div>
            </div>
        `;
        this.wrapper.find('.handsontable-container').html(retryHtml);
        this.wrapper.find('.btn-retry-data').on('click', () => {
            // 重新初始化 grid div 以便 handsontable 挂载
            this.wrapper.find('.handsontable-container').html('<div id="data-grid"></div>');
            this.init_handsontable();
            this.fetch_data();
        });
    }

    // 导出 Excel
    export_excel() {
        frappe.call({
            method: "product_sales_planning.planning_system.page.data_view.data_view.export_data_view",
            args: { filters: this.filters },
            freeze: true,
            freeze_message: "正在导出 Excel...",
            callback: (r) => {
                if (r.message && r.message.status === "success") {
                    window.open(r.message.file_url, '_blank');
                    frappe.show_alert({ message: '导出成功', indicator: 'green' }, 3);
                } else {
                    frappe.msgprint({
                        title: '导出失败',
                        message: r.message?.message || '导出失败',
                        indicator: 'red'
                    });
                }
            }
        });
    }

    fetch_filter_options() {
        return new Promise((resolve, reject) => {
            frappe.call({
                method: "product_sales_planning.planning_system.page.data_view.data_view.get_data_view_filter_options",
                callback: (r) => {
                    if (r.message && r.message.status === "success") {
                        this.filter_options = r.message;
                        resolve();
                    } else {
                        // 降级处理
                        this.filter_options = {
                            tasks: [], stores: [], products: [], channels: [],
                            approval_statuses: ['待审批', '已通过', '已驳回'],
                            submission_statuses: ['未开始', '已提交']
                        };
                        frappe.show_alert({ message: '部分筛选选项加载失败', indicator: 'yellow' }, 3);
                        resolve();
                    }
                },
                error: (err) => {
                    this.filter_options = {
                         tasks: [], stores: [], products: [], channels: [],
                         approval_statuses: [], submission_statuses: []
                    };
                    resolve();
                }
            });
        });
    }

    on_filter_change() {
        // 筛选器变化时，仅更新内部状态，等待点击查询按钮
    }

    clear_filters() {
        if (this.filter_group) {
            this.filter_group.set_values({
                task_ids: [],
                store_ids: [],
                product_codes: [],
                channels: [],
                approval_statuses: [],
                submission_statuses: []
            });
        }
        this.filters = {};
        this.current_page = 1;
        this.fetch_data();
    }

    apply_filters() {
        const values = this.filter_group.get_values();

        // MultiSelectList 的 change 回调已经更新了 this.filters
        // 这里只需要缓存筛选器状态并重新加载数据
        this.cache_filters(values);

        this.current_page = 1;
        this.fetch_data();
    }

    cache_filters(values) {
        try {
            localStorage.setItem('data_view_filters', JSON.stringify(values));
        } catch (e) {
            console.error('缓存筛选器失败:', e);
        }
    }

    load_cached_filters() {
        try {
            const cached = localStorage.getItem('data_view_filters');
            if (cached) {
                const values = JSON.parse(cached);
                // 延迟设置确保 DOM 渲染完毕
                setTimeout(() => {
                    if (this.filter_group) {
                        this.filter_group.set_values(values);
                    }
                }, 200);
            }
        } catch (e) {
            localStorage.removeItem('data_view_filters');
        }
    }

    fetch_data() {
        const self = this;
        console.log('🔍 开始加载数据，筛选条件:', this.filters);
        this.show_loading_state();

        frappe.call({
            method: "product_sales_planning.planning_system.page.data_view.data_view.get_data_view",
            args: {
                filters: this.filters,
                page: this.current_page,
                page_size: this.page_size
            },
            freeze: true,
            freeze_message: "加载数据...",
            callback: (r) => {
                if (r.message && r.message.status === "success") {
                    self.data = r.message;
                    self.render();
                    self.hide_loading_state();
                } else {
                    const errorMsg = r.message?.message || '数据加载失败';
                    frappe.show_alert({ message: errorMsg, indicator: 'red' }, 5);
                    self.data = { data: [], total: 0, stats: {} };
                    self.render();
                    self.hide_loading_state();
                }
            },
            error: (err) => {
                frappe.show_alert({ message: '网络错误', indicator: 'red' }, 5);
                self.show_retry_button();
            }
        });
    }

    render() {
        // 更新统计卡片
        this.wrapper.find('#stat-total-quantity').text(this.data.stats.total_quantity || 0);
        this.wrapper.find('#stat-completed-stores').text(this.data.stats.completed_stores || 0);
        this.wrapper.find('#stat-pending-stores').text(this.data.stats.pending_stores || 0);
        this.wrapper.find('#stat-rejected-stores').text(this.data.stats.rejected_stores || 0);

        // 更新分页信息
        const totalPages = Math.ceil(this.data.total / this.page_size) || 1;
        this.wrapper.find('#total-records').text(this.data.total || 0);
        this.wrapper.find('#current-page').text(this.current_page);
        this.wrapper.find('#total-pages').text(totalPages);

        // 更新分页按钮
        this.wrapper.find('.btn-first-page').prop('disabled', this.current_page === 1);
        this.wrapper.find('.btn-prev-page').prop('disabled', this.current_page === 1);
        this.wrapper.find('.btn-next-page').prop('disabled', this.current_page >= totalPages);
        this.wrapper.find('.btn-last-page').prop('disabled', this.current_page >= totalPages);

        // 更新 Handsontable 数据
        if (this.hot) {
            this.hot.loadData(this.data.data || []);
        }
    }

    goto_page(page) {
        const totalPages = Math.ceil(this.data.total / this.page_size) || 1;
        if (page < 1) page = 1;
        else if (page > totalPages) page = totalPages;
        if (page === this.current_page) return;
        this.current_page = page;
        this.fetch_data();
    }

    init_column_checkboxes() {
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
    }

    toggle_column_settings() {
        const $checkboxArea = this.wrapper.find('#column-checkboxes');
        if ($checkboxArea.is(':visible')) $checkboxArea.slideUp(200);
        else $checkboxArea.slideDown(200);
    }
}