# Day 13 — Provider Adapter 实现：从 SSEFrame 到 StreamEvent

> 本次对话围绕 MiniMax Provider Adapter 的实现展开。用户在 sseParser 完成后，开始编写第一个厂商适配器 `minimaxAdapter.ts`，将 SSE 协议帧翻译为统一的 `StreamEvent`。过程中暴露的问题集中在：SSE 协议与 JSON 语义的分层理解、adapter 中的类型管理、错误处理的职责划分、StopReason 的抽象设计、以及多处防御性编程遗漏。

---

## 模块 1：SSE frame 与 StreamEvent 的映射基数

**Q：** 用户疑问——"目前的 sseParser 转换后都是完整的数据 chunk，一个 chunk 按理来说都只属于一个 Event 吧？"认为 SSE frame 和 StreamEvent 始终是 1:1 的关系。

**A：** 在 OpenAI 兼容协议下**大部分情况是 1:1**，但存在 0 和多的情况：

- **0 个 event**：第一个 chunk 经常只带 `role: "assistant"` 和 `content: ""`（空字符串），没有实际增量，应该跳过。
- **多个 event**：在 Anthropic 原生协议下存在（一个 `message_delta` 事件同时包含 `stop_reason` + `usage`，需要产出多个 StreamEvent）。OpenAI 兼容格式下几乎不出现。

即便当前是 1:1，用 AsyncGenerator 保持接口统一是正确选择——未来写 Anthropic adapter 时不需要改签名。

**关键知识点：**
- 设计接口时以最灵活的场景为准（1:N），而不是当前最常见的场景（1:1）
- "跳过"也是一种合法的映射结果（0 个 event），adapter 中用 `continue` 处理

---

## 模块 2：SSE 协议层 vs JSON 语义层的分离

**Q：** 用户发出两个疑问：(1) sseParser 用的是最原始的数据流吗？每个厂家的数据流是不是也都不一样？(2) 从截图中看到 MiniMax 的事件流数据，疑问"为什么没有 `data` 字段"，怀疑 sseParser 能否正确解析。

**A：**

*关于协议统一性*：SSE 是 W3C 标准协议，线上传输格式固定（`data:` 行 + `\n\n` 分隔）。**所有厂商只要用 SSE，帧格式完全一致。** 不同的是帧内的 JSON 内容结构——这就是 sseParser 和 adapter 分层的原因。

```
协议层（统一）：  data: {"choices":[...]}\n\n     ← sseParser 管这层
语义层（各异）：       {"choices":[...]}           ← adapter 管这层
```

*关于调试工具*：浏览器的 EventStream tab 展示的是**解析后的视图**，把 `data:` 前缀和 `event:` 字段剥离成了表格列。原始字节流中 `data:` 前缀是存在的。

**关键知识点：**
- SSE 是标准协议，sseParser 写一次可被所有厂商复用
- 调试工具展示的是解析后的结果，不是原始字节流，不能据此判断协议格式
- `event`、`id`、`retry` 是 SSE 的**可选字段**，OpenAI 兼容格式通常只用 `data:`，Anthropic 会用 `event:` 区分事件类型

---

## 模块 3：adapter 中的类型管理错误

**Q：** 用户的第一版 adapter 中，在文件内重新定义了一个空的 `StreamEvent` 接口：

```ts
// 错误：本地重定义，覆盖了 shared 中的完整类型
export interface StreamEvent {

}
```

同时参数命名与类型名冲突：

```ts
// 错误：参数名 SSEFrame 和类型名 SSEFrame 同名
export async function* minimaxAdapter(
    SSEFrame: AsyncGenerator<SSEFrame>
)
```

**A：** 
根因不是语法问题，而是**对项目数据流的全局认知不足**——不清楚 adapter 的输出类型已经在 `shared/streamEvents.ts` 中定义好了，于是本能地在本地重新定义了一个空接口来"占位"。这反映了一个开发习惯问题：动手写一个模块之前，应该先梳理清楚"**我的输入从哪来、输出到哪去、类型在哪定义**"这三个问题，而不是边写边补。

