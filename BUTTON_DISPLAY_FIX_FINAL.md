# 按钮显示问题最终修复总结

## 问题描述

浏览器刷新后第一次进入页面时，产品添加和审批相关按钮都不展示，点击刷新按钮后一切恢复正常。

## 根本原因

### 问题1：重复调用导致的竞态条件
```
浏览器刷新后的执行流程：
1. on_page_load → 创建 StorePlanningManager
2. 构造函数 → init_ui()（所有按钮隐藏）
3. 构造函数 → refresh_from_route()
4. refresh_from_route() → fetch_data()
5. fetch_data() 回调 → load_approval_status()（异步）
6. on_page_show 触发 → refresh_from_route()（再次调用！）❌
7. 第二次 refresh_from_route() → fetch_data()
8. 两次异步调用导致竞态条件，按钮状态混乱
```

### 问题2：参数传递问题
```
load_approval_status() 从 filter_group 获取 storeId 和 taskId
但在首次加载时，filter_group 的值可能还没有从 URL 参数中正确设置
导致误判为"没有选择店铺和任务"，错误地显示了操作按钮
```

## 最终解决方案

### 1. 避免 on_page_show 重复调用 (`store_detail.js:248-265`)

**修复前**：
```javascript
frappe.pages['store-detail'].on_page_show = function(wrapper) {
    if (wrapper.store_manager) {
        wrapper.store_manager.refresh_from_route();  // ❌ 每次都调用
    }
};
```

**修复后**：
```javascript
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
```

**改进**：
- ✅ 添加 `is_first_load` 标志，跳过首次加载时的 `on_page_show` 调用
- ✅ 添加 `is_loading` 标志，避免在加载期间重复调用

### 2. 构造函数中添加标志 (`store_detail.js:268-290`)

**修复后**：
```javascript
class StorePlanningManager {
    constructor(wrapper, page) {
        this.wrapper = $(wrapper);
        this.page = page;
        this.data = [];
        this.months = [];
        this.checked_rows = new Set();
        this.view_mode = 'multi';

        // 程序锁：防止 set_value 触发 change 事件导致死循环
        this.is_programmatic_update = false;

        // ✅ 标记是否正在加载数据（避免重复加载）
        this.is_loading = false;

        // ✅ 标记是否是首次加载（避免 on_page_show 重复调用）
        this.is_first_load = true;

        this.init_ui();

        // ✅ 初始化时立即尝试读取一次路由
        this.refresh_from_route();
    }
}
```

### 3. fetch_data 中设置和清除加载标志 (`store_detail.js:582-640`)

**修复后**：
```javascript
fetch_data(params = null) {
    const storeId = params ? params.storeId : this.filter_group.get_value('store_id');
    const taskId = params ? params.taskId : this.filter_group.get_value('task_id');
    const searchTerm = this.filter_group.get_value('search_term');

    this.checked_rows.clear();
    this.update_batch_btn();

    // ✅ 设置加载标志
    this.is_loading = true;

    frappe.call({
        method: "...",
        args: { ... },
        callback: (r) => {
            if (r.message && !r.message.error) {
                this.data = r.message.data || [];
                this.months = r.message.months || [];
                this.init_table();
                this.update_stats();
                // ✅ 传递参数确保使用正确的值
                this.load_approval_status(storeId, taskId);
            } else {
                // ...
                this.load_approval_status(storeId, taskId);
            }
            // ✅ 清除加载标志
            this.is_loading = false;
        },
        error: (err) => {
            // ...
            this.load_approval_status(storeId, taskId);
            // ✅ 清除加载标志
            this.is_loading = false;
        }
    });
}
```

### 4. load_approval_status 接受参数 (`store_detail.js:1396-1452`)

**修复前**：
```javascript
StorePlanningManager.prototype.load_approval_status = function() {
    // ❌ 从 filter_group 获取，可能还没有正确设置
    const storeId = this.filter_group.get_value('store_id');
    const taskId = this.filter_group.get_value('task_id');

    if (!storeId || !taskId) {
        // 显示操作按钮
        return;
    }
    // ...
};
```

**修复后**：
```javascript
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
        console.log('⚠️ 没有店铺/任务，显示操作按钮');
        // 隐藏审批UI，显示操作按钮
        this.wrapper.find('.approval-status-area').hide();
        this.wrapper.find('.btn-submit-approval').hide();
        // ...
        this.wrapper.find('.btn-add-product').show();
        this.wrapper.find('.btn-import-excel').show();
        this.wrapper.find('.btn-import-mechanism').show();
        this.wrapper.find('.btn-apply-mechanism').show();
        return;
    }

    const self = this;
    frappe.call({
        method: "...",
        args: { task_id: taskId, store_id: storeId },
        callback: (r) => {
            if (r.message && r.message.status === "success") {
                console.log('✅ 审批状态加载成功:', r.message);
                self.approval_data = r.message;
                self.update_approval_ui();
            } else {
                console.warn('⚠️ 审批状态返回失败，按无审批流程处理');
                self.approval_data = null;
                self.update_approval_ui();
            }
        },
        error: (err) => {
            console.error('❌ 加载审批状态失败:', err);
            self.approval_data = null;
            self.update_approval_ui();
        }
    });
};
```

