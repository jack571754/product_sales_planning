# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Frappe Framework (v15) 开发的产品销售规划系统，用于管理商品计划、店铺分配和审批流程。系统支持月度常规计划(MON)和专项促销活动(PRO)的创建、审批和执行跟踪。

### 双前端架构

本项目采用**双前端架构**，同时支持两种前端技术栈：

1. **传统 Frappe Page**（位于 `planning_system/page/`）
   - 使用 Frappe 内置的 Page 机制
   - 适合需要深度集成 Frappe Desk 的页面
   - 示例：planning_dashboard, store_detail, data_view

2. **Vue 3 SPA**（位于 `frontend/`）
   - 独立的 Vue 3 + frappe-ui 单页应用
   - 使用 Vite 构建，支持现代前端开发体验
   - 通过 `/planning` 路由访问
   - 适合需要复杂交互和现代 UI 的页面

两种前端共享相同的后端 API（通过 `@frappe.whitelist` 装饰器暴露）。

## 安装和初始设置

### 安装应用

```bash
# 克隆仓库到 bench apps 目录
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop

# 在站点上安装应用
bench --site [site-name] install-app product_sales_planning

# 安装 pre-commit hooks（用于代码质量检查）
cd apps/product_sales_planning
pre-commit install
```

### 初始化 Vue 前端

```bash
# 进入前端目录并安装依赖
cd apps/product_sales_planning/frontend
yarn install
# 或
npm install

# 首次构建（生成生产资源）
yarn build
```

### 开发环境配置

在站点的 `site_config.json` 中添加以下配置（用于开发）：

```json
{
  "ignore_csrf": 1
}
```

### 确定当前站点

```bash
# 查看当前活动站点
cat sites/currentsite.txt

# 如果需要切换站点，可以使用
bench use [site-name]
```

## 开发环境与命令

### 常用 Bench 命令

```bash
# 启动开发服务器
bench start

# 数据库迁移（修改 DocType 后必须执行）
bench --site [site-name] migrate

# 构建前端资源（修改 JS/CSS 后执行）
bench build --app product_sales_planning

# 清除缓存
bench --site [site-name] clear-cache

# 运行测试
bench --site [site-name] test product_sales_planning

# 运行单个测试
bench --site [site-name] test product_sales_planning.planning_system.doctype.commodity_schedule.test_commodity_schedule

# 代码质量检查
ruff check .
eslint .

# 查看所有站点
bench --site all list

# 进入站点控制台（调试用）
bench --site [site-name] console
```

### Vue 前端开发命令

项目包含独立的 Vue 3 frappe-ui前端应用（位于 `frontend/` 目录）：

```bash
# 进入前端目录
cd frontend

# 安装依赖
yarn install
# 或
npm install

# 启动开发服务器（运行在 8080 端口）
yarn dev
# 或
npm run dev

# 构建生产版本（输出到 ../product_sales_planning/public/planning）
yarn build
# 或
npm run build

# 预览生产构建
yarn preview
```

**重要配置**：
- 开发环境需在 `site_config.json` 中添加 `"ignore_csrf": 1` 以避免 CSRF 错误
- 开发服务器通过 Vite 代理到 Frappe 后端（默认 8000 端口）
- 开发环境访问地址：`http://[site-name]:8080/planning/`
- 生产环境访问地址：`http://[site-name]:8000/planning`
- 生产环境路由基础路径：`/assets/product_sales_planning/planning/`
- 构建输出目录：`product_sales_planning/public/planning/`

**注意事项**：
- 构建输出的文件（`product_sales_planning/public/planning/assets/*`）是自动生成的，不应手动编辑
- 字体文件（Inter-*.woff2）会在首次构建时自动复制
- `.vite/` 目录是 Vite 的缓存目录，可以安全删除

### 开发工作流

1. 修改 Python 代码后：无需重启，Frappe 会自动重载
2. 修改 DocType JSON 后：运行 `bench migrate`
3. 修改 JS/CSS 后：运行 `bench build --app product_sales_planning`
4. 提交代码前：确保 pre-commit hooks 通过（ruff, eslint, prettier, pyupgrade）

## 核心架构

### 目录结构

