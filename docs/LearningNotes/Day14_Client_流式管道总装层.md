# Day 14 — client.ts：流式管道总装层的设计与实现

> 本次对话完成了 `src/main/llm/client.ts` 的完整设计与实现，打通了 fetch → sseParser → minimaxAdapter 的端到端流式链路，并深入理解了异步生成器的惰性驱动机制、错误归一化策略和 AbortController 的跨层控制问题。

---

## 模块 1：对 client.ts 职责的误解

**Q：** sseParser 和 minimaxAdapter 都已经写好了，client.ts 是不是只是"调用一下它们"这么简单？消息的拼装是不是也在这里做？

**A：** client.ts 不只是调用，它是整条链路的**总装层 + 错误归一化层 + 对外唯一出口**，具体负责：

1. 接收上层传入的消息列表和模型配置，**组装 HTTP 请求体**
2. 调用 `fetch` 发出网络请求
3. 把 `response.body` 依次交给 `parseSSEEvents` → `minimaxAdapter`
4. 把 adapter 产出的每个 `StreamEvent` 向外 yield
5. 把所有异常（网络失败、HTTP 错误、用户取消、adapter 解析异常）统一归一化为 `StreamEvent`

**消息拼装不在这里**——这里只消费已经是干净 `ModelMessage[]` 格式的入参。业务层消息（含 id、时间戳、ThinkingContent）的转换是 Renderer Store 的职责（Step 5）。

**关键知识点：**
- client.ts 是 Main Process 里的网络层，不持有任何业务概念（消息 id、时间戳等）
- 架构分层：业务消息格式（IndexedDB） ≠ API 请求消息格式（OpenAI 兼容的 role+content）
- IPC Handler（下游）只需无脑转发 `StreamEvent`，不做任何错误处理

---

## 模块 2：函数签名设计——参数命名大小写错误

**Q：** 函数签名写成了：

```ts
async function* fetchCompletions(
    ModelMessages: ModelMessages, ModelConfig: ModelConfig
)
```

**A：** TypeScript 约定：**PascalCase 是类型/接口名，camelCase 是变量名**。`ModelMessages` 和 `ModelConfig` 在这里是参数变量名，必须用小写开头。错误原因是混淆了"类型名"和"变量名"的命名规范。

```ts
// ❌ 错误
async function* fetchCompletions(ModelMessages: ModelMessages, ModelConfig: ModelConfig)

// ✅ 正确
async function* fetchCompletions(messages: ModelMessages, config: ModelConfig, signal: AbortSignal)
```

**关键知识点：**
- TypeScript 中类型和变量是两个不同的命名空间，但约定上 PascalCase 专属类型，camelCase 专属变量
- 同名的类型和变量在同一作用域内是合法的，但会造成可读性混乱

---

## 模块 3：AbortController 的归属——"放在内部"的架构漏洞

**Q：** AbortController 放在 client.ts 内部创建不是更合理吗？请求是这里发出的，控制权应该在这里。

**A：** 这个逻辑有一个根本漏洞——**谁创建，谁才能调用 `.abort()`**。

完整的取消流程如下：

```
用户点击"停止" (Renderer UI)
    ↓ IPC 调用
Main Process IPC Handler
    ↓ 调用 controller.abort()
fetch 感知到 AbortSignal 被触发
    ↓ 抛出 AbortError
client.ts catch → yield DoneEvent { stopReason: 'aborted' }
```

IPC Handler 必须能调用 `abort()`，所以 `AbortController` 必须在 IPC Handler 里创建，只把 `controller.signal` 作为参数传给 `fetchCompletions`。

```ts
// IPC Handler 侧
const controller = new AbortController();
const gen = fetchCompletions(messages, config, controller.signal);

// 用户取消时
controller.abort();

// fetchCompletions 签名
async function* fetchCompletions(
    messages: ModelMessages,
    config: ModelConfig,
    signal: AbortSignal     // ← 只接收 signal，控制权在外部
)
```

**关键知识点：**
- `AbortController` 产生 `signal`，持有 `controller` 的一方拥有取消控制权
- 函数只需要接收 `AbortSignal`（只读），不需要持有 `AbortController`（可写）
- 这是"控制权与执行权分离"原则：谁需要取消，谁持有 controller

