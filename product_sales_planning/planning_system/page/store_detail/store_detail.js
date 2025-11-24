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
    
    // 注入 CSS (包含 Vxe-table 的样式)
    inject_css();

    // 定义资源路径 (假设你通过 npm 安装到了 node_modules，或者你可以下载文件放到 public/js 下)
    // 如果没有 node_modules，可以使用 CDN 链接测试，或者将文件上传到 assets 目录
    const assets = [
        "/assets/frappe/node_modules/vue/dist/vue.global.js",
        "/assets/frappe/node_modules/xe-utils/dist/xe-utils.umd.min.js",
        "/assets/frappe/node_modules/vxe-table/lib/index.umd.js",
        "/assets/frappe/node_modules/vue/dist/vue.global.js"
    ];

    // 1. 先判断全局是否有 Vue
    // if (window.Vue) {
    //     init_vue_app(wrapper, page);
    // } else {
    //     // 2. 如果没有，使用完整的 .js 路径加载
    //     frappe.require("/assets/frappe/node_modules/vue/dist/vue.global.js", function() {
    //         init_vue_app(wrapper, page);
    //     });
    // }

    // 链式加载：Vue -> XeUtils -> VxeTable
    frappe.require(assets, function() {
        init_vue_app(wrapper, page);
    });
};

// --- 页面显示逻辑：确保切回来时刷新 ---
frappe.pages['store-detail'].on_page_show = function(wrapper) {
    if (wrapper.vue_app && wrapper.vue_app.fetchData) {
        console.log("店铺详情页显示，正在刷新数据...");
        wrapper.vue_app.fetchData();
    }
};

