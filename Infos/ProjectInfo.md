# Project Synapse

## 1. 项目背景 (Project Background)
**Synapse** 是一个前沿的 **LLM 集成平台 (LLM Integration Platform)**，旨在为用户提供统一、高效且极简的 AI 交互体验。它不仅仅是一个聊天客户端，更是一个集成了多模态能力和高级协议扩展的生产力工具。

### 核心能力 (Core Capabilities)
*   **深度思考 (Deep Thinking)**: 支持推理模型（Reasoning Models），在交互中展示思考过程（如 UI 中的 `streaming-dots` 动画），处理复杂逻辑任务。
*   **文生图 (Text2Img)**: 集成图像生成能力，支持在对话流中直接生成视觉资产。
*   **MCP (Model Context Protocol)**: 支持模型上下文协议，拥有独立的 **MCP Market**，允许用户发现、安装和管理协议扩展，连接本地或远程数据源与工具。
*   **本地优先 (Local-First)**: 强调数据隐私与安全，侧边栏状态指示 "Local Status"，确保敏感数据存储在本地。

---

## 2. 技术栈 (Tech Stack)

本项目将基于 **Electron** 构建跨平台桌面应用，采用 **React + TypeScript** 作为核心开发框架。

### 核心架构 (Core Architecture)
*   **Runtime**: [Electron](https://www.electronjs.org/) (Main Process + Renderer Process)
*   **Framework**: [React](https://react.dev/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Routing**: [React Router](https://reactrouter.com/) (用于管理 Conversation, Market, Settings 等页面视图)

### 样式与 UI (Styling & UI)
鉴于对设计还原度的高要求，我们将从当前的 Tailwind CSS 原型迁移至 **CSS-in-JS** 方案：

*   **Styling Engine**: [Styled Components](https://styled-components.com/)
    *   *决策背景*: 替代 Tailwind CSS，以获得更强的组件封装能力和动态样式控制。
*   **Reset/Normalize**: `styled-normalize` (确保跨平台一致性)
*   **Color/Helper**: `polished` (用于在 JS 中处理颜色透明度、混合等，替代 Tailwind 的 `bg-black/10` 等语法)
*   **Icons**: [Lucide React](https://lucide.dev/) (替换 Iconify，提供更好的 React 组件化支持)
*   **Typography**: `@fontsource/inter` (Inter 字体，本地集成)

### 交互与动画 (Interaction & Animation)
*   **Animation**: [Motion](https://motion.dev/docs/react)
    *   *应用场景*: 侧边栏切换、页面路由过渡、AI 思考时的加载动画、模态框弹出等。

---

## 3. 设计规范 (Design Specifications)

### 视觉风格 (Visual Style)
*   **设计语言**: Modern Minimalist (现代极简主义)
*   **配色方案**: Monochromatic Grayscale (单色灰阶)。
    *   主要使用白色 (`#ffffff`)、不同深度的灰色 (`#fcfcfc`, `#f5f5f5`, `#eeeeee`, `#999999`, `#4a4a4a`) 和黑色。
    *   强调 **Restraint (克制)**，通过微妙的边框 (`border`) 和留白来构建层次，而非重阴影。
*   **字体**: **Inter**。强调 Soft Typography，字重与行高经过精细调整。

### 交互模式 (Interaction Patterns)
*   **侧边栏 (Sidebar)**: 采用 **Context-Aware (上下文感知)** 设计。
    *   **基准 (Baseline)**: 包含 Logo、主导航 (Conversations, MCP Market, Settings) 和底部状态栏。
    *   **Conversations View**: 显示“新建对话”按钮和“最近历史记录”列表。
    *   **Market/Settings View**: 隐藏对话历史，仅保留主导航，最大化内容区域专注度。
---

## 4. 目录结构规划 (Directory Structure Plan)

```
src/
├── main/                 # Electron Main Process
│   ├── main.ts
│   └── preload.ts
├── renderer/             # React Renderer Process
│   ├── components/       # Shared Components (Button, Input, Sidebar...)
│   ├── pages/            # Page Views
│   │   ├── Conversation/
│   │   ├── Market/
│   │   └── Settings/
│   ├── styles/           # Global Styles & Theme
│   │   ├── GlobalStyle.ts
│   │   └── theme.ts      # Design tokens (colors, spacing)
│   ├── App.tsx
│   └── index.tsx
├── shared/               # Shared Types/Utils
└── assets/               # Static Assets (Fonts, Images)
```
