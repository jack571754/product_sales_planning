# 商品销售规划系统 v1.0 优化实施方案

## 📋 目录
1. [当前系统评估](#当前系统评估)
2. [优化目标](#优化目标)
3. [分阶段实施计划](#分阶段实施计划)
4. [技术实施细节](#技术实施细节)
5. [数据库设计变更](#数据库设计变更)

---

## 当前系统评估

### ✅ 已实现功能
- **多月视图**：横向展示多个月份的计划数据
- **Excel导入/导出**：支持批量数据导入和模板下载
- **机制引用**：可批量应用预定义的产品机制
- **批量操作**：批量添加、删除、修改商品
- **自动保存**：输入框失焦时自动保存数据
- **路由管理**：支持店铺和任务的URL参数传递

### ❌ PRD缺失功能
- **任务状态管理**：未开始/进行中/已提交/已驳回
- **智能执行看板**：任务卡片式展示
- **提交/审批流程**：完整的工作流
- **进度追踪**：实时统计和进度条
- **截止日期提醒**：紧急任务标红

---

## 优化目标

### 核心KPI
- **填报效率提升 80%**：通过机制引用和Excel导入
- **数据准确率 > 99%**：通过系统校验和状态反馈
- **流程闭环率 100%**：实现任务下发到审批的完整闭环

---

## 分阶段实施计划

### 🎯 阶段一：核心提效优化（1-2周）

#### 1.1 优化机制引用功能

**当前问题**：
- 机制引用时只能添加到当天日期
- 没有显示机制的详细信息（包含多少商品）
- 重复添加时只是跳过，没有明确提示

**优化方案**：

```python
# 新增API：获取机制列表及详情
@frappe.whitelist()
def get_mechanism_list():
    """
    获取所有可用的产品机制及其详细信息
    """
    mechanisms = frappe.get_all(
        "Product Mechanism",
        fields=["name", "content_summary", "creation"],
        order_by="creation desc"
    )

    # 为每个机制添加产品数量统计
    for mech in mechanisms:
        mech_doc = frappe.get_doc("Product Mechanism", mech.name)
        mech["product_count"] = len(mech_doc.product_list) if mech_doc.product_list else 0
        mech["total_quantity"] = sum([item.quantity or 0 for item in mech_doc.product_list])

    return mechanisms

# 优化机制应用API
@frappe.whitelist()
def apply_mechanisms_enhanced(store_id, task_id, mechanism_names, apply_mode="skip"):
    """
    增强版机制应用

    Args:
        apply_mode: "skip" 跳过已存在 | "accumulate" 累加数量 | "replace" 替换数量
    """
    # ... 实现逻辑
```

**前端改进**：
- 机制选择对话框显示：机制名称、包含商品数、总数量
- 添加"应用模式"选项：跳过/累加/替换
- 显示详细的应用结果：成功X条，跳过Y条，失败Z条

#### 1.2 优化Excel导入功能

**当前问题**：
- 导入时只支持单月数据
- 错误提示不够详细
- 没有导入预览功能

**优化方案**：

```python
@frappe.whitelist()
def preview_import_data(file_url):
    """
    预览导入数据（不实际保存）
    返回：前10行数据 + 校验结果
    """
    # 读取Excel
    # 校验产品编码
    # 返回预览数据和错误列表

@frappe.whitelist()
def import_commodity_data_enhanced(store_id, task_id, file_url, preview_confirmed=False):
    """
    增强版导入
    - 支持多月导入
    - 详细的错误报告
    - 导入前预览
    """
    # ... 实现逻辑
```

**前端改进**：
- 两步导入：第一步预览，第二步确认
- 显示导入进度条
- 生成详细的导入报告（成功/失败/警告）

#### 1.3 添加实时统计面板

**新增功能**：
```javascript
// 在页面顶部添加统计卡片
<div class="stats-panel">
    <div class="stat-card">
        <div class="stat-label">已规划SKU</div>
        <div class="stat-value">125 / 500</div>
        <div class="stat-progress">
            <div class="progress-bar" style="width: 25%"></div>
        </div>
    </div>
    <div class="stat-card">
        <div class="stat-label">总计划量</div>
        <div class="stat-value">12,580</div>
    </div>
    <div class="stat-card">
        <div class="stat-label">完成度</div>
        <div class="stat-value">25%</div>
    </div>
</div>
```

---

### 🎯 阶段二：任务状态管理（2-3周）

#### 2.1 扩展Schedule Tasks DocType

**新增字段**：
```python
# Schedule tasks DocType 新增字段
{
    "status": {
        "fieldtype": "Select",
        "options": "Draft\nIn Progress\nSubmitted\nApproved\nRejected",
        "default": "Draft"
    },
    "deadline": {
        "fieldtype": "Date",
        "label": "截止日期"
    },
    "priority": {
        "fieldtype": "Select",
        "options": "Low\nMedium\nHigh\nUrgent",
        "default": "Medium"
    },
    "assigned_stores": {
        "fieldtype": "Table",
        "options": "Task Store Assignment"  # 子表
    },
    "completion_rate": {
        "fieldtype": "Percent",
        "label": "完成率",
        "read_only": 1
    }
}
```

**新增子表 DocType：Task Store Assignment**
```python
{
    "store_id": "Link to Store List",
    "status": "Select (Not Started|In Progress|Submitted|Approved|Rejected)",
    "submitted_by": "Link to User",
    "submitted_date": "Datetime",
    "approved_by": "Link to User",
    "approved_date": "Datetime",
    "rejection_reason": "Text"
}
```

#### 2.2 实现提交/审批流程

**新增API**：
```python
@frappe.whitelist()
def submit_task_plan(store_id, task_id):
    """
    提交任务计划
    - 校验：至少有1个商品
    - 更新状态为 Submitted
    - 发送通知给审批人
    """
    pass

@frappe.whitelist()
def approve_task_plan(store_id, task_id, comments=""):
    """
    审批通过
    """
    pass

@frappe.whitelist()
def reject_task_plan(store_id, task_id, reason):
    """
    驳回任务
    """
    pass
```

---

### 🎯 阶段三：智能执行看板（1-2周）

#### 3.1 创建Dashboard Page

**新建Page：task_dashboard**

```javascript
// task_dashboard.js
class TaskDashboard {
    constructor(wrapper, page) {
        this.wrapper = wrapper;
        this.page = page;
        this.init();
    }

    init() {
        this.render_filters();
        this.load_tasks();
    }

    load_tasks() {
        frappe.call({
            method: "product_sales_planning.api.get_my_tasks",
            callback: (r) => {
                this.render_task_cards(r.message);
            }
        });
    }

    render_task_cards(tasks) {
        // 渲染任务卡片
        // 按状态分组：待处理、进行中、已完成
    }
}
```

**任务卡片设计**：
```html
<div class="task-card" data-status="in-progress">
    <div class="task-header">
        <h4>双11大促</h4>
        <span class="badge badge-warning">进行中</span>
    </div>
    <div class="task-meta">
        <div class="deadline urgent">
            <i class="fa fa-clock"></i>
            距截止还有 2 天
        </div>
        <div class="progress-info">
            <span>完成度：45%</span>
            <div class="progress">
                <div class="progress-bar" style="width: 45%"></div>
            </div>
        </div>
    </div>
    <div class="task-stats">
        <span>已规划：125/500 SKU</span>
        <span>总量：12,580</span>
    </div>
    <div class="task-actions">
        <button class="btn btn-primary btn-sm">继续填报</button>
    </div>
</div>
```

#### 3.2 实现任务统计API

```python
@frappe.whitelist()
def get_my_tasks(user=None):
    """
    获取当前用户的任务列表
    """
    if not user:
        user = frappe.session.user

    # 获取用户关联的店铺
    stores = get_user_stores(user)

    tasks = []
    for store in stores:
        # 获取该店铺的所有任务
        task_list = frappe.get_all(
            "Schedule tasks",
            filters={"status": ["!=", "Cancelled"]},
            fields=["name", "task_name", "deadline", "priority", "status"]
        )

        for task in task_list:
            # 计算完成度
            stats = get_task_statistics(store, task.name)
            task.update(stats)
            tasks.append(task)

    return tasks

def get_task_statistics(store_id, task_id):
    """
    计算任务统计数据
    """
    # 已规划SKU数
    planned_count = frappe.db.count("Commodity Schedule", {
        "store_id": store_id,
        "task_id": task_id
    })

    # 总计划量
    total_qty = frappe.db.sql("""
        SELECT SUM(quantity)
        FROM `tabCommodity Schedule`
        WHERE store_id = %s AND task_id = %s
    """, (store_id, task_id))[0][0] or 0

    # 目标SKU数（可从任务配置中获取）
    target_count = 500  # 示例值

    return {
        "planned_count": planned_count,
        "target_count": target_count,
        "total_quantity": total_qty,
        "completion_rate": (planned_count / target_count * 100) if target_count > 0 else 0
    }
```

---

## 技术实施细节

### 1. 数据唯一性约束

**在Commodity Schedule DocType中添加唯一索引**：

```python
# 在 commodity_schedule.py 的 validate 方法中
def validate(self):
    # 检查唯一性
    existing = frappe.db.exists("Commodity Schedule", {
        "store_id": self.store_id,
        "task_id": self.task_id,
        "code": self.code,
        "sub_date": self.sub_date,
        "name": ["!=", self.name]
    })

    if existing:
        frappe.throw(f"商品 {self.code} 在该任务和日期下已存在")
```

### 2. 自动保存优化

**当前实现已经很好，建议增加**：
- 保存队列：避免频繁请求
- 离线缓存：网络断开时暂存本地
- 冲突检测：多人同时编辑时的处理

```javascript
class SaveQueue {
    constructor() {
        this.queue = [];
        this.saving = false;
        this.timer = null;
    }

    add(data) {
        this.queue.push(data);
        this.debounce_save();
    }

    debounce_save() {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.process_queue();
        }, 500);
    }

    async process_queue() {
        if (this.saving || this.queue.length === 0) return;

        this.saving = true;
        const batch = this.queue.splice(0, 10); // 每次处理10条

        try {
            await this.batch_save(batch);
        } finally {
            this.saving = false;
            if (this.queue.length > 0) {
                this.process_queue();
            }
        }
    }
}
```

### 3. 权限控制

**建议的权限矩阵**：

| 角色 | 查看任务 | 填报数据 | 提交 | 审批 | 删除任务 |
|------|---------|---------|------|------|---------|
| 店铺负责人 | ✅ 自己店铺 | ✅ | ✅ | ❌ | ❌ |
| 区域经理 | ✅ 所辖区域 | ✅ | ✅ | ✅ | ❌ |
| 总部管理员 | ✅ 全部 | ✅ | ✅ | ✅ | ✅ |

**实现方式**：
```python
# 在 hooks.py 中配置
permission_query_conditions = {
    "Schedule tasks": "product_sales_planning.permissions.get_task_permission_query_conditions",
    "Commodity Schedule": "product_sales_planning.permissions.get_schedule_permission_query_conditions"
}
```

---

## 数据库设计变更

### 新增/修改的DocType

#### 1. Schedule tasks（修改）
```
新增字段：
- status (Select)
- deadline (Date)
- priority (Select)
- target_sku_count (Int)
- assigned_stores (Table)
```

#### 2. Task Store Assignment（新建）
```
字段：
- parent (Link to Schedule tasks)
- store_id (Link to Store List)
- status (Select)
- submitted_by (Link to User)
- submitted_date (Datetime)
- approved_by (Link to User)
- approved_date (Datetime)
- rejection_reason (Text)
```

#### 3. Commodity Schedule（修改）
```
新增字段：
- is_from_mechanism (Check) - 标记是否来自机制
- mechanism_name (Data) - 记录来源机制
- last_modified_by (Link to User)
- last_modified_date (Datetime)

新增索引：
- UNIQUE INDEX on (store_id, task_id, code, sub_date)
```

---

## 实施时间表

| 阶段 | 任务 | 预计时间 | 优先级 |
|------|------|---------|--------|
| 阶段一 | 优化机制引用 | 3天 | P0 |
| 阶段一 | 优化Excel导入 | 3天 | P0 |
| 阶段一 | 实时统计面板 | 2天 | P1 |
| 阶段二 | 扩展DocType | 2天 | P0 |
| 阶段二 | 提交审批流程 | 5天 | P0 |
| 阶段三 | 智能看板 | 5天 | P1 |
| 阶段三 | 任务统计API | 3天 | P1 |

**总计：约 3-4 周**

---

## 风险与应对

### 风险1：数据迁移
**风险**：现有数据可能不符合新的唯一性约束
**应对**：
1. 先在测试环境执行数据清洗脚本
2. 生成重复数据报告
3. 人工确认后再迁移

### 风险2：性能问题
**风险**：大量SKU时页面加载慢
**应对**：
1. 实现虚拟滚动（只渲染可见行）
2. 后端分页优化
3. 添加Redis缓存

### 风险3：用户习惯
**风险**：用户不习惯新流程
**应对**：
1. 提供详细的操作手册
2. 录制视频教程
3. 设置"新手引导"功能

---

## 成功指标

### 量化指标
- **填报时间**：从平均 2小时 降至 20分钟（↓ 83%）
- **数据错误率**：从 5% 降至 < 1%（↓ 80%）
- **任务完成率**：从 70% 提升至 95%（↑ 36%）

### 用户反馈
- 用户满意度 > 4.5/5
- 功能使用率 > 80%
- 重复培训次数 < 2次/人

---

## 下一步行动

1. **立即执行**：
   - [ ] 评审本优化方案
   - [ ] 确定优先级和时间表
   - [ ] 分配开发资源

2. **本周内**：
   - [ ] 创建开发分支
   - [ ] 开始阶段一开发
   - [ ] 准备测试数据

3. **两周内**：
   - [ ] 完成阶段一开发
   - [ ] 内部测试
   - [ ] 收集反馈

---

**文档版本**：v1.0
**最后更新**：2025-11-29
**负责人**：开发团队
**审核人**：产品经理