```
product_sales_planning/
├── planning_system/
│   ├── doctype/              # 自定义文档类型（核心数据模型）
│   │   ├── approval_workflow/        # 审批工作流配置
│   │   ├── approval_workflow_step/   # 审批步骤（子表）
│   │   ├── approver_store_assignment/ # 审批人-店铺分配关系
│   │   ├── commodity_schedule/       # 商品计划（核心业务数据）
│   │   ├── product_list/             # 产品主数据
│   │   ├── product_mechanism/        # 产品机制配置
│   │   ├── schedule_tasks/           # 计划任务（父级文档）
│   │   ├── store_list/               # 店铺主数据
│   │   └── tasks_store/              # 任务-店铺关联（子表）
│   └── page/                 # 自定义页面（单页应用）
│       ├── planning_dashboard/       # 计划看板（任务总览）
│       ├── store_detail/             # 店铺详情（商品规划编辑）
│       └── data_view/                # 数据查看（多维度查询）
├── services/                 # 业务逻辑服务层
│   └── commodity_service.py          # 商品计划服务（封装复杂业务逻辑）
├── utils/                    # 工具类
│   ├── response_utils.py             # API 响应格式化
│   ├── validation_utils.py           # 参数验证
│   └── date_utils.py                 # 日期处理
├── fixtures/                 # 测试数据生成脚本
├── www/                      # Web 路由处理
│   ├── planning.html                 # Vue SPA 入口 HTML
│   └── planning.py                   # 提供 CSRF token 和用户会话
├── public/                   # 静态资源
│   ├── css/                  # 全局样式
│   ├── js/                   # 全局 JS
│   └── planning/             # Vue 构建输出目录
│       └── assets/           # 编译后的 JS/CSS
└── frontend/                 # Vue 3 前端源码（独立项目）
    ├── src/
    │   ├── pages/            # Vue 页面组件
    │   │   ├── PlanningDashboard.vue  # 计划看板主页（使用 createResource 加载数据）
    │   │   ├── FrappeUIDemo.vue       # frappe-ui 组件演示页
    │   │   └── Home.vue               # 备用首页
    │   ├── layouts/          # 布局组件
    │   │   └── MainLayout.vue         # 主布局（侧边栏+顶栏+内容区，支持主题切换）
    │   ├── components/       # 可复用组件
    │   │   ├── Sidebar.vue            # 侧边栏导航（可折叠，状态持久化）
    │   │   ├── TopBar.vue             # 顶部栏（汉堡菜单+用户菜单）
    │   │   └── UserMenu.vue           # 用户菜单（头像+下拉，使用 Dropdown 组件）
    │   ├── router.js         # Vue Router 配置（嵌套路由）
    │   ├── main.js           # Vue 应用入口（frappe-ui 初始化）
    │   ├── App.vue           # 根组件（用户认证检查）
    │   └── index.css         # 全局样式（Tailwind + frappe-ui）
    ├── vite.config.js        # Vite 构建配置（代理、优化、构建输出）
    ├── tailwind.config.js    # Tailwind CSS 配置（使用 frappe-ui 预设）
    ├── postcss.config.js     # PostCSS 配置
    └── package.json          # 前端依赖
```

### 关键设计模式

1. **服务层模式**: 复杂业务逻辑封装在 `services/` 中，避免 API 层代码臃肿
2. **工具类模式**: 通用功能（验证、响应格式化）抽取到 `utils/` 中复用
3. **子表关联**: Schedule Tasks 通过 `set_store` 子表关联多个店铺，形成一对多关系
4. **审批工作流**: 基于角色、店铺属性或店铺范围的多级审批流程
5. **Vue 组件化架构**:
   - **布局组件** (MainLayout.vue): 提供统一的页面框架，包含侧边栏、顶栏和内容区
   - **可复用组件** (Sidebar, TopBar, UserMenu): 封装通用 UI 逻辑，支持状态持久化
   - **页面组件** (PlanningDashboard): 业务页面，使用 frappe-ui 的 `createResource` 进行数据管理
   - **嵌套路由**: 使用 Vue Router 的嵌套路由，所有页面共享 MainLayout 布局

### 数据流

**传统 Frappe Page 数据流**：
```
用户操作 (Page JS)
    ↓
API 调用 (frappe.call)
    ↓
白名单方法 (@frappe.whitelist)
    ↓
服务层 (CommodityScheduleService)
    ↓
Frappe ORM / SQL
    ↓
MariaDB
```

