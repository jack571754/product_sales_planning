// product_sales_planning/planning_system/page/store_detail/store_detail.js

// 1. 页面加载入口 (只执行一次)
frappe.pages['store-detail'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '商品规划管理',
        single_column: true
    });

    // 预留 DOM 挂载点
    $(wrapper).find('.layout-main-section').html(`
        <div id="store-detail-app" style="min-height: 600px;">
            <div class="text-center p-5 text-muted">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="mt-2">正在加载资源...</div>
            </div>
        </div>
    `);

    // 加载 AG Grid 库（本地资源）
    if (!window.agGrid) {
        // 加载 AG Grid 基础 CSS
        $('<link>').attr({
            rel: 'stylesheet',
            href: '/assets/product_sales_planning/js/lib/ag-grid.min.css',
            id: 'ag-grid-css'
        }).appendTo('head');

        // 加载 AG Grid Alpine 主题 CSS
        $('<link>').attr({
            rel: 'stylesheet',
            href: '/assets/product_sales_planning/js/lib/ag-theme-alpine.min.css',
            id: 'ag-theme-alpine-css'
        }).appendTo('head');

        // 加载 AG Grid JS
        $.getScript('/assets/product_sales_planning/js/lib/ag-grid-community.min.js', function() {
            console.log('✅ AG Grid loaded successfully from local');
        });
    }

    // 样式注入
    if (!document.getElementById('store-detail-css')) {

        $('<style>').text(`
            /* 固定筛选器区域 */
            .store-planning-body {
                padding: 10px;
                max-width: 100%;
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                height: calc(100vh - 100px);
            }

            /* 固定头部区域（操作栏 + 筛选器 + 统计卡片） */
            .fixed-header-area {
                position: sticky;
                top: 0;
                z-index: 100;
                background: var(--bg-color, #fff);
                padding-bottom: 10px;
                border-bottom: 2px solid var(--border-color);
                margin-bottom: 10px;
            }

            .filter-card {
                background: var(--card-bg);
                padding: 12px 15px;
                border-radius: 6px;
                border: 1px solid var(--border-color);
                margin-bottom: 10px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .filter-card .row {
                align-items: flex-end;
            }

            /* AG Grid 表格容器样式 */
            .datatable-container {
                flex: 1;
                background: #fff;
                border-radius: 6px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                overflow: hidden;
                min-height: 400px;
            }

            #ag-grid-container {
                width: 100%;
                height: 100%;
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
                padding: 12px 15px;
                background: linear-gradient(135deg, var(--card-bg) 0%, #f8f9fa 100%);
                border-radius: 6px;
                border: 1px solid var(--border-color);
                box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            }
            .stat-label {
                font-size: 11px;
                color: var(--text-muted);
                margin-bottom: 4px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .stat-number {
                font-size: 20px;
                font-weight: bold;
                line-height: 1.2;
            }
            .text-primary { color: #4472C4; }
            .text-success { color: #28a745; }
            .btn-search {
                margin-bottom: 10px;
            }
            .w-100 {
                width: 100%;
            }
        `).appendTo('head');
    }

    // 直接实例化管理器
    wrapper.store_manager = new StorePlanningManager(wrapper, page);
};

