## 阶段四：今日落地计划 🔧

### 你今天要交付的成果

> **用户在输入框发送消息 → 调用 LLM API → 流式渲染回复文字 + 思考过程动画**

---

### 拆解为 3 个可执行任务

#### 任务 1：LLM Service 层（`services/llm/`）

这是纯逻辑层，不涉及 UI：

```
services/llm/
├── client.ts          # 封装 fetch 调用，处理 SSE 流式响应
├── parser.ts          # 解析 SSE 的 data 行，提取 content / reasoning_content
└── types.ts           # 请求/响应类型定义
```

**关键决策点：**

- **不要用 openai 官方 SDK**。你是 Electron 环境，直接用 `fetch` 调用 `/v1/chat/completions` + `stream: true`，自己解析 SSE。可控性更强，且避免 SDK 在 Electron 里的兼容坑。
- **统一适配层**：不同模型厂商的流式返回格式略有不同（特别是思考内容的字段名），在 `parser.ts` 里做一层归一化，输出统一的结构：

```typescript
// 建议的统一流式事件类型
type StreamEvent = 
  | { type: 'thinking'; content: string }    // 思考过程片段
  | { type: 'content'; content: string }     // 正文回复片段
  | { type: 'done' }                         // 结束
  | { type: 'error'; error: string }         // 错误
```

- **SSE 解析注意**：`data: [DONE]` 是结束信号。每个 `data:` 行是一个 JSON chunk，`choices[0].delta` 里取增量内容。思考内容通常在 `reasoning_content` 或类似字段中（取决于你用的模型提供商）。

#### 任务 2：消息状态管理（`stores/`）

你需要一个 store 来管理当前对话的消息列表和流式状态：

```typescript
// 核心状态结构（不管你用 zustand/jotai/context，结构类似）
interface ConversationState {
  messages: Message[]
  streamingStatus: 'idle' | 'thinking' | 'streaming' | 'error'
  currentThinking: string    // 实时累积的思考内容
  currentContent: string     // 实时累积的回复内容

  // actions
  sendMessage: (content: string) => Promise<void>
  appendStreamEvent: (event: StreamEvent) => void
  finalizeMessage: () => void  // 流结束时，把累积内容写入 messages[]
}
```

**关键点：**

- `sendMessage` 调用时，先把用户消息 push 进 `messages[]`，然后调 LLM service，拿到流式响应后逐步调 `appendStreamEvent`
- **不要在每个 SSE chunk 到达时都更新 `messages[]` 数组**。用独立的 `currentContent` / `currentThinking` 字段累积，流结束后再 `finalizeMessage` 一次性写入。这样避免高频数组操作导致的性能问题

#### 任务 3：UI 渲染层

**正文流式输出：**
- 直接读 `currentContent`，渲染为逐字出现的效果（实际上 SSE 本身就是逐片段到达，你只需要把 state 映射到 DOM，React 的响应式更新自然就是"打字机效果"）

**思考过程层：**
- 当 `streamingStatus === 'thinking'` 时，显示思考容器
- 思考容器内展示 `currentThinking` 的实时内容
- 配合你提到的 `streaming-dots` 动画（思考中的脉动点）
- 当状态从 `thinking` 切换到 `streaming` 时，思考容器可折叠/收起，正文开始输出

```
┌─────────────────────────────┐
│ 💭 Thinking...              │  ← streamingStatus === 'thinking'
│ streaming-dots animation    │
│ "让我分析一下这个问题..."    │  ← currentThinking (实时更新)
└─────────────────────────────┘
                ↓ 状态切换
┌─────────────────────────────┐
│ ▸ 思考过程 (点击展开)        │  ← 折叠态
├─────────────────────────────┤
│ 根据你的问题，我建议...█     │  ← currentContent (流式输出中)
└─────────────────────────────┘
```

---

### 建议的执行顺序

```
1. [30min] 先写 types.ts，定义好 StreamEvent / Message / 请求参数类型
     ↓
2. [60min] 写 client.ts + parser.ts，用一个临时按钮测试能不能跑通流式调用
     ↓       ⚠️ 到这一步先用 console.log 验证，不要急着接 UI
     ↓
3. [45min] 写 store，把 sendMessage → appendStreamEvent → finalizeMessage 链路跑通
     ↓
4. [60min] 接入 UI，先做纯文字流式渲染
     ↓
5. [45min] 加入思考层 UI + 状态切换动画
```

---

### 一个容易踩的坑提前预警

**Electron 的 `fetch` 和浏览器不完全一致。** 在 Renderer Process 中直接 `fetch` 外部 API 可能遇到 CORS 问题。两个方案：

- **方案 A**（推荐）：LLM API 调用放在 **Main Process**，通过 `ipcMain/ipcRenderer` 桥接，Main Process 的 Node.js 环境没有 CORS 限制
- **方案 B**：在 Renderer Process 中用，但需要在 `webPreferences` 里配置好安全策略

方案 A 更干净，也为后续 MCP 集成打好基础（MCP 的 tool 调用也需要在 Main Process 执行）。