// --- 2. Vue 应用逻辑 ---
function init_vue_app(wrapper, page) {
    // 防御性检查
    if (!window.Vue) {
        $(wrapper).find('#store-detail-app').html(
            `<div class="alert alert-danger">Vue 加载失败，请检查网络或资源路径。</div>`
        );
        return;
    }

    const { createApp, reactive, computed, onMounted, toRefs, watch } = window.Vue;

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
                            placeholder="🔍 搜索编码 (Enter查询)..." 
                            v-model="searchQuery"
                            @keyup.enter="handleSearch"
                        >
                    </div>
                </div>

                <div class="stats-row">
                    <div class="stat-box">
                        <div class="stat-label">本页 SKU</div>
                        <div class="stat-value">{{ items.length }}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">本页总件数</div>
                        <div class="stat-value text-blue">{{ totalQuantity }}</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-label">总记录数</div>
                        <div class="stat-value">{{ total }}</div>
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
                        <p>请点击上方"添加商品"切换回列表模式，或在此处开发机制录入界面。</p>
                    </div>

                    <table v-else class="table table-bordered table-hover mb-0">
                        <thead>
                            <tr class="bg-light">
                                <th width="50" class="text-center">#</th>
                                <th>产品名称</th>
                                <th width="150">规格</th>
                                <th width="120">品牌</th>
                                <th width="120">类别</th>
                                <th width="150" class="text-right">数量</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-if="items.length === 0">
                                <td colspan="6" class="text-center p-5 text-muted">暂无数据</td>
                            </tr>
                            <tr v-else v-for="(item, index) in items" :key="item.name">
                                <td class="text-center align-middle">{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                                <td class="align-middle">
                                    <div class="font-weight-bold text-dark">{{ item.name1 || '-' }}</div>
                                    <small class="text-muted">{{ item.code }}</small>
                                </td>
                                <td class="align-middle">{{ item.specifications }}</td>
                                <td class="align-middle">{{ item.brand }}</td>
                                <td class="align-middle">{{ item.category }}</td>
                                <td class="text-right align-middle">
                                    <input type="number" 
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

                <div class="pagination-wrapper d-flex justify-content-between align-items-center mt-3" v-if="total > 0 && entryMode === 'item'">
                    <div class="text-muted small">
                        显示 {{ (currentPage - 1) * pageSize + 1 }} 到 {{ Math.min(currentPage * pageSize, total) }} 条，共 {{ total }} 条
                    </div>
                    <nav>
                        <ul class="pagination pagination-sm mb-0">
                            <li class="page-item" :class="{ disabled: currentPage === 1 }">
                                <button class="page-link" @click="changePage(currentPage - 1)">上一页</button>
                            </li>
                            <li class="page-item active">
                                <span class="page-link">{{ currentPage }} / {{ totalPages }}</span>
                            </li>
                            <li class="page-item" :class="{ disabled: currentPage >= totalPages }">
                                <button class="page-link" @click="changePage(currentPage + 1)">下一页</button>
                            </li>
                        </ul>
                    </nav>
                </div>

            </div>
        `,
        setup() {
            const state = reactive({
                items: [],
                loading: false,
                isSaving: false,
                errorMsg: '',
                entryMode: 'item', // 'item' or 'mechanism'
                // --- 分页状态 ---
                searchQuery: '',
                currentPage: 1,
                pageSize: 20, 
                total: 0
            });

            // 计算属性
            const totalPages = computed(() => Math.ceil(state.total / state.pageSize) || 1);
            
            const totalQuantity = computed(() => {
                return state.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
            });

            // --- 1. 获取数据 ---
            const fetchData = () => {
                const route = frappe.get_route();
                const storeId = route[1];
                
                if (!storeId) return;
                
                // 如果在机制模式下，不加载列表数据（视需求而定）
                if (state.entryMode === 'mechanism') return;

                state.loading = true;
                const start = (state.currentPage - 1) * state.pageSize;

                frappe.call({
                    method: "product_sales_planning.planning_system.page.store_detail.store_detail.get_store_commodity_data",
                    args: { 
                        store_id: storeId,
                        start: start,
                        page_length: state.pageSize,
                        search_term: state.searchQuery 
                    },
                    callback: (r) => {
                        state.loading = false;
                        if (r.message && !r.message.error) {
                            state.items = r.message.data || [];
                            state.total = r.message.total_count || 0;
                        } else {
                            state.items = [];
                            state.total = 0;
                            if (r.message && r.message.error) state.errorMsg = r.message.error;
                        }
                    },
                    error: () => {
                        state.loading = false;
                        state.errorMsg = "网络请求失败，请检查控制台";
                    }
                });
            };

            // --- 2. 交互操作 ---
            const changePage = (page) => {
                if (page < 1 || page > totalPages.value) return;
                state.currentPage = page;
                fetchData();
            };

            const handleSearch = () => {
                state.currentPage = 1;
                fetchData();
            };

            // 监听搜索清空
            watch(() => state.searchQuery, (newVal) => {
                if (newVal === '') handleSearch();
            });

            // --- 3. 切换到机制录入模式 ---
            const openMechanismDialog = () => {
                // 切换模式
                state.entryMode = state.entryMode === 'mechanism' ? 'item' : 'mechanism';
                
                // 如果切回列表，重新加载数据
                if (state.entryMode === 'item') {
                    fetchData();
                }
            };

            // --- 4. 添加商品 (已修复) ---
           // --- 4. 添加商品 (修复版) ---
            const openProductListDialog = () => {
                // 强制切回列表模式
                state.entryMode = 'item'; 

                const route = frappe.get_route();
                const storeId = route[1];
                const parentId = route[2]; // <--- 获取 task_id (父级任务ID)

                if (!storeId) {
                    frappe.msgprint("无法获取店铺ID");
                    return;
                }

                new frappe.ui.form.MultiSelectDialog({
                    doctype: "Product List",
                    target: null, // <--- 修复：Vue setup 中 this 为 undefined，改为 null
                    setters: {
                        name1: null,
                        brand: null,
                        category: null
                    },
                    primary_action_label: "添加选中商品",
                    action(selections) {
                        if (!selections || selections.length === 0) {
                            frappe.msgprint("请选择至少一个商品");
                            return;
                        }

                        frappe.dom.freeze("正在添加商品...");

                        frappe.call({
                            method: "product_sales_planning.planning_system.page.store_detail.store_detail.bulk_insert_commodity_schedule",
                            args: {
                                store_id: storeId,
                                task_id: parentId, // <--- 修复：传入 task_id
                                codes: selections
                            },
                            callback: function(r) {
                                frappe.dom.unfreeze();
                                if (cur_dialog) cur_dialog.hide(); // 安全关闭弹窗

                                if (r.message && r.message.status === "success") {
                                    frappe.show_alert({
                                        message: `成功添加 ${r.message.count} 个商品`, 
                                        indicator: 'green'
                                    });

                                    if (r.message.errors && r.message.errors.length > 0) {
                                        frappe.msgprint({
                                            title: "部分失败",
                                            message: r.message.errors.join("<br>"),
                                            indicator: "orange"
                                        });
                                    }

                                    // 刷新数据
                                    state.searchQuery = ''; 
                                    state.currentPage = 1;  
                                    fetchData();            
                                } else {
                                    frappe.msgprint({
                                        title: "添加失败",
                                        message: r.message ? (r.message.msg || "未知错误") : "服务器无响应",
                                        indicator: "red"
                                    });
                                }
                            },
                            error: function(r) {
                                frappe.dom.unfreeze();
                                console.error("API Error", r);
                                frappe.msgprint({
                                    title: "系统错误",
                                    message: "请求失败，请查看控制台日志",
                                    indicator: "red"
                                });
                            }
                        });
                    }
                });
            };

            // --- 5. 自动保存 ---
            const saveItem = (item) => {
                if (!item.name) return;
                state.isSaving = true;
                frappe.call({
                    method: "product_sales_planning.planning_system.page.store_detail.store_detail.update_line_item",
                    args: { name: item.name, field: 'quantity', value: item.quantity },
                    callback: () => { state.isSaving = false; },
                    error: () => { 
                        state.isSaving = false; 
                        frappe.show_alert({message: "保存失败", indicator: "red"});
                    }
                });
            };

            onMounted(() => {
                fetchData();
            });

            return {
                ...toRefs(state),
                totalPages,
                totalQuantity,
                fetchData,
                changePage,
                handleSearch,
                saveItem,
                openProductListDialog,
                openMechanismDialog
            };
        }
    };

    const app = createApp(App);
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
        
        .mode-switcher .btn { border: 1px solid #d1d8dd; background-color: #fff; color: #555; }
        .mode-switcher .btn-primary { background-color: #228be6; border-color: #228be6; color: #fff; }
        .mode-switcher .btn:hover { z-index: 2; }
    `;
    $('<style>').text(css).appendTo('head');
}