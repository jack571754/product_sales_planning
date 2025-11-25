// product_sales_planning/planning_system/page/store_detail/store_detail.js

frappe.pages['store-detail'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '商品规划管理',
        single_column: true
    });

    $(wrapper).find('.layout-main-section').html(`
        <div id="store-detail-app">
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="mt-2 text-muted">正在加载...</div>
            </div>
        </div>
    `);

    inject_css();

    if (window.Vue) {
        init_vue_app(wrapper, page);
    } else {
        frappe.require("/assets/frappe/node_modules/vue/dist/vue.global.js", function() {
            init_vue_app(wrapper, page);
        });
    }
};

frappe.pages['store-detail'].on_page_show = function(wrapper) {
    // 必须确保 Vue 实例存在
    if (!wrapper.vue_app) return;

    console.log("页面显示，开始同步状态...");

    // 第一步：刷新下拉菜单选项（确保有 Store 和 Task 列表供选择）
    // 这一步必须在最前面，否则即使赋值了 filters.storeId，Dropdown 也可能显示空白
    if (wrapper.vue_app.loadFilterOptions) {
        wrapper.vue_app.loadFilterOptions();
    }

    // 第二步：从路由同步参数到 Vue 的 filters 状态
    // 这一步必须在 fetchData 之前
    if (wrapper.vue_app.initFiltersFromRoute) {
        wrapper.vue_app.initFiltersFromRoute();
    }

    // 第三步：根据最新的 filters 状态拉取表格数据
    if (wrapper.vue_app.fetchData) {
        wrapper.vue_app.fetchData();
    }
};