---

## 模块 4：try/catch 包裹位置——for await 内外的语义差别

**Q：** try/catch 是包在 `for await` 外面还是里面？有什么区别？

**A：**

```ts
// 包在外面——任何错误都终止整个流
try {
  for await (const event of streamEvents) {
    yield event;
  }
} catch (e) {
  yield LLMErrorEvent;
}

// 包在里面——单帧出错可以跳过，流继续
for await (const event of streamEvents) {
  try {
    yield event;
  } catch (e) {
    yield LLMErrorEvent;
  }
}
```

LLM 调用场景应选**外面**：报错就是报错，没有"跳过这帧继续生成"的业务意义。包在外面能覆盖 fetch 本身的异常、HTTP 错误检查之后的流错误、adapter 解析异常，是一次性统一捕获。

**关键知识点：**
- try/catch 在外面 = 流级别错误处理（任何异常终止整个生成器）
- try/catch 在里面 = 帧级别错误处理（容错，适合日志解析等允许跳过坏行的场景）
- 异步生成器的 catch 能捕获 `for await` 消费过程中抛出的所有异常，包括来自上游生成器的异常

---

## 模块 5：reasoning_split 参数的来源与 delta 字段对应关系

**Q：** 看到官方文档里 `reasoning_details` 字段，以为 minimaxAdapter 里读 `delta.reasoning_content` 是错的，需要改为 `delta.reasoning_details`。

**A：** 这是混淆了**非流式响应**和**流式 SSE delta** 两套数据格式：

| 场景 | 字段路径 | 说明 |
|---|---|---|
| 非流式完整响应 | `message.reasoning_details[0].text` | 整个对话结束后的汇总对象 |
| 流式 SSE 增量 | `delta.reasoning_content` | 每个 chunk 里的增量片段 |

`minimaxAdapter` 读 `delta.reasoning_content` **是正确的**，但前提是请求体必须包含 `reasoning_split: true`，否则服务端不会将思考内容分离到这个字段，而是混入 `delta.content` 里以 `<think>` 标签包裹。

```ts
// payload 里必须加这个字段
const payload = {
  model: config.modelId,
  messages,
  stream: true,
  reasoning_split: true,   // ← 触发思考内容分离
  // ...
}
```

**关键知识点：**
- 同一厂商同一模型，流式和非流式的响应结构是两套不同 schema
- `extra_body` 是 Python SDK 的写法；原生 HTTP 请求中，扩展参数直接作为顶层字段放在请求体里
- 不加 `reasoning_split` 时，`delta.reasoning_content` 永远是 `undefined`，思考内容会混入正文

---

## 模块 6：是否引入 OpenAI SDK 的架构决策

**Q：** MiniMax 支持 OpenAI 兼容格式，为什么不直接安装 OpenAI SDK 来简化 fetch 和解析？

**A：** 这是一个合理的问题，但引入 SDK 会破坏已有架构的核心价值：

| | 原生 fetch + 手写 parser/adapter | OpenAI SDK |
|---|---|---|
| sseParser 存在意义 | ✅ 通用 SSE 协议层 | ❌ SDK 内部已封装 |
| adapter 扩展性 | ✅ 可加 geminiAdapter、anthropicAdapter | ❌ 非 OpenAI 兼容厂商无法覆盖 |
| 依赖重量 | 轻 | 重 |
| 学习价值 | 高 | 低 |

架构投资已经完成（sseParser + minimaxAdapter），client.ts 的 fetch 代码量极少，引入 SDK 只会让部分厂商走 SDK、部分走手写 adapter，造成双轨混乱。

**关键知识点：**
- 架构的扩展性边界：如果未来要接入 Anthropic/Gemini（非 OpenAI 兼容），手写 parser 架构完全复用，SDK 不能覆盖
- 不要因为"某一步变简单了"就引入依赖，要评估对整体架构的影响

---

## 模块 7：异步生成器的惰性驱动机制（最核心概念）

**Q：** 这两行只执行了一次，event 是怎么被一个个传递过来的？

```ts
const sseFrames = parseSSEEvents(streamResponse.body);  // 执行了一次
const streamEvents = minimaxAdapter(sseFrames);          // 执行了一次
for await (const event of streamEvents) {
    yield event;
}
```

