// product_sales_planning/planning_system/page/store_detail/store_detail.js

// --- 1. 页面入口 ---
frappe.pages['store-detail'].on_page_load = function(wrapper) {
    const page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '店铺规划 (Vue版)',
        single_column: true
    });

    // 预留挂载点
    $(wrapper).find('.layout-main-section').html(`
        <div id="store-detail-app">
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status"></div>
                <div class="mt-2 text-muted">正在连接 Vue 引擎...</div>
            </div>
        </div>
    `);

    // 注入 CSS
    inject_css();

    // 1. 先判断全局是否有 Vue
    if (window.Vue) {
        init_vue_app(wrapper, page);
    } else {
        // 2. 如果没有，使用完整的 .js 路径加载
        frappe.require("/assets/frappe/node_modules/vue/dist/vue.global.js", function() {
            init_vue_app(wrapper, page);
        });
    }
};

// --- 关键修改：页面显示逻辑 ---
frappe.pages['store-detail'].on_page_show = function(wrapper) {
    // 每次页面切换回来时，检查 Vue 实例是否存在并调用刷新方法
    if (wrapper.vue_app && wrapper.vue_app.fetchData) {
        console.log("店铺详情页显示，正在刷新数据...");
        wrapper.vue_app.fetchData();
    }
};