**Vue SPA 数据流**：
```
用户访问 /planning
    ↓
www/planning.py 生成 HTML + 注入 CSRF token
    ↓
加载 Vue 应用 (public/planning/assets/index.js)
    ↓
Vue Router 路由到组件 (PlanningDashboard.vue)
    ↓
组件通过 frappe-ui 的 call() 调用 API
    ↓
白名单方法 (@frappe.whitelist)
    ↓
返回 JSON 数据到 Vue 组件
```

## 核心 DocType 说明

### Schedule Tasks (计划任务)
- **作用**: 父级文档，定义计划任务的基本信息
- **关键字段**: task_type (MON/PRO), start_date, end_date, status
- **子表**: set_store (关联多个店铺)
- **命名规则**: 自动生成（如 TASK-2024-001）

### Commodity Schedule (商品计划)
- **作用**: 存储具体商品的销售计划数据
- **关键字段**: task_id, store_id, commodity_code, commodity_name, quantity, mechanism
- **索引**: task_id + store_id（高频查询组合）
- **注意**: 批量操作时使用 SQL 优化性能

### Approval Workflow (审批工作流)
- **作用**: 定义多级审批流程
- **子表**: approval_steps (审批步骤)
- **审批人分配方式**:
  - 基于角色 (role_based)
  - 基于店铺属性 (store_attribute_based)
  - 基于店铺范围 (store_range_based)

### Tasks Store (任务店铺关联)
- **作用**: Schedule Tasks 的子表，关联任务和店铺
- **关键字段**: store_id, approval_status (Draft/Pending/Approved/Rejected)
- **状态流转**: Draft → Pending → Approved/Rejected

## API 设计规范

### 统一响应格式

所有 API 必须使用 `utils/response_utils.py` 中的标准格式：

```python
# 成功响应
return success_response(data={...}, message="操作成功")

# 错误响应
return error_response(message="错误信息")
```

### 参数验证

使用 `utils/validation_utils.py` 中的验证函数：

```python
# 解析 JSON 参数
data = parse_json_param(json_str, "data")

# 验证必填参数
validate_required_params({"task_id": task_id, "store_id": store_id})

# 验证正整数
validate_positive_integer(quantity, "quantity")

# 验证 DocType 存在
validate_doctype_exists("Store List", store_id)
```

### 错误处理

```python
try:
    # 业务逻辑
    pass
except Exception as e:
    frappe.log_error(title="操作失败", message=str(e))
    return error_response(message=str(e))
```

## 前端开发规范

### 传统 Frappe Page 结构

每个 Page 包含三个文件：
- `page_name.json`: 页面配置
- `page_name.js`: 前端逻辑
- `page_name.py`: 后端 API

### Vue SPA 开发

**组件架构**：
- **页面组件** (`frontend/src/pages/`): 业务页面，如 PlanningDashboard.vue
- **布局组件** (`frontend/src/layouts/`): 页面布局框架，如 MainLayout.vue
- **可复用组件** (`frontend/src/components/`): 通用 UI 组件，如 Sidebar.vue、TopBar.vue
- **路由配置** (`frontend/src/router.js`): Vue Router 嵌套路由配置
- **应用入口** (`frontend/src/main.js`): frappe-ui 初始化和全局配置

**组件开发最佳实践**：
1. **使用 `<script setup>` 语法**: 更简洁的 Composition API 写法
2. **使用 frappe-ui 的 `createResource`**: 声明式数据加载，自动处理加载状态
3. **状态持久化**: 使用 `localStorage` 保存用户偏好（如侧边栏折叠状态）
4. **响应式设计**: 使用 Tailwind CSS 的响应式类（sm:, md:, lg:）
5. **组件通信**: 使用 `defineEmits` 和 `defineProps` 进行父子组件通信

**API 调用（Vue 中）**：
```javascript
import { call } from 'frappe-ui'

// 调用 API
const { data, error } = await call('product_sales_planning.planning_system.page.store_detail.store_detail.get_store_commodity_data', {
    store_id: store_id,
    task_id: task_id
})
```

**API 调用（传统 Page）**：
```javascript
frappe.call({
    method: "product_sales_planning.planning_system.page.store_detail.store_detail.get_store_commodity_data",
    args: {
        store_id: store_id,
        task_id: task_id
    },
    callback: function(r) {
        if (r.message.status === "success") {
            // 处理数据
        }
    }
});
```

