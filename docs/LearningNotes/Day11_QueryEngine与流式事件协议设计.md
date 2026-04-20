
# Day 11 — QueryEngine 双层架构与流式事件协议设计

> 本次对话围绕 Claude Code 的 QueryEngine/query 双层架构展开学习，判断 Synapse 项目是否需要引入该设计，最终完成了 V1 轻量版流式事件协议（`streamEvents.ts`）的完整定义。过程中涉及 Electron 进程边界、TypeScript 类型设计、流式状态分层等核心知识点。

---

## 模块 1：Electron Main.ts 的职责边界

**Q：** 用户直觉认为 QueryEngine 放在 `main.ts` 会让文件臃肿，但不确定 `main.ts` 在工程实践中应该放什么逻辑。

**A：** `main.ts` 在 Electron 工程实践中是"装配层"（Composition Root），不是"业务执行层"。可以把它类比为餐厅的前台——前台负责接待、指引、调度，但不亲自下厨。

### main.ts 的 4 类职责

**① 应用生命周期管理**
处理 Electron app 对象的核心事件。这些事件是操作系统级别的，和业务无关：

```ts
// ✅ 属于 main.ts 的职责
app.on('ready', createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
```

**② 窗口创建**
配置 BrowserWindow 的基础参数。注意 `webPreferences` 是安全关键项：

```ts
// ✅ 属于 main.ts 的职责
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,    // 安全：隔离 renderer 和 Node.js
      nodeIntegration: false,    // 安全：renderer 不能直接用 Node API
    },
  })
}
```

**③ 模块装配（注册 IPC 路由）**
main.ts 只负责"把模块注册进来"，不负责模块内部逻辑。就像前台把客人引到对应的窗口，但不处理窗口业务：

```ts
// ✅ 正确：main.ts 只调注册函数
import { registerQueryHandlers } from './query/ipcHandlers'
import { registerSettingsHandlers } from './settings/ipcHandlers'

app.on('ready', () => {
  createWindow()
  registerQueryHandlers()      // Query 模块自己注册自己的 IPC
  registerSettingsHandlers()   // Settings 模块自己注册自己的 IPC
})
```

```ts
// ❌ 错误：把业务逻辑写在 main.ts 里
app.on('ready', () => {
  createWindow()
  ipcMain.handle('send-message', async (event, prompt) => {
    const response = await fetch('https://api.anthropic.com/...', {
      headers: { 'x-api-key': apiKey },
      body: JSON.stringify({ messages: [...], stream: true }),
    })
    // 100 行流式解析逻辑...
    // 50 行错误处理逻辑...
    // 30 行持久化逻辑...
  })
})
```

**④ 安全装配**
Electron 的安全配置集中在 main.ts 和 preload.ts。main.ts 负责声明"允许什么"，preload.ts 负责"暴露什么 API 给 Renderer"：

```ts
// preload.ts — 只暴露最小 API 给 Renderer
contextBridge.exposeInMainWorld('api', {
  sendMessage: (prompt: string) => ipcRenderer.invoke('send-message', prompt),
  onStreamEvent: (callback: (event: StreamEvent) => void) =>
    ipcRenderer.on('stream-event', (_, data) => callback(data)),
  abortStream: () => ipcRenderer.send('abort-stream'),
})
```

### main.ts 不该出现的内容

| 不该出现 | 应该放哪 | 为什么 |
|---|---|---|
| fetch 调用 LLM API | `main/query/` 目录 | 会随厂商增多而膨胀 |
| SSE 流解析逻辑 | `main/providers/` 目录 | 厂商私有协议，变更频繁 |
| IndexedDB 操作 | `renderer/services/` | 属于 Renderer 进程 |
| 消息历史管理 | `main/query/queryEngine.ts` | 会话级状态，独立演进 |
| 错误重试策略 | `main/query/query.ts` | 执行级逻辑，独立测试 |

### Synapse 推荐的 Main 目录结构

