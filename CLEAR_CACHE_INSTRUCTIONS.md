# 清除浏览器缓存说明

## 问题原因

错误 `TypeError: Cannot read properties of null (reading 'ce')` 发生在 `StoreDetail.js:1:9005`，这表明浏览器正在使用**旧的缓存文件**。

我们已经：
1. ✅ 修复了所有代码问题
2. ✅ 将 StoreDetail 改为非懒加载（直接导入）
3. ✅ 清理了 Vite 缓存
4. ✅ 重新构建了前端代码

现在需要清除浏览器缓存才能看到修复效果。

## 清除浏览器缓存的方法

### 方法 1：硬刷新（推荐）⭐

**Chrome / Edge / Firefox**:
- Windows: `Ctrl + Shift + R` 或 `Ctrl + F5`
- Mac: `Cmd + Shift + R`

**Safari**:
- Mac: `Cmd + Option + R`

### 方法 2：清除站点数据

#### Chrome / Edge
1. 按 `F12` 打开开发者工具
2. 右键点击刷新按钮
3. 选择 "清空缓存并硬性重新加载"

或者：
1. 按 `F12` 打开开发者工具
2. 进入 `Application` 标签
3. 左侧选择 `Storage`
4. 点击 `Clear site data`
5. 刷新页面

#### Firefox
1. 按 `F12` 打开开发者工具
2. 进入 `Storage` 标签
3. 右键点击站点
4. 选择 `Delete All`
5. 刷新页面

#### Safari
1. 打开 `开发` 菜单（如果没有，在 Safari 偏好设置中启用）
2. 选择 `清空缓存`
3. 刷新页面

### 方法 3：无痕/隐私模式

打开一个新的无痕/隐私浏览窗口测试：
- Chrome / Edge: `Ctrl + Shift + N` (Windows) 或 `Cmd + Shift + N` (Mac)
- Firefox: `Ctrl + Shift + P` (Windows) 或 `Cmd + Shift + P` (Mac)
- Safari: `Cmd + Shift + N`

### 方法 4：完全清除浏览器缓存

#### Chrome / Edge
1. 打开设置 (`chrome://settings/` 或 `edge://settings/`)
2. 搜索 "清除浏览数据"
3. 选择 "时间范围" 为 "全部时间"
4. 勾选：
   - ✅ 浏览历史记录
   - ✅ Cookie 和其他网站数据
   - ✅ 缓存的图片和文件
5. 点击 "清除数据"

#### Firefox
1. 打开设置 (`about:preferences`)
2. 进入 "隐私与安全"
3. 在 "Cookie 和网站数据" 部分点击 "清除数据"
4. 勾选所有选项
5. 点击 "清除"

## 验证修复

清除缓存后，请按以下步骤验证：

### 1. 检查控制台
打开浏览器开发者工具（F12），查看 Console 标签：

**应该看到**：
```
✅ 路由跳转: {from: '/', to: '/', params: {…}}
✅ 🔄 准备跳转到店铺详情: {storeId: 'SC-5-744', taskId: '2025-12-MON-745'}
✅ 路由跳转: {from: '/', to: '/store-detail/SC-5-744/2025-12-MON-745', params: {…}}
✅ StoreDetail 组件已挂载 {storeId: 'SC-5-744', taskId: '2025-12-MON-745'}
```

**不应该看到**：
```
❌ Router error: TypeError: Cannot read properties of null (reading 'ce')
❌ at StoreDetail.js:1:9005
```

### 2. 测试跳转
1. 访问计划看板页面 `http://localhost:8000/planning`
2. 点击任意店铺卡片
3. 应该能够正常跳转到店铺详情页
4. 页面应该正常显示，没有白屏

### 3. 检查网络请求
在开发者工具的 Network 标签中：
1. 刷新页面
2. 查找 `index.js` 文件
3. 确认文件大小约为 521 KB（新构建的版本）
4. 确认 Status 是 200（不是 304 from cache）

## 如果问题仍然存在

### 1. 确认使用的是生产构建
```bash
cd apps/product_sales_planning/frontend
yarn build
```

### 2. 重启 Frappe 服务器
```bash
# 在 frappe-bench 目录
bench restart
```

### 3. 使用开发模式
如果生产构建仍有问题，尝试开发模式：
```bash
cd apps/product_sales_planning/frontend
yarn dev
```
然后访问 `http://localhost:8080`

### 4. 检查文件是否正确部署
```bash
ls -lh apps/product_sales_planning/product_sales_planning/public/planning/assets/
```
应该看到：
- `index.js` (约 521 KB)
- `index.css` (约 132 KB)
- 生成时间应该是最近的

### 5. 查看详细错误信息
在浏览器控制台中，点击错误堆栈中的文件链接，查看具体是哪一行代码出错。

## 代码修改总结

### 主要修改
1. **router.js**: 将 StoreDetail 改为直接导入（非懒加载）
   ```javascript
   // 之前（懒加载）
   component: () => import('./pages/StoreDetail.vue')
   
   // 现在（直接导入）
   import StoreDetail from './pages/StoreDetail.vue'
   component: StoreDetail
   ```

2. **StoreDetail.vue**: 添加了大量的条件渲染和错误处理
3. **PlanningDashboard.vue**: 改进了跳转逻辑和参数验证
4. **MainLayout.vue**: 添加了 ErrorBoundary 和 Suspense
5. **ErrorBoundary.vue**: 新增错误边界组件

### 为什么需要清除缓存？

浏览器会缓存 JavaScript 文件以提高性能。即使服务器上的文件已更新，浏览器可能仍在使用旧的缓存版本。清除缓存可以强制浏览器下载最新的文件。

## 联系支持

如果按照以上步骤操作后问题仍然存在，请提供：
1. 浏览器类型和版本
2. 完整的控制台错误信息
3. Network 标签中 index.js 的请求详情
4. 是否使用了代理或 VPN

---

**最后更新**: 2025-12-13  
**状态**: 代码已修复，等待浏览器缓存清除 ⏳