### UI 组件

- **传统 Page 表格**: 使用 handsontable 进行大数据量展示和编辑
- **传统 Page 图标**: 使用 Frappe 内置图标系统
- **Vue SPA 组件**: 使用 frappe-ui 组件库（Button, Card, Input, Badge 等）
- **Vue SPA 图标**: 使用 feather-icons（已集成在 frappe-ui 中） 

## 数据库操作最佳实践

### 优先使用 ORM

```python
# 推荐：使用 Frappe ORM
doc = frappe.get_doc("Commodity Schedule", name)
doc.quantity = new_quantity
doc.save()

# 批量查询
items = frappe.get_all(
    "Commodity Schedule",
    filters={"task_id": task_id, "store_id": store_id},
    fields=["name", "commodity_code", "quantity"]
)
```

### 性能优化场景使用 SQL

```python
# 批量更新（性能关键场景）
frappe.db.sql("""
    UPDATE `tabCommodity Schedule`
    SET quantity = %(quantity)s
    WHERE task_id = %(task_id)s AND store_id = %(store_id)s
""", {"quantity": quantity, "task_id": task_id, "store_id": store_id})

frappe.db.commit()  # 显式提交
```

### 避免 N+1 查询

```python
# 错误：N+1 查询
for task in tasks:
    stores = frappe.get_all("Tasks Store", filters={"parent": task.name})

# 正确：一次性获取
all_stores = frappe.get_all(
    "Tasks Store",
    filters={"parent": ["in", [t.name for t in tasks]]},
    fields=["parent", "store_id"]
)
```

## 审批流程逻辑

### 状态流转

1. **Draft**: 初始状态，可编辑
2. **Pending**: 提交审批后，等待审批
3. **Approved**: 审批通过，不可编辑
4. **Rejected**: 审批退回，可重新编辑

### 权限检查

```python
# 检查是否可编辑
from product_sales_planning.planning_system.doctype.approval_workflow.approval_api import check_can_edit

can_edit = check_can_edit(task_id, store_id)
```

### 审批操作

- `submit_for_approval`: 提交审批
- `approve_task_store`: 审批通过/退回
- `withdraw_approval`: 撤回审批（仅提交人可操作）

## 测试数据生成

使用 `fixtures/` 中的脚本生成测试数据：

```bash
# 生成测试数据
bench --site [site-name] execute product_sales_planning.fixtures.generate_test_data.generate_all_test_data

# 创建审批工作流
bench --site [site-name] execute product_sales_planning.fixtures.create_test_approval_workflow.create_test_workflow

# 创建店铺分配
bench --site [site-name] execute product_sales_planning.fixtures.create_store_assignment.create_assignments
```

## 常见问题排查

### 页面加载慢
- 检查 SQL 查询是否有索引
- 使用 `frappe.db.sql` 的 `debug=1` 参数查看执行计划
- 考虑分页加载或懒加载

### 审批流程不工作
- 检查 Approval Workflow 是否正确配置
- 检查 Approver Store Assignment 是否分配
- 检查用户角色权限

### 数据导入失败
- 检查 Excel 模板格式是否匹配
- 检查必填字段是否完整
- 查看错误日志：`bench --site [site-name] logs`

### Vue 前端构建问题
- 如果构建后页面显示空白，检查浏览器控制台是否有 CORS 或 CSRF 错误
- 如果样式丢失，确认 Tailwind CSS 配置正确扫描了 frappe-ui 组件
- 如果组件无法导入，尝试删除 `node_modules` 和 `yarn.lock`，重新安装依赖
- 清除 Vite 缓存：`rm -rf frontend/.vite` 和 `rm -rf frontend/node_modules/.vite`
- 如果修改后页面没有更新，运行 `bench --site [site-name] clear-cache` 清除 Frappe 缓存

## 代码风格

### Python
- 使用 Tab 缩进（Frappe 标准）
- 行长度限制 110 字符
- 变量命名：snake_case
- DocType 命名：Title Case with Spaces

### JavaScript
- 使用 Tab 缩进
- 遵循 ESLint 规则
- 使用 ES6+ 语法

## Git 工作流

