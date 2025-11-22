// --- 1. 页面首次加载：只搭建骨架 (执行1次) ---
frappe.pages['store-detail'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '店铺规划详情',
        single_column: true
    });

    page.set_secondary_action('刷新数据', function() {
        data_refresh(wrapper);
    }, 'refresh');

    // 预留内容容器
    $(wrapper).find('.layout-main-section').html(`
        <div id="store-detail-content"></div>
    `);
};

// --- 2. 页面每次显示：自动刷新数据 ---
frappe.pages['store-detail'].on_page_show = function(wrapper) {
    data_refresh(wrapper);
};

// --- 3. 核心数据加载函数 ---
function data_refresh(wrapper) {
    const $container = $(wrapper).find('#store-detail-content');
    const route = frappe.get_route();
    console.log(route);
    const store_id = route[1];

    if (!store_id) {
        $container.html('<div class="alert alert-warning">⚠️ URL 中缺少店铺 ID</div>');
        wrapper.page.set_title('店铺详情 (无ID)');
        return;
    }

    
    
    // 简单 Loading
    $container.html(`
        <div class="text-center" style="padding: 50px; color: #777;">
            <div class="spinner-border spinner-border-sm" role="status"></div>
            <span style="margin-left: 10px;">正在同步最新数据...</span>
        </div>
    `);

    frappe.call({
        method: "product_sales_planning.planning_system.page.store_detail.store_detail.get_store_commodity_data",
        args: { store_id: store_id },
        callback: function(r) {
            if (r.message && !r.message.error) {
                // wrapper.page.set_title(`${r.message[0].store_name} - 选品明细`);
                // 核心：确保 datatable 库加载后再渲染
                frappe.require("frappe-datatable.min.css", function() {
                    render_datatable_view($container, r.message);
                });
            } else {
                const err = r.message ? r.message.error : "无数据";
                $container.html(`<div class="alert alert-danger">查询失败: ${err}</div>`);
            }
        }
    });

    
}

// --- 4. 使用 DataTable 渲染 (替换了原来的 render_table) ---
function render_datatable_view($container, list) {
    // 空数据处理
    if (!list || list.length === 0) {
        $container.html(`
            <div class="empty-state" style="text-align: center; padding: 50px; background: #fff; border: 1px dashed #ddd; border-radius: 8px;">
                <div style="font-size: 24px; margin-bottom: 10px;">📭</div>
                <div style="color: #777;">该店铺暂无规划数据</div>
            </div>
        `);
        return;
    }

    // 统计总数
    const total_qty = list.reduce((sum, item) => sum + (item.quantity || 0), 0);

    // 1. 准备 DOM 结构：顶部统计 + 表格容器
    const layout_html = `
        <div style="padding: 15px;">
            <div style="display:flex; gap:15px; margin-bottom:15px;">
                 <div class="stats-box">
                    <div class="text-muted small">规划 SKU</div>
                    <div style="font-size:20px; font-weight:bold;">${list.length}</div>
                 </div>
                 <div class="stats-box">
                    <div class="text-muted small">总件数</div>
                    <div style="font-size:20px; font-weight:bold; color:#228BE6;">${total_qty}</div>
                 </div>
            </div>

            <div class="datatable-wrapper" style="background:#fff; border:1px solid #ebf1f5; border-radius:8px; padding:0;">
                <div id="commodity-datatable"></div>
            </div>
        </div>
        <style>
            .stats-box { background:#fff; border:1px solid #eee; padding:10px 20px; border-radius:6px; flex:1; }
            /* 微调 datatable 样式使其更紧凑 */
            .dt-cell__content { font-size: 13px; color: #333; }
            .dt-header { background-color: #f8f9fa !important; color: #666; font-weight: 600; }
        </style>
    `;

    $container.html(layout_html);

    // 2. 配置 DataTable 列
    const columns = [
        {
            name: '产品名称',
            id: 'name1',
            editable: false,
            width: 200,
            format: (value) => `<span style="font-weight:500; color:#333;">${value}</span>`
        },
        {
            name: '规格',
            id: 'specifications',
            editable: false,
            width: 140
        },
        {
            name: '品牌',
            id: 'brand',
            editable: false,
            width: 100
        },
        {
            name: '类别',
            id: 'category',
            editable: false,
            width: 100
        },
        {
            name: '数量',
            id: 'quantity',
            editable: false,
            width: 100,
            align: 'right',
            // 自定义格式：加粗蓝色
            format: (value) => `<span style="color:#228BE6; font-weight:bold;">${value}</span>`
        }
    ];

    // 3. 初始化 DataTable
    new frappe.DataTable('#commodity-datatable', {
        columns: columns,
        data: list,
        layout: 'fluid', // 宽度自适应
        cellHeight: 40,  // 行高
        serialNoColumn: true, // 显示序号列 (#)
        noDataMessage: '暂无数据'
    });
}