```
src/main/
├── main.ts              # 装配层：生命周期 + 窗口 + 模块注册
├── preload.ts           # 安全桥：暴露最小 API 给 Renderer
├── query/               # Query 业务模块
│   ├── query.ts         # 单轮执行循环
│   ├── queryEngine.ts   # 会话编排
│   └── ipcHandlers.ts   # 本模块的 IPC 路由注册
└── providers/           # 厂商插件目录
    ├── base.ts          # 插件接口定义
    ├── anthropic.ts     # Anthropic 适配
    └── openai.ts        # OpenAI 兼容适配
```

**关键知识点：**
- 入口文件要稳定、低变更频率，职责是"组装依赖"而非"执行逻辑"
- Electron Main 进程可以有多个模块文件，不等于只有 `main.ts` 一个文件
- LLM API 调用放 Main 进程可避免 CORS 和密钥暴露问题
- `contextIsolation: true` + `nodeIntegration: false` 是 Electron 安全基线，永远不要关闭
- preload.ts 是 Main 和 Renderer 的唯一合法桥梁，通过 `contextBridge.exposeInMainWorld` 暴露白名单 API

---

## 模块 2：QueryEngine 与 query 的双层职责分离

**Q：** 用户阅读了 Claude Code 的 QueryEngine 全功能分析后，不确定自己的项目是否需要引入这么复杂的设计。

**A：** 需要引入双层思想，但只取 V1 最小子集。Claude Code 的核心分层是：
- **query()**：单轮执行循环（流式解析、事件产出、工具执行、结束条件）
- **QueryEngine**：会话级编排（消息历史、状态切换、持久化时机、终止原因）

Synapse V1 只需实现：流式消费、事件归一化、中断、done 收口。不需要实现权限追踪、结构化输出 hook、snip replay、多 Agent 任务编排等高级特性。

**关键知识点：**
- 架构分层的价值在于"可独立测试和演化"，不在于功能数量
- V1 先验证核心闭环（发送→流式→展示→落库），再增量引入高级能力
- 过度设计和不设计一样危险——提前做预算系统、权限追踪会拖慢交付

---

## 模块 3：TypeScript 判别联合类型（Discriminated Union）与转换层思维

**Q：** 用户第一版事件类型中，四个事件的 `type` 字段都写成了 `string`。但更深层的问题是：用户还没想明白这些 Event 类型"为谁服务、在哪被消费"，所以不知道该怎么设计结构。

```ts
type ThinkingEvent = {
    type: string,  // ← 错误：通用 string
    content: string,
}
```

**A：** 这个问题的根因不是语法层面，而是**没想清楚这个文件在数据流中的位置**。

### 先搞清楚"这个文件到底是什么"

`streamEvents.ts` 不是"存数据的结构"，而是一份**翻译合同**。它约定了：

```
厂商 A 的原始流 ──→ [provider 插件翻译] ──→ StreamEvent ──→ [IPC] ──→ Renderer 消费
厂商 B 的原始流 ──→ [provider 插件翻译] ──→ StreamEvent ──→ [IPC] ──→ Renderer 消费
```

- **生产者**：Main 进程的 provider 插件（把各家格式翻译成统一事件）
- **消费者**：Renderer 的 store/hook（按事件类型分发到 UI）
- **这个文件的职责**：确保两侧说同一种语言

### 为什么理解了位置就知道怎么设计字段

一旦你知道消费方是 Renderer 的 switch/case，设计思路就清晰了：

**消费方的代码长这样：**

```ts
// Renderer 侧消费事件
function handleStreamEvent(event: StreamEvent) {
  switch (event.type) {
    case 'thinking':
      // TS 自动知道 event 是 ThinkingEvent，有 content 字段
      currentThinking += event.content
      break
    case 'content':
      // TS 自动知道 event 是 ContentEvent，有 content 字段
      currentContent += event.content
      break
    case 'done':
      // TS 自动知道 event 是 DoneEvent，有 stopReason 和 usage
      finalizeMessage(currentContent, event.usage)
      break
    case 'error':
      // TS 自动知道 event 是 LLMErrorEvent，有 errorCode 和 message
      showError(event.message)
      break
  }
}
```