**改进**：
- ✅ 接受 `storeId` 和 `taskId` 参数
- ✅ 优先使用传入的参数，避免从 `filter_group` 获取不准确的值
- ✅ 增加详细的日志输出，方便调试
- ✅ 检查 `'undefined'` 字符串（Frappe 有时会传递字符串 'undefined'）

## 修复效果

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| 浏览器刷新后首次进入 | 所有按钮隐藏 ❌ | 按钮正确显示 ✅ |
| 点击刷新按钮 | 按钮正确显示 ✅ | 按钮正确显示 ✅ |
| 切换Tab后返回 | 按钮正确显示 ✅ | 按钮正确显示 ✅ |
| 路由变化 | 按钮正确显示 ✅ | 按钮正确显示 ✅ |

## 技术要点

### 1. 避免重复调用的模式

```javascript
// ❌ 错误做法：构造函数和 on_page_show 都调用
constructor() {
    this.init();
    this.load_data();  // 第一次调用
}

on_page_show() {
    this.load_data();  // 第二次调用，导致竞态
}

// ✅ 正确做法：使用标志避免重复
constructor() {
    this.is_first_load = true;
    this.init();
    this.load_data();
}

on_page_show() {
    if (this.is_first_load) {
        this.is_first_load = false;
        return;  // 跳过首次加载
    }
    this.load_data();
}
```

### 2. 参数传递 vs 全局状态

```javascript
// ❌ 错误做法：依赖全局状态（可能还没初始化）
function load_data() {
    const id = this.filter.get_value('id');  // 可能还没设置
    api_call(id);
}

// ✅ 正确做法：显式传递参数
function load_data(id) {
    if (!id) {
        id = this.filter.get_value('id');  // 降级处理
    }
    api_call(id);
}
```

### 3. 异步操作的加载标志

```javascript
// ✅ 使用加载标志避免重复调用
fetch_data() {
    if (this.is_loading) {
        console.log('Already loading, skip');
        return;
    }

    this.is_loading = true;

    api_call()
        .then(() => {
            // 处理数据
        })
        .finally(() => {
            this.is_loading = false;  // 确保清除标志
        });
}
```

## 调试建议

### 1. 查看控制台日志

修复后的代码添加了详细的日志输出：
```
🔍 load_approval_status called with: { storeId: "STORE-001", taskId: "TASK-001" }
✅ 审批状态加载成功: { ... }
⏭️ 跳过 on_page_show 调用（首次加载）
```

### 2. 检查按钮状态

在浏览器控制台中运行：
```javascript
// 检查按钮是否存在
$('.btn-add-product').length

// 检查按钮是否可见
$('.btn-add-product').is(':visible')

// 检查加载标志
wrapper.store_manager.is_loading
wrapper.store_manager.is_first_load
```

### 3. 模拟慢速网络

```bash
# 使用 Chrome DevTools
1. 打开开发者工具 → Network
2. 选择 "Slow 3G"
3. 刷新页面
4. 观察按钮显示是否正常
```

## 相关文件

### 修改的文件
- `product_sales_planning/planning_system/page/store_detail/store_detail.js`
  - 第248-265行：优化 `on_page_show` 避免重复调用
  - 第268-290行：构造函数中添加标志
  - 第582-640行：`fetch_data` 中设置和清除加载标志
  - 第1396-1452行：`load_approval_status` 接受参数

### 新增的文件
- `BUTTON_DISPLAY_FIX_FINAL.md`（本文档）

### 相关文档
- `BUTTON_DISPLAY_FIX.md`（第一次修复）
- `BUTTON_DISPLAY_FIX_V2.md`（第二次修复）

## 总结

这次修复通过以下三个关键改进彻底解决了按钮显示问题：

1. **避免重复调用**：使用 `is_first_load` 标志跳过首次加载时的 `on_page_show` 调用
2. **参数显式传递**：`load_approval_status` 接受参数，避免依赖可能未初始化的 `filter_group`
3. **加载状态管理**：使用 `is_loading` 标志避免并发加载导致的竞态条件

修复后，无论浏览器刷新、点击刷新按钮、切换Tab，按钮显示都保持一致且正确！