**A：** 这是理解异步生成器的核心：**调用生成器函数只是创建管道对象，内部代码一行都没有执行。**

```
const sseFrames   = parseSSEEvents(body)    → 只是"接好第一节水管"，没有读任何字节
const streamEvents = minimaxAdapter(sseFrames) → 只是"接好第二节水管"，没有处理任何帧
for await (...)                              → 这里才是"开水龙头"
```

每次 `for await` 请求下一个值时，整条管道才被驱动一次：

```
for await 向 streamEvents 要第一个值
  ↓
minimaxAdapter 向 sseFrames 要第一个 SSEFrame
  ↓
parseSSEEvents 从 response.body 读取字节，拼出完整帧，yield 给 minimaxAdapter
  ↓
minimaxAdapter 解析帧，翻译成 StreamEvent，yield 给 for await
  ↓
for await 拿到 event，yield 给 client 的调用方
  ↓
下一次循环，重复全部流程
```

这是 **pull-based（按需驱动）** 模型：下游要一个，上游才产一个，网络数据被逐帧消费，不会一次性全部加载到内存。

**关键知识点：**
- `async function*` 调用后**只返回生成器对象**，函数体不执行
- 生成器的执行由消费方（`for await` / `.next()`）驱动，每次驱动只执行到下一个 `yield`
- 多层生成器串联时，驱动是从最下游向上游传播的（pull chain）
- 这与 RxJS 的 Observable、Node.js Stream 的 pipe 是同一种设计思想

---

## 模块 8：错误归一化——message 和 errorCode 的数据来源

**Q：** `LLMErrorEvent` 里的 `message` 和 `errorCode` 不知道该填什么，它们是后端直接返回的吗？

**A：** 两者来源不同：

**`message`** 优先取服务端响应体，取不到用本地兜底：

```ts
let message = `HTTP ${streamResponse.status} ${streamResponse.statusText}`; // 兜底
try {
    const errBody = await streamResponse.json();
    message = errBody?.error?.message ?? errBody?.message ?? message; // 服务端文本优先
} catch { /* 响应体不是 JSON，用兜底 */ }
```

**`errorCode`** 是客户端自己做的归一化映射，不是后端字段：

```ts
const errorCode =
    status === 401 || status === 403 ? 'auth_error' :
    status === 429 ? 'rate_limit' :
    'provider_error';
```

catch 块里的异常类型映射：

```ts
catch (err: any) {
    if (err?.name === 'AbortError')    → done { stopReason: 'aborted' }  // 不是 error！
    if (err instanceof TypeError)      → error { errorCode: 'network_error' }
    else                               → error { errorCode: 'provider_error' }
}
```

**关键知识点：**
- `errorCode` 是应用层语义，由客户端根据 HTTP 状态码或异常类型映射出来，不依赖后端格式
- 用户取消（`AbortError`）不应产出 `LLMErrorEvent`，而是 `DoneEvent { stopReason: 'aborted' }`——这是正常终止，不是错误
- HTTP 错误时要先 try/catch 解析响应体，因为 `response.json()` 本身也可能失败

---

## 汇总表

| 能力层 | 知识点 |
|--------|--------|
| TypeScript 语法 | PascalCase 是类型名，camelCase 是变量名，不能混用 |
| 异步生成器 | 调用生成器函数只创建对象，消费（for await）才驱动执行 |
| 异步生成器 | 多层串联是 pull-based，下游驱动上游逐帧读取 |
| 异步生成器 | try/catch 包外 = 流级别终止；包内 = 帧级别容错 |
| 架构设计 | AbortController 由控制方持有，执行方只接收 AbortSignal |
| 架构设计 | client.ts 是错误归一化终点，下游 IPC Handler 无需处理异常 |
| 架构设计 | 引入依赖前要评估对整体架构扩展性的影响 |
| API 协议 | 非流式 `message.reasoning_details` ≠ 流式 `delta.reasoning_content` |
| API 协议 | `reasoning_split: true` 是请求体顶层字段，触发思考内容分离 |
| 错误处理 | errorCode 由客户端归一化映射，message 优先取服务端文本再兜底 |
| 错误处理 | AbortError 映射为 DoneEvent（正常终止），不是 LLMErrorEvent |