// 2. 页面显示入口 (路由变化、切换Tab都会触发)
frappe.pages['store-detail'].on_page_show = function(wrapper) {
    if (wrapper.store_manager) {
        wrapper.store_manager.refresh_from_route();
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

        this.init_ui();

        // 初始化时立即尝试读取一次路由
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
                            <button class="btn btn-sm btn-info btn-import-excel">
                                <span class="fa fa-upload"></span> 单品导入
                            </button>
                            <button class="btn btn-sm btn-primary btn-import-mechanism">
                                <span class="fa fa-cubes"></span> 机制导入
                            </button>
                            <button class="btn btn-sm btn-success btn-add-product">
                                <span class="fa fa-plus"></span> 添加商品
                            </button>
                            <button class="btn btn-sm btn-default btn-apply-mechanism">
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
                            <div class="stat-label">总计划量</div>
                            <div class="stat-number text-primary" id="stat-total">0</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-label">已规划SKU</div>
                            <div class="stat-number text-success" id="stat-count">0 / 0</div>
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

                <!-- 表格容器（可滚动） -->
                <div id="datatable-container" class="datatable-container"></div>
            </div>
        `);

        // 绑定按钮事件
        this.wrapper.find('.btn-return').on('click', () => this.return_to_previous());
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

    // 🔥 核心：安全的路由同步逻辑
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

            // 使用 setTimeout 确保 Frappe 的 Link 字段完全初始化
            setTimeout(() => {
                // 设置筛选器值
                const promises = [];

                if (storeId) {
                    promises.push(
                        this.filter_group.fields_dict.store_id.set_value(storeId)
                    );
                }

                if (taskId) {
                    promises.push(
                        this.filter_group.fields_dict.task_id.set_value(taskId)
                    );
                }

                Promise.all(promises).then(() => {
                    console.log('✅ 筛选器值已设置');
                    this.is_programmatic_update = false; // 解锁

                    // 2. 直接查询，不依赖 UI 取值 (解决回显慢/需点击的问题)
                    this.fetch_data({ storeId, taskId });
                }).catch(err => {
                    console.error('❌ 设置过滤器值失败:', err);
                    this.is_programmatic_update = false;
                    this.fetch_data({ storeId, taskId });
                });
            }, 100);
        } else {
            // 路由无有效参数或参数无效，清空过滤器并加载数据
            console.log('⚠️ 路由参数无效，清空筛选器');
            this.is_programmatic_update = true;

            setTimeout(() => {
                Promise.all([
                    this.filter_group.fields_dict.store_id.set_value(''),
                    this.filter_group.fields_dict.task_id.set_value('')
                ]).then(() => {
                    this.is_programmatic_update = false;
                    this.fetch_data();
                }).catch(err => {
                    console.error('清空过滤器值失败:', err);
                    this.is_programmatic_update = false;
                    this.fetch_data();
                });
            }, 100);
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
            freeze: true,
            freeze_message: "加载数据...",
            callback: (r) => {
                if (r.message && !r.message.error) {
                    this.data = r.message.data || [];
                    this.months = r.message.months || [];
                    this.init_table();
                    this.update_stats();
                    // 加载审批状态
                    this.load_approval_status();
                } else {
                    // 处理无数据或错误情况
                    this.data = [];
                    this.months = [];
                    this.init_table();
                    this.update_stats();
                    if (r.message && r.message.error) {
                        frappe.msgprint(r.message.error);
                    }
                }
            },
            error: (err) => {
                console.error('数据加载失败:', err);
                frappe.msgprint('数据加载失败，请稍后重试');
                // 即使失败也要更新界面
                this.data = [];
                this.months = [];
                this.init_table();
                this.update_stats();
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

        // 如果AG Grid还未加载，等待加载
        if (!window.agGrid) {
            setTimeout(() => this.init_multi_month_table(container), 200);
            return;
        }

        // 清空容器并创建AG Grid容器（添加ag-theme-alpine类名）
        container.innerHTML = '<div id="ag-grid-container" class="ag-theme-alpine" style="width: 100%; height: 100%;"></div>';

        // 准备列定义
        const columnDefs = [
            {
                headerName: '',
                field: 'selected',
                checkboxSelection: true,
                headerCheckboxSelection: true,
                width: 50,
                pinned: 'left',
                lockPosition: true,
                suppressMenu: true
            },
            {
                headerName: '#',
                valueGetter: 'node.rowIndex + 1',
                width: 60,
                pinned: 'left',
                lockPosition: true,
                suppressMenu: true
            },
            {
                headerName: '商品名称',
                field: 'name1',
                width: 200,
                pinned: 'left',
                filter: 'agTextColumnFilter'
            },
            {
                headerName: '编码',
                field: 'code',
                width: 120,
                filter: 'agTextColumnFilter'
            },
            {
                headerName: '规格',
                field: 'specifications',
                width: 100,
                filter: 'agTextColumnFilter'
            },
            {
                headerName: '品牌',
                field: 'brand',
                width: 100,
                filter: 'agTextColumnFilter'
            },
            {
                headerName: '类别',
                field: 'category',
                width: 100,
                filter: 'agTextColumnFilter'
            }
        ];

        // 动态添加月份列
        this.months.forEach(month => {
            columnDefs.push({
                headerName: month,
                field: `month_${month}`,
                width: 120,
                editable: true,
                filter: 'agNumberColumnFilter',
                cellEditor: 'agNumberCellEditor',
                cellEditorParams: {
                    min: 0,
                    precision: 0
                },
                valueGetter: (params) => {
                    if (params.data && params.data.months && params.data.months[month]) {
                        return params.data.months[month].quantity || 0;
                    }
                    return 0;
                },
                valueSetter: (params) => {
                    const newValue = parseInt(params.newValue) || 0;
                    if (!params.data.months) {
                        params.data.months = {};
                    }
                    if (!params.data.months[month]) {
                        params.data.months[month] = {};
                    }
                    params.data.months[month].quantity = newValue;
                    return true;
                },
                cellStyle: { textAlign: 'right' }
            });
        });

        // 准备行数据
        const rowData = this.data.map(item => ({
            ...item,
            months: item.months || {}
        }));

        // AG Grid 配置
        const gridOptions = {
            columnDefs: columnDefs,
            rowData: rowData,
            defaultColDef: {
                sortable: true,
                resizable: true,
                filter: true,
                floatingFilter: false,  // 默认隐藏浮动筛选器
                tooltipValueGetter: (params) => {
                    // 鼠标悬浮时显示完整字段内容
                    return params.value;
                }
            },
            // 范围选择配置 - 优化选择体验
            enableRangeSelection: true,  // 启用范围选择
            enableFillHandle: true,  // 启用填充手柄（右下角小方块拖拽）
            fillHandleDirection: 'xy',  // 允许横向和纵向填充
            suppressMultiRangeSelection: false,  // 允许Ctrl+点击多范围选择

            // 选择行为配置
            rowSelection: 'multiple',  // 允许多行选择
            suppressRowClickSelection: true,  // 点击单元格不选择行
            suppressCellFocus: false,  // 允许单元格获得焦点

            ensureDomOrder: true,
            animateRows: true,

            // 启用分页
            pagination: true,
            paginationPageSize: 50,  // 每页50条
            paginationPageSizeSelector: [20, 50, 100, 200],  // 可选的每页条数

            domLayout: 'normal',

            // Excel 复制粘贴配置（增强版）
            enableClipboard: true,
            enableCellTextSelection: true,  // 允许选择单元格文本
            copyHeadersToClipboard: false,  // 不复制表头，更适合粘贴
            suppressCopyRowsToClipboard: false,
            suppressCopySingleCellRanges: false,  // 允许复制单个单元格

            // 处理复制事件
            processCellForClipboard: (params) => {
                // 返回单元格的值用于复制
                return params.value;
            },

            // 处理粘贴事件
            processCellFromClipboard: (params) => {
                // 解析粘贴的值
                const value = params.value;
                // 如果是数字列，转换为数字
                if (params.column.getColId().startsWith('month_')) {
                    return parseInt(value) || 0;
                }
                return value;
            },

            // 单元格编辑完成事件
            onCellValueChanged: (event) => {
                // 获取修改的月份
                const field = event.column.getColId();
                const monthMatch = field.match(/^month_(.+)$/);

                if (monthMatch) {
                    const month = monthMatch[1];
                    const code = event.data.code;
                    const newQty = event.newValue || 0;
                    const oldQty = event.oldValue || 0;

                    if (newQty !== oldQty) {
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
                        self.save_month_quantity(currentStoreId, currentTaskId, code, month, newQty);
                    }
                }
            },

            // 粘贴事件处理
            onPasteEnd: (event) => {
                frappe.show_alert({
                    message: '数据已粘贴，正在保存...',
                    indicator: 'blue'
                }, 2);

                // 批量保存粘贴的数据
                const currentStoreId = self.filter_group.get_value('store_id');
                const currentTaskId = self.filter_group.get_value('task_id');

                if (!currentStoreId || !currentTaskId) {
                    frappe.show_alert({
                        message: '请先选择店铺和计划任务',
                        indicator: 'red'
                    }, 3);
                    return;
                }

                // 收集所有修改的数据
                const updates = [];
                event.api.forEachNode((node) => {
                    if (node.data && node.data.months) {
                        self.months.forEach(month => {
                            const qty = node.data.months[month]?.quantity || 0;
                            updates.push({
                                code: node.data.code,
                                month: month,
                                quantity: qty
                            });
                        });
                    }
                });

                // 批量保存
                self.batch_save_quantities(currentStoreId, currentTaskId, updates);
            },

            // 选择变化事件
            onSelectionChanged: (event) => {
                const selectedRows = event.api.getSelectedRows();
                self.checked_rows.clear();
                selectedRows.forEach(row => {
                    self.checked_rows.add(row.code);
                });
                self.update_batch_btn();
            },

            // 本地化配置
            localeText: {
                // 筛选器
                filterOoo: '筛选...',
                equals: '等于',
                notEqual: '不等于',
                lessThan: '小于',
                greaterThan: '大于',
                lessThanOrEqual: '小于或等于',
                greaterThanOrEqual: '大于或等于',
                inRange: '范围',
                contains: '包含',
                notContains: '不包含',
                startsWith: '开始于',
                endsWith: '结束于',
                andCondition: '且',
                orCondition: '或',
                applyFilter: '应用',
                resetFilter: '重置',
                clearFilter: '清除',
                // 其他
                noRowsToShow: '暂无数据',
                loadingOoo: '加载中...',
                page: '页',
                to: '到',
                of: '共',
                next: '下一页',
                last: '最后一页',
                first: '第一页',
                previous: '上一页',
                // 复制粘贴
                copy: '复制',
                copyWithHeaders: '复制（含表头）',
                paste: '粘贴'
            }
        };

        // 创建 AG Grid 实例
        const gridDiv = document.querySelector('#ag-grid-container');
        this.gridApi = agGrid.createGrid(gridDiv, gridOptions);

        console.log('✅ AG Grid 表格初始化完成');
    }

    // 旧的HTML表格渲染方法已被AG Grid替代

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

StorePlanningManager.prototype.load_approval_status = function() {
    const storeId = this.filter_group.get_value('store_id');
    const taskId = this.filter_group.get_value('task_id');

    if (!storeId || !taskId) {
        // 没有选择店铺和任务，隐藏审批相关UI
        this.wrapper.find('.approval-status-area').hide();
        this.wrapper.find('.btn-submit-approval').hide();
        this.wrapper.find('.btn-approve').hide();
        this.wrapper.find('.btn-reject-previous').hide();
        this.wrapper.find('.btn-reject-submitter').hide();
        this.wrapper.find('.btn-view-history').hide();
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
                self.approval_data = r.message;
                self.update_approval_ui();
            }
        },
        error: (err) => {
            console.error('加载审批状态失败:', err);
        }
    });
};

StorePlanningManager.prototype.update_approval_ui = function() {
    const data = this.approval_data;

    if (!data || !data.workflow || !data.workflow.has_workflow) {
        // 没有审批流程，隐藏所有审批UI
        this.wrapper.find('.approval-status-area').hide();
        this.wrapper.find('.btn-submit-approval').hide();
        this.wrapper.find('.btn-approve').hide();
        this.wrapper.find('.btn-reject-previous').hide();
        this.wrapper.find('.btn-reject-submitter').hide();
        this.wrapper.find('.btn-view-history').hide();
        return;
    }

    const currentState = data.workflow.current_state;
    const canEdit = data.can_edit;
    const canApprove = data.can_approve;

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
    if (currentState.approval_status === '已驳回' && canEdit) {
        // 被退回后，无论退回到哪一级，都允许重新提交
        this.wrapper.find('.btn-submit-approval').show();
        this.wrapper.find('.btn-withdraw-approval').hide();
    } else if (currentState.status === '未开始' && currentState.current_step === 0) {
        // 首次提交
        this.wrapper.find('.btn-submit-approval').show();
        this.wrapper.find('.btn-withdraw-approval').hide();
    } else {
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
    if (data.history && data.history.length > 0) {
        this.wrapper.find('.btn-view-history').show();
    } else {
        this.wrapper.find('.btn-view-history').hide();
    }

    // 控制表格编辑权限
    if (this.gridApi) {
        const editable = canEdit && currentState.approval_status !== '待审批';
        // 更新所有月份列的可编辑状态
        this.months.forEach(month => {
            const colDef = this.gridApi.getColumnDef(`month_${month}`);
            if (colDef) {
                colDef.editable = editable;
            }
        });
        this.gridApi.refreshCells();
    }

    // 控制产品操作按钮显示
    // 只有在未提交审批或被退回状态时才显示这些按钮
    const showOperationButtons = (currentState.status === '未开始' && currentState.current_step === 0) ||
                                  (currentState.approval_status === '已驳回' && canEdit);

    if (showOperationButtons) {
        // 未提交或被退回状态：显示所有操作按钮
        this.wrapper.find('.btn-add-product').show();
        this.wrapper.find('.btn-import-excel').show();
        this.wrapper.find('.btn-import-mechanism').show();
        this.wrapper.find('.btn-apply-mechanism').show();
        // 批量删除按钮根据选中状态控制，不在这里处理
    } else {
        // 审批中或已通过：隐藏所有操作按钮
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
                    self.load_approval_status();
                    self.fetch_data();
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
                        self.load_approval_status();
                        self.fetch_data();
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
                    self.load_approval_status();
                    self.fetch_data();
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
                    self.load_approval_status();
                    self.fetch_data();
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
                    self.load_approval_status();
                    self.fetch_data();
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

    if (!data || !data.history || data.history.length === 0) {
        frappe.msgprint('暂无审批历史');
        return;
    }

    // 构建审批历史HTML
    let historyHTML = '<div class="approval-history-timeline">';

    data.history.forEach((item, index) => {
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
                    <span style="margin-left: 10px;">${frappe.datetime.str_to_user(item.action_time)}</span>
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