### 忽略的文件
以下文件/目录会自动生成，已在 `.gitignore` 中配置：
- `product_sales_planning/public/planning/assets/*` (Vue 构建输出)
- `product_sales_planning/public/planning/.vite/` (Vite 缓存)
- `frontend/node_modules/` (Node 依赖)
- `frontend/dist/` (临时构建目录)

### 提交前检查
```bash
# 确保 pre-commit hooks 通过
git add .
git commit -m "your message"  # pre-commit 会自动运行

# 如果 pre-commit 失败，修复问题后重新提交
# pre-commit 会自动运行 ruff, eslint, prettier, pyupgrade

# 手动运行代码检查
ruff check .
eslint frontend/src
```

### 分支策略
- 主分支：`master`
- 开发分支：`develop`
- 功能分支：从 `develop` 创建，命名格式 `feature/功能名称`
- 修复分支：从 `develop` 创建，命名格式 `fix/问题描述`

## Vue 前端开发注意事项

### frappe-ui 集成核心要点

**1. 初始化配置 (frontend/src/main.js)**
```javascript
import { setConfig, frappeRequest, resourcesPlugin } from 'frappe-ui'

// 关键：配置 frappe-ui 使用 Frappe 的请求处理器
setConfig('resourceFetcher', frappeRequest)

// 注册资源插件（用于 createResource 等功能）
app.use(resourcesPlugin)
```

**2. 组件导入和使用**
```javascript
// 按需导入 frappe-ui 组件
import { Button, MultiSelect, Avatar, FeatherIcon } from 'frappe-ui'

// 全局注册或局部使用
app.component('Button', Button)
```

**3. API 调用方式**

方式一：使用 `call` 函数（适合一次性调用）
```javascript
import { call } from 'frappe-ui'

// 调用 Frappe 白名单方法
const { data, error } = await call('your.api.method', {
    param1: value1,
    param2: value2
})
```

方式二：使用 `createResource`（推荐，适合需要重复加载的数据）
```javascript
import { createResource } from 'frappe-ui'

// 创建资源对象
const dashboardData = createResource({
  url: 'product_sales_planning.planning_system.page.planning_dashboard.planning_dashboard.get_dashboard_data',
  params: () => ({
    filters: JSON.stringify(filters.value),
    search_text: searchText.value
  }),
  auto: true  // 自动加载
})

// 访问数据和状态
dashboardData.data      // 返回的数据
dashboardData.loading   // 加载状态
dashboardData.error     // 错误信息
dashboardData.reload()  // 重新加载
```

**4. 样式导入 (frontend/src/index.css)**
```css
@import './assets/Inter/inter.css';  /* frappe-ui 使用 Inter 字体 */
@import 'frappe-ui/style.css';       /* frappe-ui 核心样式 */
```

**5. Tailwind CSS 配置 (frontend/tailwind.config.js)**
```javascript
// 关键：使用 frappe-ui 的 Tailwind 预设
presets: [
  require(path.join(__dirname, 'node_modules/frappe-ui/src/utils/tailwind.config'))
],
// 确保扫描 frappe-ui 组件
content: [
  "./node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}",
]
```

**6. Vite 配置优化 (frontend/vite.config.js)**
```javascript
// 优化 frappe-ui 依赖
optimizeDeps: {
  include: [
    'frappe-ui > feather-icons',
    'frappe-ui'
  ],
},
// 处理 CommonJS 依赖
commonjsOptions: {
  include: [/frappe-ui/, /node_modules/],
}
```

**7. 图标使用**
```vue
<template>
  <!-- 使用 frappe-ui 的 FeatherIcon 组件 -->
  <FeatherIcon name="check-square" class="w-4 h-4" />
</template>
```

**8. 插槽使用示例**
```vue
<MultiSelect :options="options" v-model="state">
  <!-- 自定义选项显示 -->
  <template #option="{ option }">
    <Avatar :image="option.img" :label="option.label" />
    {{ option.label }}
  </template>

  <!-- 自定义底部操作栏 -->
  <template #footer="{ clearAll, selectAll }">
    <Button @click="clearAll">清空</Button>
    <Button @click="selectAll">全选</Button>
  </template>
</MultiSelect>
```

### CSRF Token 处理

