# 案例库管理系统 - 技术架构文档

## 1. 项目概述

### 项目名称
案例库管理系统 (Case Library Management System)

### 项目类型
单页应用 (Single Page Application)

### 核心功能
一个具有高级筛选功能的案例库管理界面，支持通过时间、类型、金额三个维度进行精准筛选和搜索。

### 目标用户
- 企业法务人员
- 律师和法律顾问
- 案例研究人员和学术工作者
- 企业管理人员

## 2. 技术架构

### 核心技术栈

#### 前端框架
- **HTML5**：语义化标签结构
- **CSS3**：现代CSS特性，包括CSS变量、Grid、Flexbox
- **Vanilla JavaScript**：原生JavaScript，无框架依赖

#### 样式方案
- **CSS变量**：实现主题系统
- **BEM命名规范**：组件样式命名
- **CSS Grid + Flexbox**：响应式布局

#### 动画方案
- **CSS Transitions**：状态变化动画
- **CSS Animations**：复杂动画效果
- **Intersection Observer**：滚动触发动画

### 项目结构

```
/workspace
├── index.html          # 主页面
├── SPEC.md             # 规格说明文档
└── .trae
    └── documents
        ├── PRD.md      # 产品需求文档
        └── TA.md       # 本文档
```

## 3. 文件结构详解

### 3.1 index.html

#### 文档结构
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <!-- 元信息 -->
    <!-- 字体加载 -->
    <!-- 内联CSS样式 -->
</head>
<body>
    <!-- 导航栏 -->
    <!-- 筛选区域 -->
    <!-- 案例列表 -->
    <!-- 分页器 -->
    <!-- JavaScript代码 -->
</body>
</html>
```

#### 主要区块

**导航栏 (Header)**
- Logo和标题
- 统计概览数字
- 操作按钮

**筛选区域 (Filter Section)**
- 日期范围选择器
- 案例类型多选器
- 金额范围滑块
- 筛选标签显示
- 清除筛选按钮

**案例列表 (Case List)**
- 案例卡片网格
- 空状态提示
- 加载状态骨架屏

**分页器 (Pagination)**
- 页码按钮组
- 上一页/下一页按钮
- 总页数和当前页显示

## 4. 核心组件实现

### 4.1 导航栏组件

#### HTML结构
```html
<header class="navbar">
    <div class="navbar-brand">
        <h1>案例库</h1>
    </div>
    <div class="navbar-stats">
        <span class="stat-item">总案例: <strong>1,234</strong></span>
    </div>
</header>
```

#### CSS样式
- 固定顶部定位
- 深色背景 (#1a1a2e)
- 白色文字
- 滚动时添加阴影

### 4.2 筛选器组件

#### 日期范围选择器
```html
<div class="filter-group">
    <label>时间筛选</label>
    <div class="date-range-picker">
        <input type="date" id="startDate">
        <span>至</span>
        <input type="date" id="endDate">
    </div>
</div>
```

#### 类型选择器
```html
<div class="filter-group">
    <label>案例类型</label>
    <div class="type-selector">
        <button class="type-btn" data-type="civil">民事案例</button>
        <button class="type-btn" data-type="criminal">刑事案例</button>
        <!-- 更多类型 -->
    </div>
</div>
```

#### 金额滑块
```html
<div class="filter-group">
    <label>金额范围</label>
    <div class="range-slider">
        <input type="range" min="0" max="10000000" step="10000">
        <div class="range-display">
            <span id="minAmount">0</span>
            <span>至</span>
            <span id="maxAmount">10,000,000</span>
        </div>
    </div>
</div>
```

### 4.3 案例卡片组件

#### HTML结构
```html
<article class="case-card">
    <header class="card-header">
        <span class="case-type">民事案例</span>
        <span class="case-id">#2024-001</span>
    </header>
    <h3 class="case-title">合同纠纷案例</h3>
    <p class="case-summary">案例摘要描述...</p>
    <footer class="card-footer">
        <span class="case-amount">¥500,000</span>
        <time class="case-date">2024-01-15</time>
    </footer>
</article>
```

#### 样式特点
- 白色背景
- 12px圆角
- 多层阴影效果
- Hover上浮动画

### 4.4 分页器组件

#### HTML结构
```html
<nav class="pagination">
    <button class="page-btn prev" disabled>上一页</button>
    <div class="page-numbers">
        <button class="page-num active">1</button>
        <button class="page-num">2</button>
        <button class="page-num">3</button>
    </div>
    <button class="page-btn next">下一页</button>
</nav>
```

## 5. 数据流设计

### 5.1 数据模型

```javascript
const caseData = {
    id: String,           // 案例ID
    title: String,        // 案例标题
    type: String,        // 案例类型
    amount: Number,       // 涉及金额
    date: Date,          // 发生日期
    summary: String,      // 案例摘要
    status: String       // 案例状态
}
```

### 5.2 筛选状态管理

```javascript
const filterState = {
    dateRange: {
        start: Date | null,
        end: Date | null
    },
    types: String[],     // 选中的类型数组
    amountRange: {
        min: Number,
        max: Number
    }
}
```

### 5.3 筛选逻辑

```javascript
function filterCases(cases, filters) {
    return cases.filter(c => {
        // 时间筛选
        if (filters.dateRange.start && c.date < filters.dateRange.start) return false;
        if (filters.dateRange.end && c.date > filters.dateRange.end) return false;
        
        // 类型筛选
        if (filters.types.length > 0 && !filters.types.includes(c.type)) return false;
        
        // 金额筛选
        if (c.amount < filters.amountRange.min || c.amount > filters.amountRange.max) return false;
        
        return true;
    });
}
```

### 5.4 分页逻辑

```javascript
function paginateCases(cases, page, perPage) {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return {
        data: cases.slice(start, end),
        totalPages: Math.ceil(cases.length / perPage),
        currentPage: page
    };
}
```

## 6. 交互设计

### 6.1 动画时间表

| 动画类型 | 时长 | 缓动函数 |
|---------|------|---------|
| 卡片hover | 300ms | cubic-bezier(0.4, 0, 0.2, 1) |
| 页面加载 | 600ms | ease-out |
| 筛选切换 | 200ms | ease-in-out |
| 标签移除 | 150ms | ease-out |

### 6.2 事件处理

#### 筛选事件
- `change`：日期选择、类型切换
- `input`：金额滑块拖动
- `click`：清除筛选、标签移除

#### 卡片交互
- `mouseenter`：触发hover效果
- `mouseleave`：恢复默认状态
- `click`：进入详情（预留）

### 6.3 状态反馈

- 加载中：骨架屏动画
- 无结果：空状态提示
- 筛选激活：筛选标签显示
- 错误状态：友好错误提示

## 7. 响应式断点

| 断点 | 宽度 | 布局 | 列数 |
|------|------|------|------|
| 桌面 | ≥1200px | 3列网格 | 3 |
| 平板 | 768-1199px | 2列网格 | 2 |
| 手机 | <768px | 单列堆叠 | 1 |

## 8. 浏览器兼容

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 9. 性能优化

### 首屏优化
- 内联关键CSS
- 预加载字体
- 骨架屏占位

### 运行时优化
- 事件委托
- 防抖处理滑块输入
- 虚拟滚动（数据量大时）

### 渲染优化
- CSS transform动画（GPU加速）
- will-change提示
- 避免重排重绘
