# Store Detail 页面布局修复方案

## 问题分析

参照 data_view.js 的成功实现，store_detail.js 存在以下问题：

1. **固定高度限制**：`.store-planning-body` 使用了 `height: calc(100vh - 120px)` 和 `overflow: hidden`
2. **表格容器高度不足**：Handsontable 容器没有设置固定高度
3. **分页器未显示**：分页器 HTML 已添加但样式可能有问题

## 修复方案

### 1. 移除主容器的固定高度限制
```css
.store-planning-body {
    padding: 10px;
    max-width: 100%;
    margin: 0 auto;
    /* 移除 height 和 overflow 限制 */
}
```

### 2. 设置 Handsontable 固定高度
```javascript
this.hot = new Handsontable(container, {
    // ...其他配置
    height: 600,  // 固定高度 600px
    // ...
});
```

### 3. 优化分页器样式
分页器应该直接嵌入在 `.handsontable-container` 内部，参照 data_view 的实现。

## 实施步骤

1. 修改 CSS：移除 `.store-planning-body` 的固定高度
2. 修改 Handsontable 初始化：添加 `height: 600` 配置
3. 确保分页器 HTML 正确渲染
4. 测试页面滚动和分页功能
