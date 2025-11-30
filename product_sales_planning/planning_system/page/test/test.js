frappe.pages['test'].on_page_load = function(wrapper) {
    let page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Vue + Element Plus Demo',
        single_column: true
    });

    // 资源 CDN 地址
    const resources = {
        vue: 'https://unpkg.com/vue@3.4.21/dist/vue.global.prod.js',
        elementJS: 'https://unpkg.com/element-plus@2.5.6/dist/index.full.min.js',
        elementCSS: 'https://unpkg.com/element-plus@2.5.6/dist/index.css'
    };

    // 加载资源的辅助函数
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // 检查是否已加载
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
    }

    function loadCSS(href) {
        return new Promise((resolve) => {
            if (document.querySelector(`link[href="${href}"]`)) {
                resolve();
                return;
            }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = resolve;
            document.head.appendChild(link);
        });
    }

    // 初始化 Vue 应用
    function initVueApp() {
        // ✅ 使用 jQuery 方法添加容器
        page.main.html('<div id="vue-app"></div>');

        // 等待 DOM 渲染
        setTimeout(() => {
            const { createApp } = Vue;
            const ElementPlus = window.ElementPlus;

            const app = createApp({
                data() {
                    return {
                        searchText: '',
                        tableData: [],
                        dialogVisible: false,
                        currentRow: null,
                        loading: false
                    };
                },
                methods: {
                    async fetchData() {
                        this.loading = true;
                        try {
                            const res = await frappe.call({
                                method: 'frappe.client.get_list',
                                args: {
                                    doctype: 'User',
                                    fields: ['name', 'full_name', 'email', 'enabled'],
                                    filters: { enabled: 1 },
                                    limit: 20,
                                    order_by: 'creation desc'
                                }
                            });
                            
                            this.tableData = res.message || [];
                            ElementPlus.ElMessage({
                                message: `成功加载 ${this.tableData.length} 条数据`,
                                type: 'success'
                            });
                        } catch (error) {
                            console.error('数据加载失败:', error);
                            ElementPlus.ElMessage.error('数据加载失败: ' + error.message);
                        } finally {
                            this.loading = false;
                        }
                    },
                    
                    handleSearch() {
                        if (!this.searchText.trim()) {
                            ElementPlus.ElMessage.warning('请输入搜索内容');
                            return;
                        }
                        
                        this.loading = true;
                        frappe.call({
                            method: 'frappe.client.get_list',
                            args: {
                                doctype: 'User',
                                fields: ['name', 'full_name', 'email'],
                                filters: [
                                    ['User', 'enabled', '=', 1],
                                    ['User', 'name', 'like', `%${this.searchText}%`]
                                ],
                                or_filters: [
                                    ['User', 'email', 'like', `%${this.searchText}%`],
                                    ['User', 'full_name', 'like', `%${this.searchText}%`]
                                ]
                            }
                        }).then(res => {
                            this.tableData = res.message || [];
                            this.loading = false;
                        }).catch(err => {
                            ElementPlus.ElMessage.error('搜索失败');
                            this.loading = false;
                        });
                    },
                    
                    viewDetail(row) {
                        this.currentRow = row;
                        this.dialogVisible = true;
                    },
                    
                    openDoc(row) {
                        frappe.set_route('Form', 'User', row.name);
                    },
                    
                    createNew() {
                        frappe.new_doc('User');
                    }
                },
                
                mounted() {
                    console.log('Vue 应用已挂载');
                    this.fetchData();
                },
                
                template: `
                    <div style="padding: 20px;">
                        <!-- 搜索栏 -->
                        <el-row :gutter="20" style="margin-bottom: 20px;">
                            <el-col :span="16">
                                <el-input 
                                    v-model="searchText" 
                                    placeholder="搜索用户名、邮箱或全名"
                                    clearable
                                    @keyup.enter="handleSearch"
                                >
                                    <template #prepend>
                                        <el-icon><i class="fa fa-search"></i></el-icon>
                                    </template>
                                    <template #append>
                                        <el-button 
                                            type="primary" 
                                            @click="handleSearch"
                                            :loading="loading"
                                        >
                                            搜索
                                        </el-button>
                                    </template>
                                </el-input>
                            </el-col>
                            <el-col :span="8" style="text-align: right;">
                                <el-button type="success" @click="createNew">
                                    <i class="fa fa-plus"></i> 新建
                                </el-button>
                                <el-button @click="fetchData" :loading="loading">
                                    <i class="fa fa-refresh"></i> 刷新
                                </el-button>
                            </el-col>
                        </el-row>

                        <!-- 数据表格 -->
                        <el-table 
                            :data="tableData" 
                            stripe 
                            border
                            v-loading="loading"
                            style="width: 100%"
                            height="500"
                        >
                            <el-table-column 
                                type="index" 
                                label="#" 
                                width="60" 
                            />
                            <el-table-column 
                                prop="name" 
                                label="用户名" 
                                width="200"
                                sortable
                            />
                            <el-table-column 
                                prop="full_name" 
                                label="全名" 
                                width="200" 
                            />
                            <el-table-column 
                                prop="email" 
                                label="邮箱"
                                min-width="250"
                            />
                            <el-table-column 
                                prop="enabled" 
                                label="状态" 
                                width="100"
                            >
                                <template #default="scope">
                                    <el-tag :type="scope.row.enabled ? 'success' : 'danger'">
                                        {{ scope.row.enabled ? '启用' : '禁用' }}
                                    </el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column 
                                label="操作" 
                                width="180"
                                fixed="right"
                            >
                                <template #default="scope">
                                    <el-button 
                                        size="small" 
                                        type="primary"
                                        @click="openDoc(scope.row)"
                                    >
                                        编辑
                                    </el-button>
                                    <el-button 
                                        size="small" 
                                        @click="viewDetail(scope.row)"
                                    >
                                        详情
                                    </el-button>
                                </template>
                            </el-table-column>
                        </el-table>

                        <!-- 详情对话框 -->
                        <el-dialog 
                            v-model="dialogVisible" 
                            title="用户详情" 
                            width="600px"
                        >
                            <el-descriptions 
                                v-if="currentRow" 
                                :column="1" 
                                border
                            >
                                <el-descriptions-item label="用户名">
                                    {{ currentRow.name }}
                                </el-descriptions-item>
                                <el-descriptions-item label="全名">
                                    {{ currentRow.full_name }}
                                </el-descriptions-item>
                                <el-descriptions-item label="邮箱">
                                    {{ currentRow.email }}
                                </el-descriptions-item>
                                <el-descriptions-item label="状态">
                                    <el-tag :type="currentRow.enabled ? 'success' : 'danger'">
                                        {{ currentRow.enabled ? '已启用' : '已禁用' }}
                                    </el-tag>
                                </el-descriptions-item>
                            </el-descriptions>
                            <template #footer>
                                <el-button @click="dialogVisible = false">
                                    关闭
                                </el-button>
                                <el-button 
                                    type="primary" 
                                    @click="openDoc(currentRow)"
                                >
                                    编辑文档
                                </el-button>
                            </template>
                        </el-dialog>
                    </div>
                `
            });

            // 注册 Element Plus 组件
            app.use(ElementPlus);
            
            // 挂载应用
            app.mount('#vue-app');
            
            console.log('✅ Vue + Element Plus 初始化完成');
        }, 100);
    }

    // 加载资源并初始化
    Promise.all([
        loadCSS(resources.elementCSS),
        loadScript(resources.vue),
        loadScript(resources.elementJS)
    ])
    .then(() => {
        console.log('✅ 所有资源加载完成');
        initVueApp();
    })
    .catch(error => {
        console.error('❌ 资源加载失败:', error);
        frappe.msgprint({
            title: '加载失败',
            message: '无法加载 Vue 或 Element Plus 资源，请检查网络连接',
            indicator: 'red'
        });
    });
};

// 页面显示时触发
frappe.pages['test'].on_page_show = function(wrapper) {
    console.log('页面已显示');
};