具体修正：
- 不应在消费侧重新定义已有类型，直接 `import { StreamEvent } from '@/shared/streamEvents'` 即可。本地空接口会覆盖导入，导致 yield 的对象没有类型约束。
- 参数名用小写开头（`sseFrames`），与 PascalCase 的类型名区分。TypeScript 允许同名但会造成歧义。

**关键知识点：**
- 动手写模块前先确认三件事：输入从哪来、输出到哪去、类型在哪定义——把自己放进项目的数据流全局图中
- TypeScript 中类型应该有唯一的定义源（Single Source of Truth），消费侧只导入不重定义
- 参数名用 camelCase，类型名用 PascalCase，避免同名混淆
- yield 对象字面量时，TypeScript 会根据 `type` 字面量字段自动匹配联合类型成员，不需要手动标注每个 yield 的类型

---

## 模块 4：错误处理的职责分层

**Q：** 用户听到建议"致命错误如 rate_limit 应该 throw，其他解析错误应该 yield"，直觉觉得不对但说不清原因。同时在代码中写了 `catch (error: any) { yield error }`，把原始 Error 对象作为 StreamEvent yield。

**A：** 混合策略（throw + yield）的核心问题：**adapter 根本不会遇到 rate_limit 或 auth_error**。数据流经过的顺序决定了错误发生的层级：

| 错误场景 | 发生在哪一层 | 谁处理 |
|---|---|---|
| 401/403 密钥无效 | fetch 阶段（HTTP 状态码） | client.ts |
| 429 限频 | fetch 阶段（HTTP 状态码） | client.ts |
| 网络断连 | fetch / reader.read() | client.ts |
| 用户点停止 | AbortController | client.ts |
| JSON 解析失败 | adapter | adapter throw |
| chunk 结构异常 | adapter | adapter throw |

adapter 能遇到的错误只有 JSON 解析失败和结构异常——数据流已损坏，继续处理没有意义。最干净的策略是 **adapter 统一 throw，client.ts 作为错误归一化的总枢纽**，catch 所有层的异常并转为 `LLMErrorEvent`。

`yield error`（原始 Error 对象）更是类型错误——Error 不是 `StreamEvent` 的成员，消费方无法正确处理。

**关键知识点：**
- 错误处理的职责应该跟着数据流的层级走，不要在下游处理上游的错误
- HTTP 层错误（状态码）在 fetch 阶段就决定了，根本不会产生 SSE 流，adapter 永远看不到
- AsyncGenerator 中 throw 会终止迭代，调用方用 try/catch 接收——这是合理的，因为 adapter 无法恢复
- `yield` 的对象必须符合返回类型，不能 yield 任意值

---

## 模块 5：StopReason 是归一化抽象层

**Q：** 用户看到 SSE 流中有 `finish_reason` 字段，产生疑问："如果流本身就有 stopReason 的话，我们就不可以自定义 StopReason 了吧？"认为应该直接透传厂商的 `finish_reason` 值。

第一版代码中也直接透传了：

```ts
// 错误：透传厂商原始值，"stop" 不在 StopReason 联合类型中
yield {
    type: 'done',
    stopReason: streamEvent.choices[0].finish_reason, // "stop"
}
```

**A：** 厂商的 `finish_reason` 和应用层的 `StopReason` 是**两个不同层级的概念**，必须做映射：

| 厂商 `finish_reason` | 应用层 `StopReason` |
|---|---|
| `"stop"` | `'completed'` |
| `"length"` | `'budget_exceeded'` |
| `"content_filter"` | `'provider_error'` |

更关键的是，`aborted` 这个值**不来自任何厂商**——它是用户点停止按钮时由 client.ts 构造的。如果直接透传，Renderer 就要认识所有厂商的字符串，破坏分层。

