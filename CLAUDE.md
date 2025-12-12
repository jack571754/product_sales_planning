<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

基于 Frappe Framework v15 的产品销售规划系统，管理商品计划、店铺分配和多级审批流程。支持月度常规计划(MON)和专项促销活动(PRO)。

### 核心架构特点：双前端系统

**关键决策**：项目采用双前端架构，根据场景选择技术栈：

1. **传统 Frappe Page** (`planning_system/page/`)
   - 深度集成 Frappe Desk，使用 handsontable 处理大数据量表格
   - 页面：planning_dashboard, store_detail, data_view
   - 路由：`/app/page-name`

2. **Vue 3 SPA** (`frontend/`)
   - 现代 UI 框架：Vue 3 + frappe-ui + Vite + Tailwind CSS
   - 独立开发服务器（8080端口），生产环境通过 `/planning` 访问
   - 构建输出：`product_sales_planning/public/planning/`
   - 路由：`/planning/*`（由 Vue Router 处理）

**共享后端**：两种前端调用相同的 `@frappe.whitelist` API，统一响应格式（`utils/response_utils.py`）。

## 快速开始

### 安装

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench --site [site-name] install-app product_sales_planning

# 安装代码质量检查工具
cd apps/product_sales_planning
pre-commit install

# 初始化 Vue 前端
cd frontend && yarn install && yarn build
```

### 开发环境配置

**必需配置**：在 `site_config.json` 中添加（跳过 CSRF 验证）：
```json
{"ignore_csrf": 1}
```

**确定当前站点**：`cat sites/currentsite.txt` 或 `bench use [site-name]`

## 常用命令速查

### 开发服务器
```bash
bench start                                    # 启动 Frappe 开发服务器
cd frontend && yarn dev                        # 启动 Vue 开发服务器（8080端口）
```

### 数据库和缓存
```bash
bench --site [site-name] migrate               # 数据库迁移（修改 DocType 后必须执行）
bench --site [site-name] clear-cache           # 清除缓存（Vue 构建后必须执行）
bench --site [site-name] console               # Python 控制台调试
```

### 构建和测试
```bash
bench build --app product_sales_planning       # 构建传统 Frappe Page 资源
cd frontend && yarn build                      # 构建 Vue SPA（输出到 public/planning/）
bench --site [site-name] test product_sales_planning  # 运行所有测试
ruff check . && eslint frontend/src            # 代码质量检查
```

### 测试数据生成
```bash
bench --site [site-name] execute product_sales_planning.fixtures.generate_test_data.generate_all_test_data
bench --site [site-name] execute product_sales_planning.fixtures.create_test_approval_workflow.create_test_workflow
```


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

## Vue 前端关键配置

### frappe-ui 集成要点

**初始化 (frontend/src/main.js)**
```javascript
import { setConfig, frappeRequest, resourcesPlugin } from 'frappe-ui'
setConfig('resourceFetcher', frappeRequest)  // 关键：使用 Frappe 请求处理器
app.use(resourcesPlugin)
```

**API 调用方式**
```javascript
// 一次性调用
import { call } from 'frappe-ui'
const { data, error } = await call('your.api.method', { param: value })

// 可重复加载（推荐）
import { createResource } from 'frappe-ui'
const resource = createResource({
  url: 'your.api.method',
  params: () => ({ param: value.value }),  // 使用函数以支持响应式
  auto: true
})
// 访问：resource.data, resource.loading, resource.error, resource.reload()
```

**Tailwind 配置 (frontend/tailwind.config.js)**
```javascript
presets: [require(path.join(__dirname, 'node_modules/frappe-ui/src/utils/tailwind.config'))],
content: ["./node_modules/frappe-ui/src/components/**/*.{vue,js,ts,jsx,tsx}"]
```

**Vite 配置要点 (frontend/vite.config.js)**
- `base`: `/assets/product_sales_planning/planning/` (生产环境资源路径)
- `outDir`: `../product_sales_planning/public/planning` (构建输出目录)
- `proxy`: 代理 `/api`, `/app`, `/assets` 到 Frappe 后端（开发环境）
- `optimizeDeps`: 包含 `frappe-ui` 和 `feather-icons`

### CSRF Token 处理

**服务端** (`www/planning.py`): 生成 token 并注入到 `window.csrf_token` 和 `window.boot`
**前端**: frappe-ui 的 `call()` 自动从 `window.csrf_token` 读取
**开发环境**: 在 `site_config.json` 中设置 `"ignore_csrf": 1` 跳过验证

### 构建和部署

**开发模式**：`cd frontend && yarn dev` (访问 `http://[site-name]:8080/planning/`)
**生产构建**：`cd frontend && yarn build && bench --site [site-name] clear-cache`
**访问地址**：`http://[site-name]:8000/planning`

### Vue Router 配置

