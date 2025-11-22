frappe.pages['store-detail'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: '店铺规划详情',
        single_column: true
    });

    // 1. 返回按钮
    page.set_secondary_action('← 返回看板', function() {
        frappe.set_route('demo-page');
    });

    // 2. 页面显示监听
    wrapper.page.on_show = function() {
        const route = frappe.get_route();
        const store_id = route[1]; // 获取传递的店铺ID

        if (store_id) {
            page.set_title(`${store_id} - 选品明细`);
            load_commodity_list(wrapper, store_id);
        } else {
            page.set_title('店铺详情');
            $(wrapper).find('.layout-main-section').html('<div class="alert alert-warning">未选择店铺</div>');
        }
    };
};

function load_commodity_list(wrapper, store_id) {
    const $body = $(wrapper).find('.layout-main-section');
    // 保持骨架屏或Loading状态
    $body.html('<div class="text-center text-muted" style="padding:50px;">正在加载数据...</div>');

    frappe.call({
        method: "product_sales_planning.planning_system.page.store_detail.get_store_commodity_data",
        args: { store_id: store_id },
        callback: function(r) {
            const list = r.message || [];
            // 确保 datatable 库已加载后再渲染
            frappe.require("datatable", function() {
                render_datatable($body, list);
            });
        }
    });
}

function render_datatable($container, list) {
    // 1. 计算顶部统计数据
    const total_sku = list.length;
    const total_qty = list.reduce((sum, item) => sum + (item.qty || 0), 0);

    // 2. 准备 DOM 结构
    // 我们保留顶部的统计卡片，下面放 DataTable 的容器
    const layout_html = `
        <div style="padding: 15px;">
            <div class="flex-row" style="display:flex; gap:15px; margin-bottom:20px;">
                <div class="stat-box">
                    <div class="text-muted small">规划 SKU</div>
                    <div class="stat-num">${total_sku}</div>
                </div>
                <div class="stat-box">
                    <div class="text-muted small">总规划件数</div>
                    <div class="stat-num text-primary">${total_qty}</div>
                </div>
            </div>

            <div class="datatable-card">
                <div id="commodity-datatable"></div>
            </div>
        </div>

        <style>
            .stat-box { background:#fff; padding:15px 20px; border-radius:8px; border:1px solid #EBF1F5; flex:1; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
            .stat-num { font-size:24px; font-weight:bold; color:#333; margin-top:5px; }
            .text-primary { color: #228BE6 !important; }
            .datatable-card { background:#fff; border:1px solid #EBF1F5; border-radius:8px; overflow:hidden; padding: 10px 0; }
            /* 调整 datatable 样式以适配 */
            .dt-cell__content { font-size: 13px; }
            .dt-header { background-color: #F8F9FA; font-weight: 600; color: #777; }
        </style>
    `;

    $container.html(layout_html);

    if (list.length === 0) {
        $('#commodity-datatable').html('<div class="text-center text-muted" style="padding:30px;">暂无数据</div>');
        return;
    }

    // 3. 配置并初始化 DataTable
    const datatable = new frappe.DataTable('#commodity-datatable', {
        columns: [
            {
                name: '产品信息',
                id: 'name1', // 对应数据中的 key
                editable: false,
                width: 280,
                // 自定义格式化：同时显示产品名和昵称
                format: (value, row) => {
                    const nickname = row.nickname ? `<span style="color:#999; font-size:12px; margin-left:5px;">(${row.nickname})</span>` : '';
                    return `<div style="font-weight:500; color:#333;">${value || '-'}</div>${nickname}`;
                }
            },
            {
                name: '规格',
                id: 'specifications',
                editable: false,
                width: 120
            },
            {
                name: '品牌',
                id: 'brand',
                editable: false,
                width: 100,
                format: (value) => value ? `<span style="background:#F1F3F5; padding:2px 6px; border-radius:4px; font-size:11px;">${value}</span>` : '-'
            },
            {
                name: '系列',
                id: 'series',
                editable: false,
                width: 120
            },
            {
                name: '类别',
                id: 'category',
                editable: false,
                width: 100
            },
            {
                name: '数量',
                id: 'qty',
                editable: false, // 如果你想让用户直接在这里修改数量，可以设为 true
                width: 100,
                align: 'right',
                format: (value) => `<span style="font-weight:bold; color:#228BE6;">${value}</span>`
            }
        ],
        data: list,
        layout: 'fluid', // 宽度自适应
        cellHeight: 45,  // 稍微调高一点行高
        noDataMessage: '暂无规划数据'
    });
}