**反推回来，每个事件该带什么字段：**

| 事件 | 消费方需要做什么 | 所以需要什么字段 |
|---|---|---|
| thinking | 追加文本到思考缓冲区 | 增量文本（content） |
| content | 追加文本到正文缓冲区 | 增量文本（content） |
| done | 停止动画、落库、记录 usage | 停止原因 + 可选统计 |
| error | 展示错误提示 | 错误码 + 用户可见文案 |

这就是为什么 `done` 不该带 `content`，`error` 不该带 `index`——消费方在那个分支里根本不需要这些字段。

### 类型收窄的语法要求

知道了设计动机后，语法层面的规则很简单：

```ts
// ❌ type: string → TS 在 switch 里无法区分四个事件
type ThinkingEvent = { type: string, content: string }
type ContentEvent  = { type: string, content: string }
// switch (event.type) { case 'thinking': ... }
// 此时 event 仍然是 StreamEvent（全部四种），不会收窄

// ✅ type: 'thinking' → TS 精确收窄
type ThinkingEvent = { type: 'thinking', content: string }
type ContentEvent  = { type: 'content', content: string }
// switch (event.type) { case 'thinking': ... }
// 此时 event 被收窄为 ThinkingEvent，只有 content 字段
```

### 设计协议类型的思维顺序

以后遇到类似设计需求，按这个顺序想：

1. **谁生产、谁消费？** → 确定文件归属（shared/renderer/main）
2. **消费方拿到后做什么？** → 推导每个事件该带什么字段
3. **消费方怎么分发？** → 确定需要判别字段（type 字面量）
4. **生产方的差异在哪？** → 确定哪些字段是可选的（如 usage、debugDetail）

**关键知识点：**
- 判别联合类型要求每个分支有一个固定字面量字段（discriminant）
- `type: string` 和 `type: 'thinking'` 在运行时无区别，但编译时类型收窄能力完全不同
- 适用场景：IPC 事件、Redux action、SSE 消息等任何需要 switch 分发的地方
- **设计协议类型时，先想消费方怎么用、再决定字段——而不是先想生产方有什么数据**
- 不理解文件在数据流中的位置，就无法做出合理的结构设计，这不是语法问题而是架构认知问题

---

## 模块 4：type 联合类型 vs enum 的选型

**Q：** 用户不确定 `StopReason` 和 `ErrorCode` 该用 `type` 联合类型还是 `enum`。

**A：** 对 IPC 通信协议，`type` 联合类型更合适：

| 维度 | `type` 联合 | `enum` |
|---|---|---|
| 运行时产物 | 无（编译时擦除） | 有（生成 JS 对象） |
| IPC 序列化 | 天然字符串兼容 | 也是字符串，但需 import |
| 调试可读性 | 日志直接可读 | 需查枚举定义 |
| 跨进程共享 | 直接传字符串 | 两侧都要 import 模块 |

**关键知识点：**
- IPC 传输本质是字符串序列化，不需要运行时枚举对象
- `enum` 的优势在需要反查（值→键）或遍历的场景，协议定义场景用不到
- 字面量联合类型配合判别联合，是 TypeScript 事件协议的最佳实践

---

## 模块 5：事件语义边界——done 与 error 不能混合

**Q：** 用户第一版把 `errorCode` 放进了 `DoneEvent`，把 `content` 同时放进了 done 和 error：

```ts
type DoneEvent = {
    type: string,
    content: string,        // ← 混淆：done 夹带了内容
    stopReason: StopReason,
}
type LLMErrorEvent = {
    type: string,
    content: string,        // ← 歧义：是错误文案还是响应片段？
    errorCode: ErrorCode,
}
```

**A：** done 和 error 是**互斥的终止路径**，合并会导致消费方需要额外判断"done 里有没有 error"。

