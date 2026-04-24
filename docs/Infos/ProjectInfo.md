# Project Synapse

## 1. 项目背景 (Project Background)
**Synapse** 是一个基于 **Electron** 的本地优先 AI 交互平台，核心定位是 **面向学生的智能学习助手**。

它不仅仅是一个 LLM 聊天客户端，而是通过独创的 **树形上下文记忆 (Tree-shaped Context Memory)** 架构，解决学生在学习过程中的 **"递归式学习困境"**——即在解决一个问题的过程中不断遇到前置知识缺口，越走越偏，最终忘了最初要解决什么。

### 核心理念 (Core Philosophy)
> **"像你的大脑一样思考，但比你的大脑更有条理。"**

学生在主线问题中遇到子问题时，可以开启独立的分支对话深入探究，分支解决后自动生成摘要注入主线，确保主线上下文始终精简且完整。

### 核心能力 (Core Capabilities)
*   **树形上下文记忆 (Tree Context)**: 支持对话分支，主线/子线上下文隔离与摘要注入，模拟人脑"挂起主任务 → 深入子问题 → 回溯主线"的思维模式。
*   **深度思考 (Deep Thinking)**: 支持推理模型（Reasoning Models），在交互中展示思考过程（如 UI 中的 `streaming-dots` 动画），处理复杂逻辑任务。
*   **文生图 (Text2Img)**: 集成图像生成能力，支持在对话流中直接生成视觉资产。（V2+）
*   **MCP (Model Context Protocol)**: 支持模型上下文协议，拥有独立的 **MCP Market**，允许用户发现、安装和管理协议扩展，连接本地或远程数据源与工具。（V2+）
*   **本地优先 (Local-First)**: 强调数据隐私与安全，所有对话数据存储在本地 IndexedDB 中。

---

## 2. 产品规划 (Product Roadmap)

### V1.0 — MVP：树形对话核心闭环

**目标**：验证"树形上下文在学习场景中是否真正有用"。

#### MVP 核心链路（5 步闭环）

```
Step 1 → 选择/创建一个 Assistant（带 System Prompt、模型配置）
  │
Step 2 → 在主对话中提出一个学习问题，收到流式回复
  │
Step 3 → 对话过程中遇到子问题，手动点击「开启子分支」
  │        ├─ 子分支继承主线上下文（从根到分支点的路径）
  │        └─ 子分支内独立对话
  │
Step 4 → 子分支问题解决后，手动点击「完成并返回主线」
  │        ├─ 系统自动生成该分支的一句话摘要（复用对话模型 + summarize prompt）
  │        └─ 摘要作为一条特殊消息注入主线上下文
  │
Step 5 → 回到主线继续对话，主线模型已知晓子分支的结论
```

#### V1.0 包含的功能
- [x] 侧边栏 UI（已完成）
- [x] Assistant 管理（System Prompt / Temperature / Top_P / Stream 配置）
- [ ] LLM 对话核心逻辑（API 调用、流式响应）
- [ ] 树形消息数据结构（每条 message 携带 `parentMessageId`）
- [ ] 用户手动创建/切换/完成分支
- [ ] 分支完成时自动摘要 & 注入主线
- [ ] 子分支上下文隔离（子分支上下文 = 根到分支点的路径 + 子分支自身消息）

#### V1.0 明确不做的功能
| 功能                         | 推迟原因                                  |
| ---------------------------- | ----------------------------------------- |
| Agent 自动分支判断（双模型） | 先用手动分支验证体验，再引入自动判断      |
| 知识基因跨会话继承           | 需要额外知识库系统，复杂度过高            |
| 知识树可视化（交互式地图）   | 前端工作量大，核心对话没跑通前无意义      |
| 苏格拉底追问模式             | System Prompt 工程，后期随时可加          |
| 论文/PDF 解析                | 需要文件处理管线，V1 不碰                 |
| MCP Market 集成逻辑          | UI 已有，集成留到 V2                      |
| 文生图                       | 完全独立的能力，不影响核心链路            |
| Tools / Function Calling     | V1 纯对话验证，无需 tools                 |
| 实时上下文压缩               | V1 仅在分支完成时做一次摘要，不做实时压缩 |

