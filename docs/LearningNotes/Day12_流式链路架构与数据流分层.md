# Day 12 — 流式链路架构与数据流分层

> 本次对话围绕"V1 流式输出该怎么落地"展开。用户在确认 `streamEvents.ts` 完成后，面临的核心困惑是：**不清楚流式输出的完整数据链路应该怎么拆文件、怎么组织、各层之间的数据长什么样**。过程中暴露的问题集中在 AsyncGenerator 的控制能力、SSE 协议细节、Provider Adapter 的放置、以及 StreamEvent 和 Message 之间的转换关系。

---

## 模块 1：AsyncGenerator 的流式控制能力——`.return()` 与取消机制

**Q：** 用户对 `AsyncGenerator<StreamEvent>` vs 回调函数的选型有初步判断——"AsyncGenerator 可以随时根据数据返回结果进行调整"，但对**取消流**的具体机制（`.return()` + `try...finally`）没有概念。后续追问时，用户以为是 Generator 自己调用 `.return()`，并且混淆了 `try` 和 `finally` 各自的职责：

> "return 是不是要卸载这个 Generator，try 中写获取字节流，finally 的时候要 return，卸载，让一切活动停止"

**A：** 角色搞反了。`.return()` 是**消费者**调用的，不是 Generator 自己调的。

完整流程：

```
用户点"停止生成"
  → Renderer 通过 IPC 发取消信号
    → Main Process 消费者调用 generator.return()
      → Generator 内部从 yield 处跳到 finally 块
        → finally 里调用 abortController.abort()
          → fetch 的 HTTP 连接断开
            → 一切停止
```

Generator 内部的职责分工：

```ts
async function* fetchCompletions(/* ... */): AsyncGenerator<StreamEvent> {
  const controller = new AbortController()
  const response = await fetch(url, { signal: controller.signal, /* ... */ })

  try {
    // 主循环：从 sseParser 拿 chunk → adapter 转 StreamEvent → yield
    for await (const chunk of parseSSE(response.body!)) {
      const event = adapter.toStreamEvent(chunk)
      yield event  // ← 消费者调 .return() 时，执行会从这里跳到 finally
    }
  } finally {
    // 清理：无论正常结束还是被 .return() 中断，都会执行
    controller.abort()  // 断开 HTTP 连接，停止接收数据
  }
}
```

**关键知识点：**
- AsyncGenerator 是**拉取模式（pull-based）**，消费者用 `for await...of` 主动要下一个值；回调是**推送模式（push-based）**
- `.return()` 由消费方调用，用于"我不要了，你停下来"——Generator 会跳到 `finally` 块执行清理
- `try` 里放正常工作流（循环 + yield），`finally` 里放资源清理（abort fetch、关闭连接）
- 回调模式下需要手动维护 `cancelled` 标志位 + 手动 abort，AsyncGenerator 把控制流和清理天然绑在语言机制里

---

## 模块 2：Provider Adapter 不应和 sseParser 放一起

**Q：** 用户正确判断了"adapter 不应写在 client.ts 内部"，但随后说"和 sseParser 写一起"。

**A：** 两者属于完全不同的抽象层：

| 文件 | 层级 | 变化原因 |
|---|---|---|
| `sseParser.ts` | SSE 协议层 | 只有 SSE 标准变了才变（几乎不会） |
| `providers/anthropic.ts` | 厂商翻译层 | Anthropic 改了 API 格式就要变 |
| `providers/minimax.ts` | 厂商翻译层 | MiniMax 改了 API 格式就要变 |

如果放一起，加第二个厂商时就要在同一个文件写 `if (provider === 'anthropic') ... else if (provider === 'minimax') ...`，违反开闭原则（对扩展开放、对修改封闭）。

正确的数据管道：

```
Response.body (字节流)
  → sseParser.ts (通用, 1 个文件)
    → 原始 JSON chunk
      → providers/anthropic.ts (厂商专属, 每家 1 个文件)
        → StreamEvent
```

对应目录结构：

```
src/main/llm/
├── client.ts              # 建立连接，组装管道
├── sseParser.ts           # 通用 SSE 协议解析
└── providers/
    ├── anthropic.ts       # Anthropic JSON → StreamEvent
    └── minimax.ts         # MiniMax JSON → StreamEvent
```

**关键知识点：**
- 按**变化原因**拆文件，不按"看起来相关"拆——SSE 协议稳定不变，厂商格式经常变
- 开闭原则：加新厂商时只新建文件，不改已有代码
- 管道思维：每层只做一种转换，输入输出清晰

---

## 模块 3：fetchCompletions 的参数设计——遗漏 messages + 参数聚合

**Q：** 用户设计函数签名时列出了 `fetchCompletions(provider, modelId, apiKey, baseUrl)`，遗漏了最关键的参数 `messages`，同时四个连接参数也没有聚合：