- 使用 `createWebHistory('/planning/')` 作为基础路径
- 路由规则在 `hooks.py` 中配置：`website_route_rules` 确保 `/planning/*` 由 Vue Router 处理

## 常见开发场景

### 场景 1：添加新的 API 端点

```python
# 1. 在对应的 page.py 或 doctype.py 中添加方法
@frappe.whitelist()
def get_store_summary(store_id):
    """获取店铺汇总数据"""
    # 参数验证
    validate_required_params({"store_id": store_id})
    validate_doctype_exists("Store List", store_id)

    try:
        # 业务逻辑
        data = frappe.get_all(
            "Commodity Schedule",
            filters={"store_id": store_id},
            fields=["commodity_code", "quantity"]
        )
        return success_response(data=data)
    except Exception as e:
        frappe.log_error(title="获取店铺汇总失败", message=str(e))
        return error_response(message=str(e))

# 2. 在 Vue 中调用
import { call } from 'frappe-ui'

const { data, error } = await call(
    'product_sales_planning.planning_system.page.store_detail.store_detail.get_store_summary',
    { store_id: 'STORE-001' }
)
```

### 场景 2：修改 DocType 字段

```bash
# 1. 在 Frappe Desk 中修改 DocType（或直接编辑 JSON 文件）
# 2. 运行迁移
bench --site [site-name] migrate

# 3. 如果需要数据迁移，创建迁移脚本
# product_sales_planning/patches/v1_0/update_store_data.py
```

### 场景 3：添加新的 Vue 页面

```bash
# 1. 创建页面组件
# frontend/src/pages/NewPage.vue

# 2. 在路由中注册
# frontend/src/router.js
{
  path: '/new-page',
  component: () => import('./pages/NewPage.vue')
}

# 3. 在侧边栏添加导航
# frontend/src/components/Sidebar.vue

# 4. 构建并清除缓存
cd frontend && yarn build
bench --site [site-name] clear-cache
```

### 场景 4：调试 API 问题

```bash
# 1. 查看错误日志
bench --site [site-name] logs

# 2. 进入控制台调试
bench --site [site-name] console
>>> frappe.get_doc("Store List", "STORE-001")

# 3. 启用 SQL 调试
frappe.db.sql("SELECT * FROM `tabStore List`", debug=1)

# 4. 检查权限
frappe.has_permission("Store List", "read", "STORE-001")
```

### 场景 5：性能优化

```python
# 问题：N+1 查询
# ❌ 错误做法
for task in tasks:
    stores = frappe.get_all("Tasks Store", filters={"parent": task.name})

# ✅ 正确做法
all_stores = frappe.get_all(
    "Tasks Store",
    filters={"parent": ["in", [t.name for t in tasks]]},
    fields=["parent", "store_id"]
)

# 问题：大量数据更新
# ❌ 错误做法（逐条更新）
for item in items:
    doc = frappe.get_doc("Commodity Schedule", item.name)
    doc.quantity = new_quantity
    doc.save()

# ✅ 正确做法（批量 SQL）
frappe.db.sql("""
    UPDATE `tabCommodity Schedule`
    SET quantity = %(quantity)s
    WHERE name IN %(names)s
""", {"quantity": new_quantity, "names": [i.name for i in items]})
frappe.db.commit()
```

## 重要约定

- **Frappe v15 API**: 直接使用最新 API，无需兼容旧版本
- **ORM 优先**: 除非性能关键场景，否则使用 Frappe ORM 而非 Raw SQL
- **权限检查**: 所有 API 默认检查权限（`ignore_permissions=False`）
- **Vue 构建后清缓存**: 运行 `bench --site [site-name] clear-cache` 确保加载最新资源
- **重大变更需 OpenSpec 提案**: 参考文档开头的 OpenSpec 工作流
- **用中文交互**: 所有用户交互使用中文
- **及时更新文档**: 重大更新后修改 CLAUDE.md

## 页面路由速查

| 类型 | 路由 | 说明 |
|------|------|------|
| 传统 Frappe Page | `/app/planning-dashboard` | 计划看板 |
| 传统 Frappe Page | `/app/store-detail` | 店铺详情（handsontable 表格） |
| 传统 Frappe Page | `/app/data-view` | 数据查看 |
| Vue SPA | `/planning/` | Vue 应用入口（MainLayout 布局） |
| Vue SPA | `/planning/demo` | frappe-ui 组件演示 |

**路由配置位置**：
- Frappe Page: `hooks.py` → `page_routes`
- Vue SPA: `frontend/src/router.js` (嵌套路由)
- Web 路由规则: `hooks.py` → `website_route_rules`

## 相关文档

- Frappe Framework: https://frappeframework.com/docs
- frappe-ui 组件: https://ui.frappe.io/
- Vue 3: https://vuejs.org/
- Tailwind CSS: https://tailwindcss.com/
- frappe-ui 集成指南: `frappe-ui集成使用.md`