function init_vue_app(wrapper, page) {
    if (!window.Vue) {
        $(wrapper).find('#store-detail-app').html(
            `<div class="alert alert-danger">Vue 加载失败</div>`
        );
        return;
    }

    const { createApp, reactive, computed, onMounted, toRefs, watch } = window.Vue;

    const App = {
        template: `
            <div class="store-planning-container">
                
                <!-- 筛选器和工具栏 -->
                <div class="filter-toolbar">
                    <div class="filter-section">
                        <div class="filter-group">
                            <label class="filter-label">🏪 店铺</label>
                            <select v-model="filters.storeId" class="form-control form-control-sm" @change="applyFilters">
                                <option value="">全部店铺</option>
                                <option v-for="store in storeList" :key="store" :value="store">{{ store }}</option>
                            </select>
                        </div>
                        
                        <div class="filter-group">
                            <label class="filter-label">📋 计划任务</label>
                            <select v-model="filters.taskId" class="form-control form-control-sm" @change="applyFilters">
                                <option value="">全部任务</option>
                                <option v-for="task in taskList" :key="task" :value="task">{{ task }}</option>
                            </select>
                        </div>

                        <div class="filter-group">
                            <label class="filter-label">🏷️ 品牌</label>
                            <input type="text" 
                                v-model="filters.brand" 
                                class="form-control form-control-sm" 
                                placeholder="搜索品牌..."
                                @keyup.enter="applyFilters">
                        </div>

                        <div class="filter-group">
                            <label class="filter-label">📦 类别</label>
                            <input type="text" 
                                v-model="filters.category" 
                                class="form-control form-control-sm" 
                                placeholder="搜索类别..."
                                @keyup.enter="applyFilters">
                        </div>

                        <div class="filter-actions">
                            <button class="btn btn-sm btn-primary" @click="applyFilters">
                                🔍 筛选
                            </button>
                            <button class="btn btn-sm btn-default" @click="resetFilters">
                                ↻ 重置
                            </button>
                        </div>
                    </div>

                    <div class="action-section">
                        <button class="btn btn-sm btn-success" @click="openProductListDialog" :disabled="loading">
                            ➕ 添加商品
                        </button>
                        <button class="btn btn-sm btn-warning" 
                            @click="batchEdit" 
                            :disabled="selectedItems.length === 0">
                            ✏️ 批量修改 ({{ selectedItems.length }})
                        </button>
                        <button class="btn btn-sm btn-danger" 
                            @click="batchDelete" 
                            :disabled="selectedItems.length === 0">
                            🗑️ 批量删除
                        </button>
                    </div>
                </div>

                <!-- 统计卡片 -->
                <div class="stats-row">
                    <div class="stat-card stat-primary">
                        <div class="stat-icon">📦</div>
                        <div class="stat-info">
                            <div class="stat-value">{{ items.length }}</div>
                            <div class="stat-label">当前页 SKU</div>
                        </div>
                    </div>
                    
                    <div class="stat-card stat-success">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-info">
                            <div class="stat-value">{{ totalQuantity }}</div>
                            <div class="stat-label">总件数</div>
                        </div>
                    </div>
                    
                    <div class="stat-card stat-info">
                        <div class="stat-icon">📊</div>
                        <div class="stat-info">
                            <div class="stat-value">{{ total }}</div>
                            <div class="stat-label">总记录数</div>
                        </div>
                    </div>
                    
                    <div class="stat-card" :class="isSaving ? 'stat-warning' : 'stat-success'">
                        <div class="stat-icon">{{ isSaving ? '💾' : '✅' }}</div>
                        <div class="stat-info">
                            <div class="stat-value">{{ isSaving ? '保存中' : '已同步' }}</div>
                            <div class="stat-label">同步状态</div>
                        </div>
                    </div>
                </div>

                <!-- 错误提示 -->
                <div v-if="errorMsg" class="alert alert-danger alert-dismissible">
                    {{ errorMsg }}
                    <button type="button" class="close" @click="errorMsg = ''">×</button>
                </div>

                <!-- 数据表格 -->
                <div class="data-table-wrapper">
                    <div v-if="loading" class="loading-state">
                        <div class="spinner-border text-primary"></div>
                        <p>数据加载中...</p>
                    </div>

                    <table v-else class="data-table">
                        <thead>
                            <tr>
                                <th width="40" class="text-center">
                                    <input type="checkbox" 
                                        @change="toggleSelectAll" 
                                        :checked="isAllSelected">
                                </th>
                                <th width="50">#</th>
                                <th width="200">产品名称</th>
                                <th width="120">规格</th>
                                <th width="100">品牌</th>
                                <th width="100">类别</th>
                                <th width="120">店铺</th>
                                <th width="120">任务ID</th>
                                <th width="100" class="text-right">数量</th>
                                <th width="80" class="text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="items.length === 0">
                                <td colspan="10" class="empty-state">
                                    <div class="empty-icon">📭</div>
                                    <p>暂无数据</p>
                                    <button class="btn btn-sm btn-primary" @click="openProductListDialog">
                                        立即添加商品
                                    </button>
                                </td>
                            </tr>
                            <tr v-else v-for="(item, index) in items" 
                                :key="item.name" 
                                :class="{'row-selected': selectedItems.includes(item.name)}">
                                <td class="text-center">
                                    <input type="checkbox" 
                                        :value="item.name" 
                                        v-model="selectedItems">
                                </td>
                                <td class="text-center text-muted">
                                    {{ (currentPage - 1) * pageSize + index + 1 }}
                                </td>
                                <td>
                                    <div class="product-info">
                                        <strong>{{ item.name1 || '-' }}</strong>
                                        <small>{{ item.code }}</small>
                                    </div>
                                </td>
                                <td>{{ item.specifications || '-' }}</td>
                                <td>
                                    <span class="badge badge-secondary">{{ item.brand || '-' }}</span>
                                </td>
                                <td>
                                    <span class="badge badge-info">{{ item.category || '-' }}</span>
                                </td>
                                <td>{{ item.store_id || '-' }}</td>
                                <td>
                                    <small class="text-muted">{{ item.task_id || '未关联' }}</small>
                                </td>
                                <td class="text-right">
                                    <input type="number" 
                                        class="form-control form-control-sm input-quantity"
                                        v-model.number="item.quantity"
                                        @focus="$event.target.select()"
                                        @blur="saveItem(item)"
                                        @keypress.enter="$event.target.blur()"
                                        min="0">
                                </td>
                                <td class="text-center">
                                    <button class="btn btn-sm btn-danger btn-icon" 
                                        @click="deleteItem(item)"
                                        title="删除">
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 分页 -->
                <div class="pagination-bar" v-if="total > 0">
                    <div class="pagination-info">
                        显示 {{ (currentPage - 1) * pageSize + 1 }} - 
                        {{ Math.min(currentPage * pageSize, total) }} 条，共 {{ total }} 条
                    </div>
                    <div class="pagination-controls">
                        <button class="btn btn-sm" 
                            :disabled="currentPage === 1" 
                            @click="changePage(1)">
                            ⏮️
                        </button>
                        <button class="btn btn-sm" 
                            :disabled="currentPage === 1" 
                            @click="changePage(currentPage - 1)">
                            ◀️
                        </button>
                        <span class="pagination-current">
                            {{ currentPage }} / {{ totalPages }}
                        </span>
                        <button class="btn btn-sm" 
                            :disabled="currentPage >= totalPages" 
                            @click="changePage(currentPage + 1)">
                            ▶️
                        </button>
                        <button class="btn btn-sm" 
                            :disabled="currentPage >= totalPages" 
                            @click="changePage(totalPages)">
                            ⏭️
                        </button>
                    </div>
                    <div class="pagination-jump">
                        <input type="number" 
                            v-model.number="jumpPage" 
                            class="form-control form-control-sm"
                            style="width: 60px;"
                            min="1" 
                            :max="totalPages"
                            @keyup.enter="changePage(jumpPage)">
                        <button class="btn btn-sm btn-default" @click="changePage(jumpPage)">
                            跳转
                        </button>
                    </div>
                </div>

            </div>
        `,
        setup() {
            const state = reactive({
                items: [],
                loading: false,
                isSaving: false,
                errorMsg: '',
                currentPage: 1,
                pageSize: 20,
                total: 0,
                jumpPage: 1,
                selectedItems: [],
                filters: {
                    storeId: '',
                    taskId: '',
                    brand: '',
                    category: ''
                },
                storeList: [],
                taskList: []
            });

            const totalPages = computed(() => Math.ceil(state.total / state.pageSize) || 1);
            
            const totalQuantity = computed(() => {
                return state.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
            });

            const isAllSelected = computed(() => {
                return state.items.length > 0 && state.selectedItems.length === state.items.length;
            });

// 在 Vue setup() 内部

            const initFiltersFromRoute = () => {
                const route = frappe.get_route();
                
                // 🔍 调试日志：看看原始路由是什么，解码后是什么
                console.log("原始路由参数:", route);

                // 🔥 核心修复：添加 decodeURIComponent
                // 如果 route[1] 存在，就解码；否则设为空字符串
                const storeIdFromRoute = route[1] ? decodeURIComponent(route[1]) : '';
                const taskIdFromRoute = route[2] ? decodeURIComponent(route[2]) : '';

                console.log("解码后应用:", storeIdFromRoute, taskIdFromRoute);

                state.filters.storeId = storeIdFromRoute;
                state.filters.taskId = taskIdFromRoute;
            };

            // 获取筛选器选项
            const loadFilterOptions = () => {
                // 🔥 修复：使用后端自定义方法获取去重后的选项
                frappe.call({
                    method: "product_sales_planning.planning_system.page.store_detail.store_detail.get_filter_options",
                    callback: (r) => {
                        if (r.message) {
                            state.storeList = r.message.stores || [];
                            state.taskList = r.message.tasks || [];
                        }
                    }
                });
            };

            // 应用筛选
            const applyFilters = () => {
                state.currentPage = 1;
                state.selectedItems = [];
                fetchData();
            };

            // 重置筛选
            const resetFilters = () => {
                state.filters = {
                    storeId: '',
                    taskId: '',
                    brand: '',
                    category: ''
                };
                applyFilters();
            };

            // 获取数据
            const fetchData = () => {
                state.loading = true;
                const start = (state.currentPage - 1) * state.pageSize;

                frappe.call({
                    method: "product_sales_planning.planning_system.page.store_detail.store_detail.get_store_commodity_data",
                    args: {
                        store_id: state.filters.storeId || null,
                        task_id: state.filters.taskId || null,
                        brand: state.filters.brand || null,
                        category: state.filters.category || null,
                        start: start,
                        page_length: state.pageSize
                    },
                    callback: (r) => {
                        state.loading = false;
                        if (r.message && !r.message.error) {
                            state.items = r.message.data || [];
                            state.total = r.message.total_count || 0;
                            state.errorMsg = '';
                        } else {
                            state.items = [];
                            state.total = 0;
                            if (r.message?.error) state.errorMsg = r.message.error;
                        }
                    },
                    error: (err) => {
                        state.loading = false;
                        state.errorMsg = "网络请求失败";
                        console.error("获取数据失败:", err);
                    }
                });
            };

            // 翻页
            const changePage = (page) => {
                if (page < 1 || page > totalPages.value) return;
                state.currentPage = page;
                state.jumpPage = page;
                fetchData();
                $('.data-table-wrapper').get(0)?.scrollIntoView({ behavior: 'smooth' });
            };

            // 全选/取消全选
            const toggleSelectAll = (e) => {
                if (e.target.checked) {
                    state.selectedItems = state.items.map(item => item.name);
                } else {
                    state.selectedItems = [];
                }
            };

            // 批量修改
            const batchEdit = () => {
                frappe.prompt([
                    {
                        label: '新数量',
                        fieldname: 'quantity',
                        fieldtype: 'Int',
                        reqd: 1,
                        description: '将选中的 ' + state.selectedItems.length + ' 个商品的数量统一修改为'
                    }
                ], (values) => {
                    frappe.dom.freeze("正在批量修改...");
                    
                    frappe.call({
                        method: "product_sales_planning.planning_system.page.store_detail.store_detail.batch_update_quantity",
                        args: {
                            names: state.selectedItems,
                            quantity: values.quantity
                        },
                        callback: (r) => {
                            frappe.dom.unfreeze();
                            if (r.message?.status === "success") {
                                frappe.show_alert({
                                    message: `✅ 成功修改 ${r.message.count} 条记录`,
                                    indicator: 'green'
                                });
                                state.selectedItems = [];
                                fetchData();
                            } else {
                                frappe.msgprint({
                                    title: "修改失败",
                                    message: r.message?.msg || "未知错误",
                                    indicator: "red"
                                });
                            }
                        }
                    });
                }, '批量修改数量', '确定');
            };

            // 批量删除
            const batchDelete = () => {
                frappe.confirm(
                    `确定要删除选中的 ${state.selectedItems.length} 个商品吗？`,
                    () => {
                        frappe.dom.freeze("正在批量删除...");
                        
                        frappe.call({
                            method: "product_sales_planning.planning_system.page.store_detail.store_detail.batch_delete_items",
                            args: {
                                names: state.selectedItems
                            },
                            callback: (r) => {
                                frappe.dom.unfreeze();
                                if (r.message?.status === "success") {
                                    frappe.show_alert({
                                        message: `✅ 成功删除 ${r.message.count} 条记录`,
                                        indicator: 'green'
                                    });
                                    state.selectedItems = [];
                                    fetchData();
                                }
                            }
                        });
                    }
                );
            };

            // 添加商品
// 在 setup() 内部

            const openProductListDialog = () => {
                // 1. 定义核心添加逻辑（作为回调函数）
                const processSelection = (targetStoreId, targetTaskId) => {
                    let dialog = new frappe.ui.form.MultiSelectDialog({
                        doctype: "Product List",
                        target: {},
                        setters: {
                            name1: null,
                            brand: null,
                            category: null
                        },
                        get_query() {
                            return { filters: {} };
                        },
                        add_filters_group: 0, // 是否允许用户自定义额外筛选
                        primary_action_label: "添加选中商品",
                        action(selections) {
                            if (!selections || selections.length === 0) {
                                frappe.msgprint("请选择至少一个商品");
                                return;
                            }

                            frappe.dom.freeze("正在添加 " + selections.length + " 个商品...");

                            frappe.call({
                                method: "product_sales_planning.planning_system.page.store_detail.store_detail.bulk_insert_commodity_schedule",
                                args: {
                                    store_id: targetStoreId, // 使用传入的目标ID
                                    task_id: targetTaskId,   // 使用传入的目标ID
                                    codes: selections
                                },
                                callback: function(r) {
                                    frappe.dom.unfreeze();
                                    if (cur_dialog) cur_dialog.hide();

                                    if (r.message?.status === "success") {
                                        frappe.show_alert({
                                            message: `✅ 成功向 [${targetStoreId}] 添加 ${r.message.count} 个商品`,
                                            indicator: 'green'
                                        }, 5);
                                        
                                        // 如果当前筛选器是空的，或者是当前操作的店铺，则刷新列表
                                        // 否则用户可能看不到刚加的数据，给予提示
                                        const isCurrentView = (!state.filters.storeId || state.filters.storeId === targetStoreId) &&
                                                            (!state.filters.taskId || state.filters.taskId === targetTaskId);
                                                            
                                        if (isCurrentView) {
                                            state.currentPage = 1;
                                            fetchData();
                                        } else {
                                            frappe.msgprint(`商品已添加，但当前筛选视图不同，请切换筛选器查看。`);
                                        }
                                    } else {
                                        frappe.msgprint({
                                            title: "添加失败",
                                            message: r.message?.msg || "未知错误",
                                            indicator: "red"
                                        });
                                    }
                                },
                                error: function(xhr) {
                                    frappe.dom.unfreeze();
                                    if (cur_dialog) cur_dialog.hide();
                                    frappe.msgprint({ title: "网络错误", message: "请求失败", indicator: "red" });
                                }
                            });
                        }
                    });
                };

                // 2. 检查当前是否具备必要的上下文 (店铺和任务)
                const currentStore = state.filters.storeId;
                const currentTask = state.filters.taskId;

                if (currentStore && currentTask) {
                    // A. 筛选器已选好：直接使用
                    processSelection(currentStore, currentTask);
                } else {
                    // B. 筛选器未选（或选了全部）：弹窗询问用户目标
                    const fields = [];
                    
                    if (!currentStore) {
                        fields.push({
                            label: '选择目标店铺',
                            fieldname: 'store_id',
                            fieldtype: 'Select',
                            options: state.storeList, // 使用 Vue state 中已加载的列表
                            reqd: 1
                        });
                    }
                    
                    if (!currentTask) {
                        fields.push({
                            label: '选择目标任务',
                            fieldname: 'task_id',
                            fieldtype: 'Select',
                            options: state.taskList, // 使用 Vue state 中已加载的列表
                            reqd: 1
                        });
                    }

                    frappe.prompt(fields, (values) => {
                        // 合并当前筛选器值和用户新输入的值
                        const finalStore = currentStore || values.store_id;
                        const finalTask = currentTask || values.task_id;
                        
                        processSelection(finalStore, finalTask);
                    }, '请补充添加信息', '下一步');
                }
            };

            // 保存单项
            const saveItem = (item) => {
                if (!item.name) return;
                state.isSaving = true;
                
                frappe.call({
                    method: "product_sales_planning.planning_system.page.store_detail.store_detail.update_line_item",
                    args: { 
                        name: item.name, 
                        field: 'quantity', 
                        value: item.quantity 
                    },
                    callback: () => { 
                        state.isSaving = false;
                        frappe.show_alert({
                            message: '✅ 已保存',
                            indicator: 'green'
                        }, 1);
                    },
                    error: () => { 
                        state.isSaving = false;
                        frappe.show_alert({
                            message: "❌ 保存失败",
                            indicator: "red"
                        }, 3);
                    }
                });
            };

            // 删除单项
            const deleteItem = (item) => {
                frappe.confirm(
                    `确定要删除商品 "${item.name1}" 吗？`,
                    () => {
                        frappe.call({
                            method: "frappe.client.delete",
                            args: {
                                doctype: "Commodity Schedule",
                                name: item.name
                            },
                            callback: (r) => {
                                frappe.show_alert({
                                    message: '✅ 已删除',
                                    indicator: 'green'
                                }, 2);
                                fetchData();
                            }
                        });
                    }
                );
            };

            onMounted(() => {
                initFiltersFromRoute();
                loadFilterOptions();
                fetchData();
            });

            page.set_secondary_action('🔄 刷新', () => {
                fetchData();
            });

            return {
                ...toRefs(state),
                totalPages,
                totalQuantity,
                isAllSelected,
                fetchData,
                changePage,
                initFiltersFromRoute,
                loadFilterOptions,
                applyFilters,
                resetFilters,
                toggleSelectAll,
                batchEdit,
                batchDelete,
                saveItem,
                deleteItem,
                openProductListDialog
            };
        }
    };

    const app = createApp(App);
    wrapper.vue_app = app.mount('#store-detail-app');
}