> "fetchCompletions(provider, modelId, apiKey, baseUrl)，返回的是从模型 endpoint 上拿回来的数据"

**A：**

两个问题：

1. **遗漏 messages**：调 LLM API 的请求体里最关键的就是对话历史 messages，没有它模型不知道用户说了什么。
2. **参数过多未聚合**：`provider, modelId, apiKey, baseUrl` 四个参数描述的都是"用哪个厂商的哪个模型，怎么连接它"——当参数超过 3 个且语义聚合时，应该收进一个配置对象。

**关键知识点：**
- 设计函数签名时，先想"调用方要达成什么目标"→ 反推出必须提供什么输入
- 3+ 个同类语义参数应收进对象，提升可读性和可扩展性
- 返回类型应精确：不是"数据"，而是 `AsyncGenerator<StreamEvent>`

---

## 模块 4：Message 是应用领域模型，不是 API 请求模型

**Q：** 用户看着 `conversation.ts` 中的 `Message` 类型不确定：

> "这里 Message 的定义是针对网络层接收的信息还是 Renderer 层的被我们的逻辑转换后的信息？"

**A：** 看字段就能判断：

- `id` — LLM API 不需要消息 ID，这是应用给每条消息的唯一标识
- `timestamp` — API 不关心时间戳，这是本地记录的
- `conversationId` — 用来关联本地存储的会话，API 完全不知道这个概念

所以 `Message` 是 **Renderer 层的应用领域模型**。

而 LLM API 需要的格式远比这简单：`{ role: "user", content: "你好" }`。在调 `fetchCompletions` 之前，需要把应用层的 `Message[]` **转换**成 API 层需要的格式。这个 API 请求类型应定义在 `src/main/llm/` 下，因为只有 Main Process 的 LLM 调用链路需要它，Renderer 不需要知道 API 请求长什么样。

**关键知识点：**
- 同名概念在不同层有不同结构：应用层 Message ≠ API 层 message
- 判断类型归属：看字段是为谁服务的——如果有 `id`、`timestamp` 等应用概念，就是领域模型
- 跨层调用时需要做 DTO（Data Transfer Object）转换，不要让 API 层直接依赖领域模型

---

## 模块 5：StreamEvent → Message 的转换关系

**Q：** 用户对 StreamEvent 和 Message 之间的关系产生了较大困惑，一次性问了多个交织的问题：

> "我该怎么从 ThinkingEvent、ContentEvent 转换为各种 Message？这些 Message 又会是什么样子？......ThinkingEvent 等是什么，拼装后应该变成什么样子，拼装后的 Message 的标准是 conversation.ts 中的标准吗"

**A：** StreamEvent 和 Message 是**完全不同的生命阶段**：

- **StreamEvent** = 流式传输中的**瞬时碎片**（过程态）。每个 ThinkingEvent 只携带几个字的增量 delta。
- **Message** = 最终**沉淀下来的完整记录**（终态）。存进 IndexedDB，下次打开能加载。

两者的关系是 **accumulate（累积）**：

```
ThinkingEvent("让我") → ThinkingEvent("分析") → ThinkingEvent("一下")
    → 累积为 "让我分析一下"
    → finalizeMessage 时写入 content: [{ type: 'thinking', text: '让我分析一下' }]

ContentEvent("根据") → ContentEvent("你的问题") → ContentEvent("，我建议...")
    → 累积为 "根据你的问题，我建议..."
    → finalizeMessage 时写入 content: [{ type: 'text', text: '根据你的问题，我建议...' }]
```

最终一条 assistant Message 长这样：

```ts
{
  id: "xxx",
  role: "assistant",
  content: [
    { type: "thinking", text: "让我分析一下..." },  // ← 累积的思考
    { type: "text", text: "根据你的问题，我建议..." } // ← 累积的正文
  ],
  timestamp: 1712345678,
  conversationId: "conv_xxx"
}
```

是的，最终拼装的标准就是 `conversation.ts` 中的 `Message` 接口。

**关键知识点：**
- 流式系统中，"传输中的碎片"和"最终存储的记录"是两种完全不同的数据结构
- StreamEvent 是 delta（增量），Message 是 snapshot（快照）——累积过程发生在 Renderer store 中
- `finalizeMessage` 的职责：把 `currentThinking` 和 `currentContent` 两个缓冲字符串，转换为 `Message.content[]` 数组中的 `ThinkingContent` 和 `TextContent` 内容块

---

## 模块 6：ThinkingContent 的字段设计——不需要 messageId

**Q：** 用户在给 `MessageContent` 联合添加 `ThinkingContent` 时，认为需要 `type`、`text` 和 `messageId` 三个字段。

**A：** `messageId` 不需要。看已有的 `TextContent`、`ImageContent`——它们都没有 `messageId`。原因：内容块是嵌套在 `Message.content[]` 数组里的，父级 `Message` 已经有 `id`，不需要每个子块重复存一遍。

