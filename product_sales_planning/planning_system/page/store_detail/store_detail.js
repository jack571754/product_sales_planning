// product_sales_planning/planning_system/page/store_detail/store_detail.js
// 主入口文件：负责资源加载和 Frappe 页面生命周期管理

// 1. 页面加载入口 (只执行一次)
frappe.pages['store-detail'].on_page_load = function(wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: '商品规划管理',
		single_column: true
	});

	// 显示初始加载状态
	$(wrapper).find('.layout-main-section').html(`
		<div id="store-detail-app">
			<div class="text-center p-5">
				<div class="spinner-border text-primary" role="status"></div>
				<div class="mt-2 text-muted">正在加载资源...</div>
				<div class="mt-2 text-muted" style="font-size: 12px;">请稍候，正在初始化页面组件...</div>
			</div>
		</div>
	`);

	// 注入 CSS（优先加载）
	injectCSS();

	// 加载资源并初始化
	loadAssets()
		.then(() => {
			console.log('✅ 资源加载完成，初始化 Vue 应用');
			// 初始化 Vue 应用（从 store_detail_vue.js）
			wrapper.vue_app = window.initStoreDetailVueApp(wrapper, page);
		})
		.catch((error) => {
			console.error('❌ 资源加载失败:', error);
			showErrorState(wrapper, error);
		});
};

// 2. 页面显示入口 (路由变化、切换Tab都会触发)
frappe.pages['store-detail'].on_page_show = function(wrapper) {
	if (wrapper.vue_app && wrapper.vue_app.refreshFromRoute) {
		// 跳过首次加载（构造函数已经调用了 refreshFromRoute）
		if (wrapper.vue_app.isFirstLoad) {
			console.log('⏭️ 跳过 on_page_show 调用（首次加载）');
			wrapper.vue_app.isFirstLoad = false;
			return;
		}

		// 避免在页面加载期间重复调用
		if (!wrapper.vue_app.isLoading) {
			wrapper.vue_app.refreshFromRoute();
		} else {
			console.log('⏭️ 跳过 on_page_show 调用（正在加载中）');
		}
	}
};

// 3. 页面卸载（清理资源）
frappe.pages['store-detail'].on_page_unload = function(wrapper) {
	if (wrapper.vue_app) {
		// 销毁 Handsontable 实例
		if (wrapper.vue_app.hotInstance) {
			wrapper.vue_app.hotInstance.destroy();
		}
		// 卸载 Vue 应用
		if (wrapper.vue_app.unmount) {
			wrapper.vue_app.unmount();
		}
		wrapper.vue_app = null;
	}
};

// 加载资源函数
function loadAssets() {
	return new Promise((resolve, reject) => {
		// 检查是否已加载
		if (window.Handsontable && window.Vue && window.initStoreDetailVueApp) {
			console.log('✅ 资源已加载');
			resolve();
			return;
		}

		// 定义资源列表
		const assets = [
			'/assets/product_sales_planning/js/lib/handsontable.full.min.css',
			'/assets/product_sales_planning/js/lib/handsontable.full.min.js',
			'/assets/product_sales_planning/js/lib/vue.global.prod.js',
			'/assets/product_sales_planning/js/store_detail_vue.js'
		];

		// 使用 frappe.require 加载资源
		frappe.require(assets, () => {
			// 验证资源是否加载成功
			if (window.Handsontable && window.Vue && window.initStoreDetailVueApp) {
				console.log('✅ 所有资源加载成功');
				resolve();
			} else {
				const missing = [];
				if (!window.Handsontable) missing.push('Handsontable');
				if (!window.Vue) missing.push('Vue');
				if (!window.initStoreDetailVueApp) missing.push('initStoreDetailVueApp');
				reject(new Error(`资源加载失败，缺少: ${missing.join(', ')}`));
			}
		});

		// 设置超时（30秒）
		setTimeout(() => {
			reject(new Error('资源加载超时（30秒），请检查网络或刷新页面'));
		}, 30000);
	});
}

// 显示错误状态
function showErrorState(wrapper, error) {
	$(wrapper).find('#store-detail-app').html(`
		<div class="alert alert-danger m-5">
			<h4>资源加载失败</h4>
			<p>${error.message || '未知错误'}</p>
			<p class="text-muted">可能原因：</p>
			<ul class="text-muted">
				<li>网络连接不稳定</li>
				<li>浏览器版本过低（建议使用Chrome 90+、Firefox 88+、Edge 90+）</li>
				<li>静态资源文件缺失</li>
			</ul>
			<button class="btn btn-primary" onclick="location.reload()">刷新页面</button>
		</div>
	`);
}

// 注入 CSS 样式
function injectCSS() {
	// 防止重复注入
	if (document.getElementById('store-detail-css')) {
		return;
	}

	const css = `
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

		/* Handsontable 表格容器样式 */
		.datatable-container {
			flex: 1;
			background: #fff;
			border-radius: 6px;
			box-shadow: 0 1px 2px rgba(0,0,0,0.05);
			overflow: hidden;
			min-height: 400px;
		}

		#hot-container {
			width: 100%;
			height: 100%;
		}

		/* 操作按钮样式 */
		.action-buttons {
			display: flex;
			gap: 8px;
			justify-content: flex-end;
			align-items: center;
			margin-bottom: 10px;
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
			margin-bottom: 10px;
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

		/* 审批状态显示区域 */
		.approval-status-area {
			margin-top: 10px;
		}
		.approval-status-area .alert {
			margin-bottom: 0;
		}

		/* 高级筛选区域 */
		.advanced-filters-section {
			margin-bottom: 10px;
		}
		.advanced-filters-panel {
			background: #f8f9fa;
			padding: 15px;
			border-radius: 6px;
			margin-top: 10px;
			border: 1px solid #e3e6ea;
		}
		.filter-item {
			margin-bottom: 12px;
		}
		.filter-item label {
			display: block;
			margin-bottom: 5px;
			font-weight: 500;
			font-size: 13px;
		}
		.filter-item input[type="text"],
		.filter-item input[type="number"] {
			width: 100%;
			padding: 6px 10px;
			border: 1px solid #ced4da;
			border-radius: 4px;
			font-size: 13px;
		}
		.range-inputs {
			display: flex;
			align-items: center;
			gap: 8px;
		}
		.range-inputs input {
			flex: 1;
		}
		.range-inputs span {
			color: #6c757d;
		}
		.filter-actions {
			display: flex;
			gap: 8px;
			margin-top: 15px;
		}
	`;

	$('<style>').attr('id', 'store-detail-css').text(css).appendTo('head');
}