- **done** 只承载结束元信息：stopReason + 可选 usage
- **error** 只承载错误信息：errorCode + 用户可见 message + 可选 debugDetail
- **content** 字段只属于增量事件（thinking/content），不属于终止事件

**关键知识点：**
- 事件设计遵循"单一职责"：增量事件负责内容，终止事件负责状态
- 把内容塞进 done/error 会导致"重复拼接"或"状态机分支爆炸"
- 用户可见错误提示和调试信息应分离（message vs debugDetail）

---

## 模块 6：流式协议 vs 渲染状态的分层

**Q：** 用户不清楚 `currentThinking` 应该加在 `streamEvents.ts` 里还是别的地方，以及它和 `ThinkingEvent.content` 有什么区别。

**A：** 两者属于不同层级：

- `ThinkingEvent.content`：**瞬时增量片段**，属于协议层（shared），描述"这一次推送了什么"
- `currentThinking`：**累计缓冲结果**，属于状态层（Renderer store/hook），描述"UI 当前该显示什么"

关系是：`currentThinking += event.content`（每收到 thinking 事件就追加）

协议层只描述"事件长什么样"，状态层描述"UI 累计到哪里"。二者不能混在同一个文件里。

**关键知识点：**
- 流式系统天然存在"事件层"和"状态层"的分离
- 高频增量事件不应直接写入持久化数组（messages[]），用独立缓冲区累积，done 时一次性落库
- 状态分"临时层"（currentThinking/currentContent）和"持久层"（messages[]），避免高频数组操作导致性能问题

---

## 模块 7：共享类型文件的放置位置

**Q：** 用户最初可能会把事件类型放在 `src/renderer/types/` 下（现有类型文件的位置）。

**A：** 流式事件是 Main（生产者）和 Renderer（消费者）之间的通信协议，必须放在 `src/shared/`。如果放 `renderer/types/`，Main 进程要引用就必须跨进程目录 import，违反边界。`src/shared/` 的设计目的就是放"跨进程共享的契约"。

**关键知识点：**
- Electron 的 Main/Renderer 模块不应互相 import 对方目录下的文件
- 跨进程共享的类型、工具函数放 `src/shared/`
- 单侧使用的类型放各自进程目录（如 `renderer/types/` 或 `main/types/`）

---

## 模块 8：Usage 字段的可选性设计

**Q：** 用户最初把 `StreamUsage` 三个字段都写成必填 `number`：

```ts
interface StreamUsage {
    inputTokens: number,      // ← 必填
    outputTokens: number,
    thinkingTokens: number,
}
```

**A：** 应该是 `number | undefined`。原因："拿不到"和"值为 0"是两个完全不同的语义。Minimax 流式模式下 thinkingTokens 根本不存在，如果强制必填就被迫填 0——但 0 意味着"用了 0 个 thinking token"，而实际是"这个厂商没有 thinking 能力"。

**关键知识点：**
- 多厂商适配时，可选字段用 `undefined` 表示"不支持/未提供"，用 `0` 表示"支持但值为零"
- 协议设计要考虑"最弱厂商"的能力下限，不能以最强厂商为标准定必填
- TypeScript 的 `number | undefined` 和 `number?`（可选属性）语义略有不同，前者更显式

---

## 汇总表

| 能力层 | 知识点 |
|--------|--------|
| Electron 架构 | main.ts 是装配层不是业务层；LLM 调用放 Main 避免 CORS |
| 架构设计 | QueryEngine/query 双层分离：会话编排 vs 执行循环 |
| TypeScript 类型 | 判别联合类型必须用字面量 type；type 联合优于 enum 做 IPC 协议 |
| 事件协议设计 | done/error 互斥不混合；增量事件不携带终止信息；用户提示与调试信息分离 |
| 流式状态分层 | 协议层（事件片段）vs 状态层（累计缓冲）vs 持久层（消息历史） |
| 跨进程边界 | 共享类型放 shared/；Usage 用 undefined 区分"不支持"与"值为零" |