最终正确设计：

```ts
export type ThinkingContent = {
    type: 'thinking',
    text: string,
}
```

**关键知识点：**
- 嵌套结构中，子元素不需要重复存父元素的 ID——通过结构关系就能隐式获得归属
- 设计新类型时，先看同层已有类型的模式，保持一致性

---

## 模块 7：过度设计的冲动——V1 不需要重构 Role 和 MessageContent

**Q：** 用户在添加 `ThinkingContent` 后，开始扩散思考，想重构 `Role` 和 `MessageContent` 的整体设计：

> "我们以后要渲染图片，要根据 role 来分别渲染......深度思考的内容又没有在此了"

**A：** 这是一个过度设计信号。`role` 和 `content[].type` 是两个正交的维度：

- `role`（user / assistant / tool）→ 决定消息气泡的方向、头像、颜色
- `content[].type`（text / image / thinking / tool_call / tool_result）→ 决定每个内容块具体怎么渲染

它们不应混在一起。并且已有的 `MessageContent` 联合已经预留了扩展点——图片渲染、tool_call 渲染是 V2+ 的事，V1 只需加 `ThinkingContent` 就够了。

**关键知识点：**
- 分清"正交维度"：`role` 管"谁说的"，`content[].type` 管"说了什么"
- 判别联合天然支持扩展——加新 variant 只需新增类型 + 加入联合，不需要改已有代码
- V1 只做 V1 的事，克制过度设计的冲动

---

## 模块 8：SSE 协议的事件分隔规则——`\n` vs `\n\n`

**Q：** 被问到 SSE 协议的分隔规则时，用户回答：

> "一般是 \n 或 \r"

**A：** 混淆了两个层级：

- **行内**：单个 `\n` 分隔的是同一个事件内的不同字段（如 `event:`、`data:`、`id:`）
- **事件间**：**连续两个 `\n`**（即空行 `\n\n`）才表示一个完整事件的结束

```
data: {"choices":[...]}\n\n     ← 第一个事件（\n\n 结束）
data: {"choices":[...]}\n\n     ← 第二个事件
data: [DONE]\n\n                ← 结束信号
```

`data: [DONE]` 不是 JSON，不要尝试 `JSON.parse`。遇到它时停止循环、退出 generator。连接的关闭由 ReadableStream 自然结束处理。

**关键知识点：**
- SSE 事件以 `\n\n`（空行）为边界，不是单个 `\n`
- 单个 `\n` 是同一事件内的行分隔符
- TCP 拆包可能导致一次 `read()` 拿到半条 data 行或多个完整事件——需要缓冲区拼接 + 按 `\n\n` 切割
- `data: [DONE]` 是特殊终止信号，不可解析为 JSON

---

## 模块 9：V1 的消息持久化职责归属

**Q：** 用户不确定"把模型返回结果写入 Messages"的职责归谁，猜测是未来的 queryEngine：

> "目前并没有这个文件，这个职责应该由未来的 queryEngine 来做是吗？"

**A：** V1 没有 queryEngine。V1 的数据流中，消息持久化由 **Renderer 侧的 conversation store** 负责：

```
Renderer Store: sendMessage()
  → IPC → Main: fetchCompletions()
    → StreamEvent 逐个通过 IPC 推回 Renderer
      → Store: appendStreamEvent() 累积
        → 收到 DoneEvent → finalizeMessage() 写入 messages[]
```

`fetchCompletions` 是纯管道，不持有状态、不做持久化。V2 加入 tool_call 自循环后，queryLoop 才需要在 Main 侧管理消息编排。

**关键知识点：**
- V1 架构中，Main Process 是**无状态的流式管道**，Renderer Store 是**状态持有者**
- 不要因为"未来可能需要"就提前引入不存在的模块——先用最简方案跑通闭环
- `fetchCompletions` 的纯管道特性（输入 messages + config，输出 AsyncGenerator）使得 V2 加 queryLoop 时完全不用改它

---

## 汇总表

| 能力层 | 知识点 |
|--------|--------|
| 异步编程 | AsyncGenerator 是 pull-based；`.return()` 由消费者调用；`try/finally` 绑定资源清理 |
| SSE 协议 | `\n\n` 是事件边界不是 `\n`；`data: [DONE]` 是终止信号不可 JSON.parse；需缓冲区处理 TCP 拆包 |
| 文件组织 | 按变化原因拆文件（sseParser vs provider adapter）；开闭原则驱动目录结构 |
| 类型设计 | 应用层 Message ≠ API 层 message；嵌套子元素不重复存父 ID；正交维度不要混合 |
| 数据流分层 | StreamEvent 是 delta（增量碎片），Message 是 snapshot（最终记录）；累积发生在 store 层 |
| 工程纪律 | V1 只做 V1 的事——克制过度设计；先跑通最简闭环再增量演进 |
