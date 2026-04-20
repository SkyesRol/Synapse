# Day 1: Project Synapse 架构与实战复盘

本文档记录了 "Project Synapse" 第一天开发过程中遇到的关键技术问题、知识盲区分析及最终解决方案。

## 目录 (Table of Contents)

1.  [路由架构 (React Router in Electron)](#1-路由架构-react-router-in-electron)
2.  [TypeScript 与 Vite 配置](#2-typescript-与-vite-配置)
3.  [应用入口与布局架构 (Entry vs Layout)](#3-应用入口与布局架构-entry-vs-layout)
4.  [组件化与样式封装 (Styled Components)](#4-组件化与样式封装-styled-components)
5.  [JavaScript 核心机制](#5-javascript-核心机制)
6.  [CSS 布局技巧](#6-css-布局技巧)

---

## 1. 路由架构 (React Router in Electron)

### 🔴 问题现象
在初始化路由时，不确定该使用哪种 Router，以及如何正确配置 `App.tsx` 作为 Layout。

### 🧠 知识盲区
*   **Router 类型的选择**：不知道 Electron 环境下 `BrowserRouter` 和 `HashRouter` 的区别。
*   **嵌套路由 (Nested Routes)**：不清楚如何通过 `Outlet` 实现父子路由渲染。

### ✅ 解决方案
1.  **选择 `createHashRouter`**：
    *   **原理**：Electron 打包后通常使用 `file://` 协议加载资源。`BrowserRouter` 依赖 History API (pushState)，需要服务器配合重定向所有请求到 `index.html`。在本地文件系统下，这会失效（刷新 404）。
    *   **做法**：必须使用 `HashRouter`（URL 带 `#`），例如 `file:///app/index.html#/market`。
2.  **Layout 模式**：
    *   `App.tsx` 不仅仅是页面，而是 **Shell (外壳)**。
    *   使用 `<Outlet />` 组件作为占位符，子路由匹配到的组件会自动替换掉 `<Outlet />`。

**代码示例**：
```typescript
// routes.tsx
const router = createHashRouter([
  {
    path: '/',
    element: <App />, // App 包含 <Outlet />
    children: [
      { index: true, element: <Conversations /> }, // 默认子页
      { path: 'market', element: <MCPMarket /> }
    ]
  }
]);
```

---

## 2. TypeScript 与 Vite 配置

### 🔴 问题现象
1.  报错：`'MCPMarket' refers to a value, but is being used as a type here`。
2.  报错：`Failed to resolve import "@/routes"`。

### 🧠 知识盲区
*   **文件扩展名敏感性**：不知道 `.ts` 文件默认不支持 JSX 语法，必须用 `.tsx`。
*   **路径别名 (Path Alias)**：误以为在 `tsconfig.json` 配置了 `@/*` 就万事大吉，不知道构建工具 (Vite) 也需要配置。

### ✅ 解决方案
1.  **重命名文件**：凡是包含 JSX 代码（`<Tag />`）的文件，后缀必须是 `.tsx`。
2.  **双重配置别名**：
    *   `tsconfig.json`: 让编辑器 (VS Code) 识别路径，提供智能提示。
    *   `vite.config.ts`: 让打包工具 (Vite) 真正能解析路径。

**Vite 配置**：
```typescript
// vite.config.ts
import path from 'path';
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  }
});
```

---

## 3. 应用入口与布局架构 (Entry vs Layout)

### 🔴 问题现象
混淆了 `index.tsx` 和 `App.tsx` 的职责，甚至在 `index.tsx` 里同时渲染了 `<App />` 和 `<RouterProvider />` 导致双重渲染。

### 🧠 知识盲区
*   **入口点 vs 根组件**：不理解 React 应用的启动流程。

### ✅ 核心概念
| 文件 | 角色 | 职责 |
| :--- | :--- | :--- |
| **index.tsx** | **启动器 (Bootstrapper)** | 1. 挂载 React 到 DOM (`root`)。<br>2. 注入全局 Context (Router, Redux, Theme)。<br>3. **不写 UI 逻辑**。 |
| **App.tsx** | **布局框架 (Layout)** | 1. 定义页面结构 (Sidebar + Content)。<br>2. 放置 `<Outlet />`。<br>3. 包含全局 UI (Header, Sidebar)。 |

---

## 4. 组件化与样式封装 (Styled Components)

### 🔴 问题现象
1.  在 `Sidebar.tsx` 里直接定义 `const NavItem = styled.div`，然后试图给它传 `icon` 等非 HTML 属性，导致 React 警告。
2.  不理解为什么 Styled Components 的 props 需要加 `$` 前缀（如 `$isActive`）。
3.  纠结是否需要将 `NavItem` 拆分为独立文件。

### 🧠 知识盲区
*   **瞬态属性 (Transient Props)**：不知道 Styled Components 如何过滤 props。
*   **组件封装原则**：不知道何时该拆分组件。

### ✅ 解决方案
1.  **瞬态属性 `$`**：
    *   如果一个属性只是为了计算样式（如 `$isActive`），不需要显示在 HTML 标签上，必须加 `$` 前缀。
    *   `Styled Components` 看到 `$` 会自动消费掉该属性，不透传给 DOM。
2.  **组件拆分**：
    *   **原则**：当一个组件包含了自己的逻辑（点击、状态）或样式较复杂时，应独立文件。
    *   **实战**：将 `NavItem` 独立为 `NavItem.tsx`，接收 `icon`, `label`, `onClick` 等 Props。

---

## 5. JavaScript 核心机制

### 🔴 问题现象
在循环渲染菜单时，不理解为什么要写成 `onClick={() => handleNavigate(item.path)}`，而不是 `onClick={handleNavigate}`。

### 🧠 知识盲区
*   **闭包 (Closures)**：不理解函数作用域和变量捕获。
*   **事件传参**：不理解 React 事件绑定机制。

### ✅ 深度解析
*   **错误写法** `onClick={handleNavigate}`：相当于把函数引用直接给子组件。子组件调用时不知道参数，导致参数为 `undefined` 或 `Event` 对象。
*   **正确写法** `onClick={() => handleNavigate(item.path)}`：
    *   创建了一个**匿名箭头函数**。
    *   利用**闭包**特性，这个箭头函数“记住”了当前的 `item.path`。
    *   当点击发生时，执行箭头函数 -> 进而执行带参数的 `handleNavigate`。

---

## 6. CSS 布局技巧

### 🔴 问题现象
希望 Sidebar 能有固定的宽度，但在缩放时又能保持一定的灵活性（有最大/最小限制）。

### 🧠 知识盲区
*   **Fluid Layout (流体布局)**：不知道如何结合百分比和固定像素。
*   **CSS 函数**：不了解 `clamp()`。

### ✅ 解决方案
使用 `clamp()` 函数实现“响应式边界”。

```css
/* 理想宽度 20vw，但最小不小于 220px，最大不大于 320px */
width: clamp(220px, 20vw, 320px);
flex-shrink: 0; /* 关键：防止被右侧内容挤压 */
```

---

## 总结 (Summary)

Day 1 的核心成就在于搭建了 **Project Synapse** 的骨架：
1.  建立了基于 `HashRouter` 的 Electron 路由系统。
2.  理清了 `Layout` (App.tsx) 与 `Entry` (index.tsx) 的关系。
3.  实现了模块化的 `Sidebar` 组件，并掌握了组件通信（Props & Callback）。
4.  解决了 TypeScript 和构建工具的一系列配置问题。

**Next Steps:**
*   完善 Sidebar 的视觉样式。
*   开始构建右侧的 `Conversations` 聊天界面。
