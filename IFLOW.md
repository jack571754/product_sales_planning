# 产品销售规划系统 (Product Sales Planning System)

## 项目概述

这是一个基于 Frappe 框架开发的产品销售规划系统，用于管理商品计划、店铺分配和审批流程。系统支持月度常规计划和专项促销活动的创建、审批和执行跟踪。

### 主要功能

- **计划任务管理**: 创建和管理月度常规计划(MON)和专项促销活动(PRO)
- **店铺管理**: 维护店铺信息、渠道分类和负责人分配
- **商品规划**: 为每个店铺制定详细的商品销售计划
- **审批工作流**: 多级审批流程，支持提交、审批、退回和撤回操作
- **数据看板**: 实时监控任务进度和审批状态
- **数据查看**: 提供多维度的数据查询和导出功能

## 技术架构

### 后端技术栈

- **框架**: Frappe Framework (Python)
- **数据库**: MariaDB/MySQL
- **API**: RESTful API (基于 Frappe 白名单机制)
- **前端**: JavaScript + Vue.js (部分页面)
- **UI 组件**: AG Grid, VTable, Handsontable

### 项目结构

```
product_sales_planning/
├── planning_system/
│   ├── doctype/              # 自定义文档类型
│   │   ├── approval_workflow/    # 审批工作流
│   │   ├── approval_workflow_step/ # 审批步骤
│   │   ├── approver_store_assignment/ # 审批人店铺分配
│   │   ├── commodity_schedule/    # 商品计划
│   │   ├── product_list/          # 产品列表
│   │   ├── product_mechanism/     # 产品机制
│   │   ├── schedule_tasks/        # 计划任务
│   │   ├── store_list/            # 店铺列表
│   │   └── tasks_store/           # 任务店铺关联
│   └── page/                 # 自定义页面
│       ├── planning_dashboard/    # 计划看板
│       ├── store_detail/          # 店铺详情
│       └── data_view/             # 数据查看
├── public/                   # 静态资源
│   ├── css/               # 样式文件
│   ├── js/                # JavaScript 库
│   └── vue-test/          # Vue 测试项目
└── templates/             # 模板文件
```

## 核心数据模型

### 主要文档类型

1. **Schedule Tasks (计划任务)**
   - 父级文档，定义计划任务的基本信息
   - 包含任务类型、开始/结束日期、状态等
   - 通过 set_store 子表关联多个店铺

2. **Store List (店铺列表)**
   - 店铺基本信息
   - 包含店铺名称、渠道、负责人等

3. **Commodity Schedule (商品计划)**
   - 具体商品的销售计划
   - 关联任务ID和店铺ID
   - 包含商品编码、名称、数量、机制等

4. **Approval Workflow (审批工作流)**
   - 定义多级审批流程
   - 支持基于角色、店铺属性或店铺范围分配的审批人

5. **Approver Store Assignment (审批人店铺分配)**
   - 审批人与店铺的关联关系
   - 支持批量分配和管理

## 关键API接口

### 看板相关

- `get_dashboard_data`: 获取看板数据，支持过滤、搜索和排序
- `get_filter_options`: 获取筛选器选项数据

### 店铺详情相关

- `get_store_commodity_data`: 获取店铺商品计划数据
- `update_line_item`: 更新行项目数据
- `insert_commodity_schedule`: 插入商品计划
- `bulk_insert_commodity_schedule`: 批量插入商品计划
- `batch_update_quantity`: 批量更新数量
- `batch_delete_items`: 批量删除项目
- `apply_mechanisms`: 应用机制
- `import_commodity_data`: 导入商品数据
- `download_import_template`: 下载导入模板

### 审批流程相关

- `submit_for_approval`: 提交审批申请
- `approve_task_store`: 审批操作（通过/退回）
- `withdraw_approval`: 撤回审批
- `get_approval_history`: 获取审批历史
- `get_workflow_for_task_store`: 获取适用的审批流程
- `check_can_edit`: 检查是否可编辑

### 数据查看相关

- `get_data_view`: 获取数据视图
- `get_data_view_filter_options`: 获取数据视图筛选选项
- `export_data_view`: 导出数据视图

## 开发环境设置

### 系统要求

- Python 3.10+
- Node.js 16+
- Frappe Bench
- MariaDB/MySQL

### 安装步骤

1. 克隆项目到 bench 的 apps 目录
2. 安装应用:
   ```bash
   bench get-app $URL_OF_THIS_REPO --branch develop
   bench install-app product_sales_planning
   ```
3. 安装前端依赖:
   ```bash
   cd apps/product_sales_planning
   npm install
   ```

### 代码质量工具

项目使用以下工具确保代码质量:

- **ruff**: Python 代码格式化和检查
- **eslint**: JavaScript 代码检查
- **prettier**: 代码格式化
- **pyupgrade**: Python 代码升级

启用 pre-commit:
```bash
cd apps/product_sales_planning
pre-commit install
```

## 构建和运行

### 开发模式

1. 启动 Frappe 开发服务器:
   ```bash
   bench start
   ```

2. 访问应用:
   - 前端: http://localhost:8000
   - 看板页面: /planning-dashboard
   - 店铺详情: /store-detail
   - 数据查看: /data-view

### 测试

运行单元测试:
```bash
bench --site [site-name] test product_sales_planning
```

### 代码检查

运行代码质量检查:
```bash
# Python 代码检查
ruff check .

# JavaScript 代码检查
eslint .
```

## 开发约定

### Python 代码规范

- 遵循 PEP 8 规范
- 使用 Tab 缩进
- 行长度限制为 110 字符
- 使用 ruff 进行格式化和检查

### JavaScript 代码规范

- 使用 ESLint 进行代码检查
- 使用 Prettier 进行格式化
- 遵循 ES6+ 语法规范

### 数据库操作

- 优先使用 Frappe ORM
- 批量操作时使用 SQL 优化性能
- 注意 N+1 查询问题

### API 设计

- 使用 `@frappe.whitelist()` 装饰器
- 统一返回格式: `{status: "success|error", message: "...", data: {...}}`
- 添加适当的错误处理和日志记录

## 部署注意事项

1. **权限设置**: 确保正确的文件和目录权限
2. **数据库配置**: 配置正确的数据库连接
3. **静态文件**: 确保静态文件正确构建和部署
4. **环境变量**: 配置必要的环境变量

## 故障排除

### 常见问题

1. **页面加载慢**: 检查数据库查询是否优化
2. **审批流程不工作**: 检查审批人配置和权限
3. **数据导入失败**: 检查模板格式和数据验证

### 日志位置

- Frappe 日志: `logs/`
- 错误日志: 通过 Frappe 后台查看

## 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 创建 Pull Request

确保所有测试通过并通过代码质量检查。

## 许可证

MIT License