**关键知识点：**
- adapter 的核心价值就是归一化——把厂商特定的值翻译成应用统一的类型
- 应用层的枚举/联合类型可以包含 API 中不存在的值（如 `aborted`），因为它服务于整个应用的需求，不仅仅是 API 映射
- 直接透传外部值会导致类型不安全，TypeScript 类型检查会被绕过（尤其是 `any` 类型的中间变量）

---

## 模块 6：映射表的实现语法

**Q：** 用户知道需要做映射但不确定语法，问"用 map？怎么写？"。第一版用了 switch 但缺少 break 导致 fall-through：

```ts
// 错误：没有 break，会连续执行所有 case
switch (streamEvent.choices[0].finish_reason) {
    case 'stop':
        yield { type: 'done', stopReason: ... }
    case 'length':
        yield { type: 'done', stopReason: ... }
}
```

**A：** 简单的字符串映射用对象字面量 + `Record` 类型，比 switch 和 Map 都简洁：

```ts
type StopReasonMap = Record<string, StopReason>

const STOP_REASON_MAP: StopReasonMap = {
    'stop': 'completed',
    'length': 'budget_exceeded',
    'content_filter': 'provider_error',
};

// 使用时，?? 提供兜底值
STOP_REASON_MAP[finish_reason] ?? 'provider_error'
```

**关键知识点：**
- 少量键值对的固定映射用对象字面量 + `Record<string, T>`，不需要 `Map`
- `??`（nullish coalescing）处理未知 key 返回 `undefined` 的兜底
- switch 语句每个 case 必须有 `break` 或 `return`，否则 fall-through 到下一个 case

---

## 模块 7：adapter 中的防御性编程

**Q：** 用户在多轮迭代中暴露了以下防御性问题：

```ts
// 问题 1：可选链不完整——delta 可能是 undefined
let delta = streamEvent.choices[0]?.delta;
// delta 为 undefined 时，下一行直接炸
if (delta.reasoning_content) ...

// 问题 2：finish_reason 检查在 content 之前
if (finish_reason) { yield DoneEvent }  // 先 done
if (delta.content) { yield ContentEvent } // content 永远不会执行

// 问题 3：finish_reason 访问不一致
streamEvent.choices[0]?.delta    // 有 ?.
streamEvent.choices[0].finish_reason  // 没有 ?.
```

**A：**

- 可选链 `?.` 只防止访问时抛错，**不防止后续使用 undefined 值**。必须加 `if (!delta) continue;` 做空值守卫。
- `finish_reason` 检查必须放在 content 检查**之后**，因为最后一个 chunk 可能同时带 content 增量和 `finish_reason: "stop"`，先处理 done 会丢最后一个字。
- yield `DoneEvent` 后应该 `return` 终止 generator——流已经结束，继续处理无意义。
- 同一个对象的不同属性访问应保持一致的防御风格。

**关键知识点：**
- 可选链 `?.` 只解决访问安全，不解决值安全——拿到 `undefined` 后必须显式判断
- 流式处理中，数据提取的顺序很重要——先提取内容，再处理终止信号
- generator 中 `return` 等于正常结束迭代，和 `throw` 的语义不同
- 防御性检查要保持一致性，同一路径上不能一处有 `?.` 另一处没有

---

## 汇总表

| 能力层 | 知识点 |
|---|---|
| 网络协议 | SSE 是 W3C 标准协议，帧格式统一；`event`/`id`/`retry` 是可选字段；调试工具展示的是解析后的视图 |
| 架构设计 | 协议层（sseParser）与语义层（adapter）分离；错误处理职责跟着数据流层级走；归一化抽象层不等于透传 |
| TypeScript 语法 | `Record<string, T>` 做映射表；`??` 兜底；可选链 `?.` 只防访问不防值；switch 必须 break |
| AsyncGenerator | yield 对象字面量自动匹配联合类型成员；throw 终止迭代由调用方 catch；return 正常结束 |
| 防御性编程 | 空值守卫要显式判断；流式处理先提取内容再处理终止信号；防御风格保持一致 |