function inject_css() {
    const css = `
        .store-planning-container { padding: 20px; max-width: 100%; background: #f5f7fa; min-height: calc(100vh - 60px); }
        
        /* 筛选工具栏 */
        .filter-toolbar { background: #fff; border: 1px solid #ebeff3; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
        .filter-section { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 12px; }
        .filter-group { flex: 0 0 180px; }
        .filter-label { font-size: 12px; font-weight: 500; color: #6c757d; margin-bottom: 5px; display: block; }
        .filter-actions { display: flex; gap: 8px; align-items: flex-end; }
        .action-section { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
        
        /* 统计卡片 - 匹配列表页样式 */
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 20px; }
        .stat-card { 
            background: #fff; 
            border: 1px solid #ebeff3; 
            border-radius: 8px; 
            padding: 20px; 
            display: flex; 
            align-items: center; 
            gap: 15px;
            transition: box-shadow 0.2s;
        }
        .stat-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .stat-icon { 
            width: 48px; 
            height: 48px; 
            border-radius: 8px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 24px; 
        }
        .stat-info { flex: 1; }
        .stat-value { font-size: 28px; font-weight: 600; color: #212529; line-height: 1.2; }
        .stat-label { font-size: 11px; color: #868e96; text-transform: uppercase; font-weight: 500; margin-top: 5px; letter-spacing: 0.5px; }
        
        /* 图标背景色 - 匹配列表页 */
        .stat-primary .stat-icon { background: #e7f5ff; color: #1864ab; }
        .stat-success .stat-icon { background: #ebfbee; color: #2b8a3e; }
        .stat-info .stat-icon { background: #e3f2fd; color: #1976d2; }
        .stat-warning .stat-icon { background: #fff4e6; color: #f76707; }
        
        /* 数据表格 */
        .data-table-wrapper { background: #fff; border: 1px solid #ebeff3; border-radius: 8px; overflow: hidden; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table thead { background: #f8f9fa; }
        .data-table th { 
            padding: 12px 15px; 
            font-weight: 600; 
            font-size: 12px; 
            text-align: left; 
            border-bottom: 1px solid #dee2e6; 
            color: #495057; 
        }
        .data-table tbody tr { border-bottom: 1px solid #f1f3f5; transition: background 0.15s; }
        .data-table tbody tr:hover { background: #f8f9fa; }
        .data-table tbody tr.row-selected { background: #e8f4fd; }
        .data-table td { padding: 12px 15px; font-size: 14px; color: #343a40; vertical-align: middle; }
        .product-info strong { display: block; color: #212529; margin-bottom: 3px; font-weight: 600; }
        .product-info small { color: #868e96; font-size: 12px; }
        .input-quantity { 
            text-align: right; 
            font-weight: 600; 
            color: #1864ab; 
            border: 1px solid #ced4da; 
            border-radius: 4px; 
            padding: 5px 10px;
            background: #fff;
        }
        .input-quantity:focus { 
            border-color: #1971c2; 
            box-shadow: 0 0 0 3px rgba(24, 100, 171, 0.1); 
            outline: none; 
        }
        .btn-icon { padding: 5px 10px; border-radius: 4px; }
        
        /* Badge 样式 */
        .badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
        .badge-secondary { background: #f1f3f5; color: #495057; border: 1px solid #dee2e6; }
        .badge-info { background: #e7f5ff; color: #1864ab; border: 1px solid #a5d8ff; }
        
        /* 空状态和加载状态 */
        .loading-state, .empty-state { text-align: center; padding: 60px 20px; }
        .loading-state p, .empty-state p { color: #868e96; margin: 15px 0; font-size: 14px; }
        .empty-icon { font-size: 48px; opacity: 0.4; margin-bottom: 15px; }
        
        /* 分页 */
        .pagination-bar { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 15px 20px; 
            background: #fff; 
            border: 1px solid #ebeff3; 
            border-top: none; 
            border-radius: 0 0 8px 8px; 
        }
        .pagination-info { color: #868e96; font-size: 13px; }
        .pagination-controls { display: flex; gap: 5px; }
        .pagination-controls .btn { 
            min-width: 34px; 
            height: 34px; 
            padding: 0 10px; 
            border: 1px solid #dee2e6; 
            background: #fff; 
            border-radius: 4px; 
            font-size: 14px; 
            color: #495057;
        }
        .pagination-controls .btn:hover:not(:disabled) { background: #f8f9fa; border-color: #adb5bd; }
        .pagination-controls .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pagination-current { 
            padding: 7px 15px; 
            background: #f8f9fa; 
            border: 1px solid #dee2e6; 
            border-radius: 4px; 
            font-weight: 600; 
            color: #495057; 
            font-size: 13px; 
            display: inline-flex; 
            align-items: center; 
        }
        .pagination-jump { display: flex; gap: 5px; align-items: center; }
        .pagination-jump input { 
            width: 55px; 
            height: 34px; 
            text-align: center; 
            border: 1px solid #dee2e6; 
            border-radius: 4px; 
            font-size: 13px;
        }
        
        /* Alert 样式 */
        .alert { border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; border: 1px solid transparent; }
        .alert-danger { background: #fff5f5; border-color: #ffc9c9; color: #c92a2a; }
        
        /* 按钮样式 - 匹配系统风格 */
        .btn-sm { 
            padding: 7px 14px; 
            font-size: 13px; 
            border-radius: 4px; 
            font-weight: 500; 
            border: 1px solid transparent;
            transition: all 0.15s;
        }
        .btn-primary { background: #1864ab; border-color: #1864ab; color: #fff; }
        .btn-primary:hover { background: #1971c2; border-color: #1971c2; }
        .btn-success { background: #2f9e44; border-color: #2f9e44; color: #fff; }
        .btn-success:hover { background: #37b24d; border-color: #37b24d; }
        .btn-warning { background: #f76707; border-color: #f76707; color: #fff; }
        .btn-warning:hover { background: #fd7e14; border-color: #fd7e14; }
        .btn-danger { background: #fa5252; border-color: #fa5252; color: #fff; }
        .btn-danger:hover { background: #ff6b6b; border-color: #ff6b6b; }
        .btn-default { background: #fff; border: 1px solid #ced4da; color: #495057; }
        .btn-default:hover { background: #f8f9fa; border-color: #adb5bd; }
        
        /* 表单控件 */
        .form-control-sm { 
            height: 34px; 
            padding: 5px 10px; 
            font-size: 13px; 
            border: 1px solid #ced4da; 
            border-radius: 4px;
        }
        .form-control-sm:focus { 
            border-color: #1971c2; 
            box-shadow: 0 0 0 3px rgba(24, 100, 171, 0.1); 
            outline: none;
        }
        
        /* 响应式 */
        @media (max-width: 1400px) {
            .stats-row { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
            .filter-section { flex-direction: column; }
            .filter-group { flex: 1 1 100%; }
            .stats-row { grid-template-columns: 1fr; }
            .action-section { justify-content: flex-start; }
        }
    `;
    $('<style>').text(css).appendTo('head');
}