**服务端注入 (www/planning.py)**
```python
def get_context(context):
    csrf_token = frappe.sessions.get_csrf_token()
    frappe.db.commit()
    context.csrf_token = csrf_token
    context.boot = {
        "user": frappe.session.user,
        "csrf_token": csrf_token,
    }
```

**前端接收 (www/planning.html)**
```html
<meta name="csrf-token" content="{{ csrf_token }}">
<script>
  window.csrf_token = "{{ csrf_token }}";
  window.boot = {{ boot | tojson }};
</script>
```

- frappe-ui 的 `call()` 和 `frappeRequest` 会自动从 `window.csrf_token` 读取
- 开发环境可在 `site_config.json` 中设置 `"ignore_csrf": 1` 跳过验证

### 用户认证检查 (App.vue)

```javascript
import { call } from 'frappe-ui'

onMounted(async () => {
  const response = await call('frappe.auth.get_logged_user')
  if (!response || response === 'Guest') {
    // 未登录则重定向到登录页
    window.location.href = '/login?redirect-to=/planning'
  }
})
```

### 构建和部署

1. **开发模式**：
   ```bash
   cd frontend
   yarn dev  # 启动 Vite 开发服务器（8080 端口）
   ```
   - 访问：`http://[site-name]:8080/planning/`
   - Vite 自动代理 API 请求到 Frappe 后端（8000 端口）

2. **生产构建**：
   ```bash
   cd frontend
   yarn build  # 构建到 ../product_sales_planning/public/planning/
   bench --site [site-name] clear-cache  # 清除缓存
   ```
   - 访问：`http://[site-name]:8000/planning`
   - 静态资源路径：`/assets/product_sales_planning/planning/`

### Vite 配置要点

- `base`: 设置为 `/assets/product_sales_planning/planning/` 确保资源路径正确
- `outDir`: 输出到 `../product_sales_planning/public/planning`
- `rollupOptions`: 固定文件名，去除哈希值（便于 Frappe 引用）
- `proxy`: 代理 Frappe API 请求（开发环境）

### Vue Router 配置

- `history`: 使用 `createWebHistory('/planning/')`
- 基础路径必须与 Vite 的 `base` 配置和 `website_route_rules` 匹配
- 路由配置位置：`frontend/src/router.js`

### 路由规则配置 (hooks.py)

```python
website_route_rules = [
    {'from_route': '/planning/<path:app_path>', 'to_route': 'planning'},
    {'from_route': '/planning', 'to_route': 'planning'},
]
```

这确保所有 `/planning/*` 路径都由 Vue Router 处理（SPA 路由）

## 重要提醒

1. **不要写兼容代码**: 直接使用最新的 Frappe v15 API
2. **不要重复执行改动**: 每次改动只执行一次，避免数据重复
3. **优先使用 ORM**: 除非性能必要，否则不使用 Raw SQL
4. **权限检查**: 所有 API 默认检查权限（`ignore_permissions=False`）
5. **用中文回答**: 所有交互使用中文
6. **每次有重大更新记得更新文档**：每次有重大更新及时修改更新CLAUDE.md文档
7. **Vue 构建后需要清除缓存**: 运行 `bench --site [site-name] clear-cache` 确保加载最新资源 

## 页面路由

### 传统 Frappe Page 路由
- 计划看板: `/app/planning-dashboard`
- 店铺详情: `/app/store-detail`
- 数据查看: `/app/data-view`

### Vue SPA 路由
- Vue 应用入口: `/planning` 或 `/planning/`
- 计划看板: `/planning/` (Vue Router 根路径，使用 MainLayout 布局)
- 组件演示: `/planning/demo` (frappe-ui 组件演示页)

**路由配置位置**：
- Frappe Page 路由：`hooks.py` 中的 `page_routes`
- Vue SPA 路由：`frontend/src/router.js`（嵌套路由结构）
- Web 路由规则：`hooks.py` 中的 `website_route_rules`

**嵌套路由结构**：
```javascript
{
  path: '/',
  component: MainLayout,  // 父级布局组件
  children: [
    { path: '', component: PlanningDashboard },  // 默认子路由
    { path: 'demo', component: FrappeUIDemo }    // 演示页面
  ]
}
```

## Vue 前端组件详解

### MainLayout.vue（主布局组件）