// --- 2. Vue 应用逻辑 ---
function init_vue_app(wrapper, page) {
    // 再次防御性检查
    if (!window.Vue) {
        $(wrapper).find('#store-detail-app').html(
            `<div class="alert alert-danger">Vue 加载失败，请检查网络或资源路径。</div>`
        );
        return;
    }

    const { createApp, reactive, computed, onMounted, toRefs } = window.Vue;

    const App = {
        template: `
            <div class="store-planning-container" style="padding: 15px;">
                
                <div class="toolbar-row mb-4 d-flex justify-content-between align-items-center">
                    <div class="btn-group mode-switcher" role="group">
                        <button type="button" 
                            class="btn" 
                            :class="entryMode === 'mechanism' ? 'btn-primary' : 'btn-default'"
                            @click="openMechanismDialog()">
                            ⚙️ 机制录入
                        </button>
                        <button type="button" 
                            class="btn btn-default"
                            @click="openProductListDialog()">
                            ➕ 添加商品
                        </button>
                    </div>

                    <div class="search-filter" style="width: 250px;">
                        <input type="text" 
                            class="form-control form-control-sm" 
                            placeholder="🔍 搜索产品名称/编码..." 
                            v-model="searchQuery">
                    </div>
                </div>

                <div class="stats-row">
                    <div class="stat-box">
                        <div class="stat-label">规划 SKU</div>
                        <div class="stat-value">{{ filteredItems.length }}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">总件数</div>
                        <div class="stat-value text-blue">{{ totalQuantity }}</div>
                    </div>
                    <div class="stat-box" :class="{'saving': isSaving}">
                        <div class="stat-label">同步状态</div>
                        <div class="stat-value status-text">
                            <span v-if="isSaving" class="text-warning">💾 保存中...</span>
                            <span v-else class="text-success">✅ 已同步</span>
                        </div>
                    </div>
                </div>

                <div v-if="errorMsg" class="alert alert-danger mt-3">{{ errorMsg }}</div>

                <div class="custom-table-wrapper mt-3">
                    
                    <div v-if="loading" class="text-center p-5">
                        <div class="spinner-border spinner-border-sm text-muted"></div> 数据加载中...
                    </div>

                    <div v-else-if="entryMode === 'mechanism'" class="p-5 text-center bg-light text-muted">
                        <h4 class="mt-2">⚙️ 机制录入模式</h4>
                        <p>在此处展示机制选择和批量录入界面 (开发中...)</p>
                    </div>

                    <table v-else class="table table-bordered table-hover mb-0">
                        <thead>
                            <tr class="bg-light">
                                <th width="50" class="text-center">#</th>
                                <th>产品名称</th>
                                <th width="150">规格</th>
                                <th width="120">品牌</th>
                                <th width="120">类别</th>
                                <th width="150" class="text-right">数量 (编辑)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="filteredItems.length === 0">
                                <td colspan="6" class="text-center p-5 text-muted">
                                    {{ items.length > 0 ? '未找到匹配的商品' : '暂无数据' }}
                                </td>
                            </tr>
                            <tr v-else v-for="(item, index) in filteredItems" :key="item.name || index">
                                <td class="text-center align-middle">{{ index + 1 }}</td>
                                <td class="align-middle">
                                    <div class="font-weight-bold text-dark">{{ item.name1 }}</div>
                                    <small class="text-muted">{{ item.code }}</small>
                                </td>
                                <td class="align-middle">{{ item.specifications }}</td>
                                <td class="align-middle">{{ item.brand }}</td>
                                <td class="align-middle">{{ item.category }}</td>
                                <td class="text-right align-middle">
                                    <input 
                                        type="number" 
                                        class="form-control input-sm text-right font-weight-bold text-blue border-0"
                                        style="background: transparent;"
                                        v-model.number="item.quantity"
                                        @focus="$event.target.select()"
                                        @blur="saveItem(item)"
                                        @keypress.enter="$event.target.blur()"
                                    >
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `,
        setup() {
            const state = reactive({
                items: [],
                loading: false,
                isSaving: false,
                errorMsg: '',
                entryMode: 'item',
                searchQuery: ''
            });

            const filteredItems = computed(() => {
                if (!state.searchQuery) return state.items;
                const query = state.searchQuery.toLowerCase();
                return state.items.filter(item => 
                    (item.name1 && item.name1.toLowerCase().includes(query)) || 
                    (item.code && item.code.toLowerCase().includes(query))
                );
            });

            const totalQuantity = computed(() => {
                return filteredItems.value.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
            });

            const openMechanismDialog = () => {
                const msd = new frappe.ui.form.MultiSelectDialog({
                    doctype: "Product Mechanism",
                    target: this,
                    setters: {
                        mechanism_name: null,
                        category: null
                    },
                    primary_action_label: "选择机制",
                    action(selections) {
                        console.log("Selected mechanisms:", selections);
                        frappe.show_alert({
                            message: __("已选择 {0} 个机制", [selections.length]),
                            indicator: 'green'
                        });
                        cur_dialog.hide();
                    }
                });
                msd.dialog.set_title("请选择产品机制");
            };

            // const openProductListDialog = () => {
            //     const msd1 = new frappe.ui.form.MultiSelectDialog({
            //         doctype: "Product List",
            //         target: this,
            //         setters: {
            //             name1: null,
            //             brand: null,
            //             specifications: null
            //         },
            //         primary_action_label: "添加商品",
            //         action(selections) {
            //             console.log("Selected products:", selections);
            //             frappe.show_alert({
            //                 message: __("已选择 {0} 个商品", [selections.length]),
            //                 indicator: 'green'
            //             });
            //             cur_dialog.hide();
            //         }
            //     });
            //     msd1.dialog.set_title("请选择产品列表");
            // };
            const openProductListDialog = () => {
                const msd1 = new frappe.ui.form.MultiSelectDialog({
                    doctype: "Product List",
                    target: this,
                    setters: {
                        name1: null,
                        brand: null,
                        specifications: null
                    },
                    primary_action_label: "添加商品",
                    action(selections) {
                        console.log("Selected products:", selections);
                        
                        // 获取当前店铺ID
                        const route = frappe.get_route();
                        const storeId = route[1];
                        
                        // 将选中的商品添加到 Commodity Schedule
                        if (selections && selections.length > 0) {
                            let successCount = 0;
                            let failCount = 0;
                            
                            selections.forEach((product_code, index) => {
                                frappe.call({
                                    method: "product_sales_planning.planning_system.page.store_detail.store_detail.insert_commodity_schedule",
                                    args: {
                                        store_id: storeId,
                                        code: product_code,
                                        quantity: 0 // 默认数量为0，用户可后续编辑
                                    },
                                    callback: function(r) {
                                        if (r.message && r.message.status === "success") {
                                            successCount++;
                                        } else {
                                            failCount++;
                                            console.error("Failed to add product:", product_code, r.message);
                                        }
                                        
                                        // 当所有请求都完成时，刷新数据并显示通知
                                        if (successCount + failCount === selections.length) {
                                            if (successCount > 0) {
                                                frappe.show_alert({
                                                    message: __("成功添加 {0} 个商品", [successCount]),
                                                    indicator: 'green'
                                                });
                                            }
                                            
                                            if (failCount > 0) {
                                                frappe.show_alert({
                                                    message: __("添加失败 {0} 个商品", [failCount]),
                                                    indicator: 'red'
                                                });
                                            }
                                            
                                            // 重新加载数据
                                            fetchData();
                                        }
                                    },
                                    error: function(err) {
                                        failCount++;
                                        console.error("Error adding product:", product_code, err);
                                        
                                        // 当所有请求都完成时，刷新数据并显示通知
                                        if (successCount + failCount === selections.length) {
                                            if (successCount > 0) {
                                                frappe.show_alert({
                                                    message: __("成功添加 {0} 个商品", [successCount]),
                                                    indicator: 'green'
                                                });
                                            }
                                            
                                            if (failCount > 0) {
                                                frappe.show_alert({
                                                    message: __("添加失败 {0} 个商品", [failCount]),
                                                    indicator: 'red'
                                                });
                                            }
                                            
                                            // 重新加载数据
                                            fetchData();
                                        }
                                    }
                                });
                            });
                        }
                        
                        cur_dialog.hide();
                    }
                });
                msd1.dialog.set_title("请选择产品列表");
            };

            const fetchData = () => {
                const route = frappe.get_route();
                const storeId = route[1];
                const parent_id = route[2]; // 虽然这里没用到，但保持获取
                
                if (!storeId) {
                    state.errorMsg = "未找到店铺 ID，请从列表页进入";
                    return;
                }

                state.loading = true;
                page.set_title(`${storeId} - 规划详情`);

                frappe.call({
                    method: "product_sales_planning.planning_system.page.store_detail.store_detail.get_store_commodity_data",
                    args: { store_id: storeId },
                    callback: (r) => {
                        state.loading = false;
                        if (r.message && !r.message.error) {
                            state.items = r.message;
                        } else {
                            state.items = [];
                            if (r.message && r.message.error) state.errorMsg = r.message.error;
                        }
                    },
                    error: (r) => {
                        state.loading = false;
                        state.errorMsg = "网络请求失败";
                    }
                });
            };

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
                    callback: (r) => {
                        state.isSaving = false;
                        if (r.exc) {
                            frappe.show_alert({message: '保存失败', indicator: 'red'});
                        }
                    }
                });
            };

            onMounted(() => {
                fetchData();
            });

            page.set_secondary_action('刷新', fetchData);

            // --- 关键修改：必须返回 fetchData 供外部调用 ---
            return {
                ...toRefs(state),
                totalQuantity,
                filteredItems,
                openMechanismDialog,
                openProductListDialog,
                saveItem,
                fetchData // <--- 必须在这里导出
            };
        }
    };

    const app = createApp(App);
    // --- 关键修改：保存 Vue 实例到 wrapper ---
    wrapper.vue_app = app.mount('#store-detail-app');
}

function inject_css() {
    const css = `
        .stats-row { display: flex; gap: 20px; margin-bottom: 20px; }
        .stat-box { background: #fff; border: 1px solid #ebf1f5; border-radius: 8px; padding: 15px 20px; flex: 1; display: flex; flex-direction: column; justify-content: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .stat-label { color: #6c757d; font-size: 12px; font-weight: 500; text-transform: uppercase; }
        .stat-value { font-size: 24px; font-weight: 700; color: #1f272e; margin-top: 5px; }
        .text-blue { color: #228be6 !important; }
        .custom-table-wrapper { background: #fff; border-radius: 8px; border: 1px solid #ebf1f5; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        input[type=number]:focus { background-color: #e7f5ff !important; outline: none; box-shadow: inset 0 0 0 1px #228be6; }
        
        /* 新增按钮组样式 */
        .mode-switcher .btn { border: 1px solid #d1d8dd; background-color: #fff; color: #555; }
        .mode-switcher .btn-primary { background-color: #228be6; border-color: #228be6; color: #fff; }
        .mode-switcher .btn:hover { z-index: 2; }
    `;
    $('<style>').text(css).appendTo('head');
}