---

### V2.0 — 智能 Agent 学习导师

**目标**：引入双模型架构，让 Agent 主动参与学习过程管理。

#### 核心特性
- **双模型架构**：
  - **对话模型**：负责与学生进行学习对话
  - **判断模型**（轻量/低成本）：负责实时分析对话，判断是否出现需要分支的子问题
- **分支协商机制**：
  - 用户手动分支优先级 > Agent 建议
  - 当两者不一致时，Agent 需给出分支/不分支的理由
- **MCP 集成**：连接外部知识源和工具
- **Tools / Function Calling**：赋予 Agent 实际操作能力

### V3.0 — 个性化学习平台（远期愿景）
- 知识基因跨会话继承（Agent 记住学生已掌握的概念）
- 知识树可视化（交互式探索地图 + 成就系统）
- 苏格拉底追问模式
- 论文/复杂文档的"拆弹式"阅读
- 编程学习的"调试式对话"
- 考试复习的薄弱点地图

---

## 3. 技术栈 (Tech Stack)

### 核心架构 (Core Architecture)
*   **Runtime**: [Electron](https://www.electronjs.org/) (Main Process + Renderer Process)
*   **Framework**: [React](https://react.dev/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Routing**: [React Router](https://reactrouter.com/)
*   **Local Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [idb](https://github.com/nicedoc/idb) (Google)

### 样式与 UI (Styling & UI)
*   **Styling Engine**: [Styled Components](https://styled-components.com/)
*   **Reset/Normalize**: `styled-normalize`
*   **Color/Helper**: `polished`
*   **Icons**: [Lucide React](https://lucide.dev/)
*   **Typography**: `@fontsource/inter` (Inter 字体，本地集成)

### 交互与动画 (Interaction & Animation)
*   **Animation**: [Motion](https://motion.dev/docs/react)
    *   *应用场景*: 侧边栏切换、页面路由过渡、AI 思考时的加载动画、分支切换过渡、模态框弹出等。

---

## 4. 设计规范 (Design Specifications)

### 视觉风格 (Visual Style)
*   **设计语言**: Modern Minimalist (现代极简主义)
*   **配色方案**: Monochromatic Grayscale (单色灰阶)
    *   主要使用白色 (`#ffffff`)、不同深度的灰色 (`#fcfcfc`, `#f5f5f5`, `#eeeeee`, `#999999`, `#4a4a4a`) 和黑色。
    *   强调 **Restraint (克制)**，通过微妙的边框 (`border`) 和留白来构建层次，而非重阴影。
*   **字体**: **Inter**。强调 Soft Typography，字重与行高经过精细调整。

### 交互模式 (Interaction Patterns)
*   **侧边栏 (Sidebar)**: 采用 **Context-Aware (上下文感知)** 设计。
    *   **基准 (Baseline)**: 包含 Logo、主导航 (Conversations, MCP Market, Settings) 和底部状态栏。
    *   **Conversations View**: 显示"新建对话"按钮和"最近历史记录"列表。
    *   **Market/Settings View**: 隐藏对话历史，仅保留主导航，最大化内容区域专注度。
*   **树形对话 (Tree Conversation)**: 
    *   主线对话为默认视图，子分支通过明确的 UI 入口进入。
    *   子分支内提供"完成并返回"操作，触发自动摘要。
    *   已完成的分支在主线中以折叠的摘要卡片形式展示。

---

## 5. 目录结构规划 (Directory Structure Plan)

```
src/
├── electron.d.ts           # Window 全局类型扩展（electronAPI）
├── routes.tsx              # 路由配置
├── main/                   # Electron Main Process
│   ├── main.ts             # 入口：生命周期 + 窗口 + 注册
│   ├── preload.ts          # contextBridge 暴露 electronAPI
│   ├── ipc/                # IPC Handler 模块
│   │   ├── llmHandlers.ts  # send-message / abort-stream
│   │   └── windowHandlers.ts
│   └── llm/                # LLM 调用链路（Main Process 侧）
│       ├── client.ts       # 流式管道总装层，fetch + 错误归一化
│       ├── sseParser.ts    # 通用 SSE 协议解析
│       └── providers/
│           └── minimaxAdapter.ts  # MiniMax 厂商 adapter
├── renderer/               # React Renderer Process
│   ├── App.tsx
│   ├── index.tsx
│   ├── components/         # 共享 UI 组件
│   │   ├── Sidebar/        # 侧边栏（NavItem, AssistantItem 等）
│   │   ├── Conversations/  # 历史记录（HistoryItem, HistoryMenu, Navbar）
│   │   ├── Modals/         # 弹窗（CreateAssistant, AssistantSettings, Global）
│   │   ├── SearchBar.tsx
│   │   ├── SliderTrack.tsx
│   │   ├── StreamResponse.tsx
│   │   └── Switch.tsx
│   ├── hooks/
│   │   ├── useChat.ts      # 流式对话核心 Hook（发送 + 接收 + finalize）
│   │   └── useClickOutside.ts
│   ├── lib/
│   │   └── db.ts           # IndexedDB schema（idb）
│   ├── pages/
│   │   ├── Chat/           # 主对话页
│   │   ├── Conversation/   # 对话视图（含分支，V1+）
│   │   ├── Market/         # MCP Market（V2）
│   │   └── Settings/       # 设置页（Provider 配置等）
│   ├── services/           # 业务数据访问层
│   │   ├── assistantService.ts
│   │   └── conversationService.ts
│   ├── store/              # Zustand 状态管理
│   │   ├── useAssistantStore.ts
│   │   └── useConversationStore.ts
│   ├── styles/
│   │   └── GlobalStyle.ts
│   └── types/              # Renderer 侧 TypeScript 类型
│       ├── assistant.ts
│       ├── conversation.ts
│       ├── models.ts       # ModelConfig（模型采样参数）
│       └── providers.ts    # ProviderConfig / LLMProvider / LLMModel
├── shared/                 # Main + Renderer 共享类型与工具
│   ├── streamEvents.ts     # 流式事件协议（StreamEvent 判别联合）
│   ├── types.ts            # CallConfig / ModelMessage / ModelMessages
│   └── utils.ts
└── assets/                 # 静态资源
    └── AssistantAvatar.tsx
```

---

## 6. 关键架构决策记录 (Architecture Decision Records)

### ADR-001: 树形消息结构
- **决策**: 每条 message 携带 `parentMessageId` 字段，构成树形结构。
- **理由**: 即使 V1.0 UI 以线性+手动分支呈现，底层数据模型必须支持树形，避免未来数据迁移。

### ADR-002: 上下文组装策略
- **决策 (V1.0)**: 子分支的上下文 = 从根节点到分支点的完整路径 + 子分支自身消息。
- **后续演进**: V2 引入压缩模式（路径上的历史消息可被摘要替代）。

### ADR-003: 分支摘要生成
- **决策 (V1.0)**: 复用当前对话模型 + 专用 summarize prompt，在用户手动"完成分支"时触发一次摘要。
- **后续演进**: V2 由判断模型独立处理。

### ADR-004: 双模型架构（V2 预规划）
- **决策**: 对话模型与判断模型分离。判断模型使用轻量/低成本模型，负责分析是否需要分支。
- **理由**: 避免单模型 prompt 污染；判断模型调用频繁但 token 消耗低，适合用小模型降低成本。
- **分支优先级**: 用户手动操作 > Agent 建议，冲突时 Agent 需说明理由。

### ADR-005: 本地数据库选型
- **决策**: IndexedDB via Google idb 库。
- **注意**: 树形结构的查询（祖先路径提取）需在应用层实现递归逻辑，IndexedDB 不支持 SQL 递归 CTE。