**功能**：
- 提供统一的页面框架，包含侧边栏、顶栏和主内容区
- 管理侧边栏折叠状态（支持 localStorage 持久化）
- 管理深色模式状态（支持 localStorage 持久化）
- 使用 `<router-view />` 渲染子路由页面

**关键特性**：
- 使用 `ref` 管理响应式状态
- 使用 `watch` 监听状态变化并持久化到 localStorage
- 使用 `onMounted` 从 localStorage 恢复用户偏好

**文件位置**: `frontend/src/layouts/MainLayout.vue`

### Sidebar.vue（侧边栏组件）

**功能**：
- 显示导航菜单（计划看板、组件演示等）
- 支持折叠/展开状态（通过 `collapsed` prop 控制）
- 使用 Vue Router 进行页面导航
- 显示应用 Logo 和图标

**关键特性**：
- 使用 `router-link` 的 `v-slot` 实现自定义激活样式
- 使用 Tailwind CSS 实现响应式宽度（折叠时 w-16，展开时 w-64）
- 自定义滚动条样式

**文件位置**: `frontend/src/components/Sidebar.vue`

### TopBar.vue（顶部栏组件）

**功能**：
- 左侧显示汉堡菜单按钮（用于切换侧边栏）
- 右侧显示用户菜单组件

**关键特性**：
- 使用 `defineEmits` 向父组件发射事件
- 简洁的组件设计，职责单一

**文件位置**: `frontend/src/components/TopBar.vue`

### UserMenu.vue（用户菜单组件）

**功能**：
- 显示当前登录用户的头像和信息
- 提供下拉菜单（用户设置、切换主题、登出）
- 使用 frappe-ui 的 `createResource` 加载用户数据

**关键特性**：
- 使用 `Dropdown` 组件实现下拉菜单
- 使用 `Avatar` 组件显示用户头像
- 从 `window.boot.user` 获取当前用户信息
- 调用 `frappe.auth.logout` 实现登出功能

**文件位置**: `frontend/src/components/UserMenu.vue`

### PlanningDashboard.vue（计划看板页面）

**功能**：
- 显示计划任务列表（待完成/已完成）
- 提供搜索、筛选、排序功能
- 显示统计卡片（进行中计划、已结束计划等）
- 支持分页显示

**关键特性**：
- 使用 `createResource` 加载看板数据和筛选选项
- 使用 `computed` 计算派生状态（统计卡片、分页数据）
- 使用 `watch` 监听筛选条件变化并自动刷新数据
- 使用防抖（debounce）优化搜索性能
- 点击任务卡片跳转到传统 Frappe Page（店铺详情页）

**数据流**：
```
用户操作（搜索/筛选/排序）
    ↓
更新响应式状态（filters, searchText, sortBy）
    ↓
watch 监听到变化
    ↓
调用 dashboardData.reload()
    ↓
createResource 重新请求后端 API
    ↓
更新 dashboardData.data
    ↓
computed 重新计算（filteredTasks, paginatedTasks）
    ↓
视图自动更新
```

**文件位置**: `frontend/src/pages/PlanningDashboard.vue`

### 组件通信模式

**父子组件通信**：
```vue
<!-- 父组件 (MainLayout.vue) -->
<Sidebar
  :collapsed="sidebarCollapsed"           <!-- Props 向下传递 -->
  @toggle-collapse="toggleSidebar"        <!-- Events 向上发射 -->
/>

<!-- 子组件 (Sidebar.vue) -->
<script setup>
defineProps({ collapsed: Boolean })       // 接收 props
defineEmits(['toggle-collapse'])          // 定义 emits
</script>
```

**跨组件状态共享**：
- 使用 localStorage 持久化用户偏好（侧边栏折叠、深色模式）
- 使用 Vue Router 共享路由状态
- 使用 `window.boot` 共享全局配置（用户信息、CSRF token）

## 相关文档

- Frappe Framework 文档: https://frappeframework.com/docs
- ERPNext 文档: https://docs.erpnext.com
- Frappe ui 组件文档: https://ui.frappe.io/
- Vue 3 文档: https://vuejs.org/
- Tailwind CSS 文档: https://tailwindcss.com/
- frappe-ui 源码: https://github.com/frappe/frappe-ui
- frappe-ui MD apps/product_sales_planning/frappe-ui集成使用.md
