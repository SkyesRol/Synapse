# Session 总结与交接

## ✅ 已完成

### 阶段 A：Assistant 管理体系（已交付）
- **Split Storage 策略**：Zustand + LocalStorage 管元数据，IndexedDB 存完整配置
- **Service/Store/UI 三层打通**：Sidebar 渲染、CreateModal 创建、SettingsModal 按需加载+保存
- **级联删除**：删 Assistant 自动清 Conversation + Message

### 阶段 B：流式输出协议与架构设计（Day 11-12）
- **`src/shared/streamEvents.ts`** ✅ — 完整的流式事件协议
  - 四类事件：`ThinkingEvent` / `ContentEvent` / `DoneEvent` / `LLMErrorEvent`
  - 判别联合 + 字面量 type，支持 switch 类型收窄
  - `Usage` 字段用 `number | undefined` 区分"不支持"与"值为零"
- **`src/renderer/types/conversation.ts`** ✅ — 新增 `ThinkingContent` 类型，删除冗余 `deepThinking` 字段
- **`src/main/llm/` 目录结构** ✅ — 已创建骨架

### 阶段 C：流式调用链路实现（Day 13-14 已完成）
- **`src/main/llm/sseParser.ts`** ✅ — 通用 SSE 协议解析
  - 输入 `ReadableStream<Uint8Array>`，输出 `AsyncGenerator<SSEFrame>`
  - 缓冲区拼接处理 TCP 拆包，按 `\n\n` 切事件，`data: [DONE]` 终止
  - `finally` 释放 reader 锁
- **`src/main/llm/providers/minimaxAdapter.ts`** ✅ — 第一个厂商 adapter
  - 输入 `AsyncGenerator<SSEFrame>`，输出 `AsyncGenerator<StreamEvent>`
  - 解析 `reasoning_content` → `ThinkingEvent`，`content` → `ContentEvent`
  - `finish_reason` 通过 `Record<string, StopReason>` 映射表归一化
  - delta 空值守卫、finish_reason 在 content 之后检查、解析异常直接 throw
  - 请求体须携带 `reasoning_split: true` 才能触发 `delta.reasoning_content` 分离
- **`src/main/llm/client.ts`** ✅ — 流式管道总装层
  - 入参：`messages: ModelMessage[]`、`config: ModelConfig`（含 apiKey/baseUrl）、`signal: AbortSignal`
  - 组装 OpenAI 兼容格式请求体（snake_case 字段映射 + `reasoning_split: true`）
  - fetch → sseParser → minimaxAdapter → for await yield 管道串联
  - HTTP 错误归一化：401/403 → `auth_error`，429 → `rate_limit`，5xx → `provider_error`
  - 异常归一化：`AbortError` → `DoneEvent { aborted }`，`TypeError` → `network_error`，其他 → `provider_error`
  - `message` 优先取服务端响应体文本，取不到用 HTTP 状态码兜底
  - `AbortController` 由外部（IPC Handler）持有，函数只接收 `AbortSignal`
- **架构决策已确认**：
  - LLM 调用放 Main Process（避免 CORS + 密钥暴露）
  - AsyncGenerator 作为流式接口（pull-based，下游驱动上游逐帧读取）
  - sseParser 和 provider adapter 分离（SSE 协议层 vs 厂商翻译层）
  - client.ts 作为错误归一化总枢纽，IPC Handler 无需处理任何异常
  - V1 不引入 queryLoop/queryEngine——Renderer Store 直接消费 StreamEvent

### 后续步骤（client.ts 之后）

## ⏭️ 下一步：Step 4 — IPC 桥接

#### Step 4：IPC 桥接
- Main Process 侧注册 IPC handler，调 fetchCompletions，逐个 StreamEvent 推送回 Renderer
- Preload 暴露 `sendMessage` / `onStreamEvent` / `abortStream`

#### Step 5：Renderer Store
- `sendMessage` → push 用户消息 → IPC 调 Main
- `appendStreamEvent` → 累积 `currentThinking` / `currentContent`
- `finalizeMessage` → DoneEvent 时一次性写入 `messages[]`（含 ThinkingContent + TextContent）

#### Step 6：UI 渲染
- 流式文本输出（直接读 `currentContent`）
- 思考过程动画（`currentThinking` + streaming-dots）
- 状态切换：thinking → streaming → idle

---

## 💾 同步信息

> **当前进度**：sseParser、minimaxAdapter、client.ts 均已完成，流式调用链路（Main Process 侧）全部打通。
> **下一步入手点**：Step 4 IPC 桥接——Main Process 注册 handler 调用 `fetchCompletions`，逐个 `StreamEvent` 推回 Renderer；Preload 暴露 `sendMessage` / `onStreamEvent` / `abortStream`。
