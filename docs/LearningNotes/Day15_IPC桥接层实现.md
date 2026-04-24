# Day 15 — IPC 桥接层：Preload + Main Handler 设计

> 本次对话完成了 Electron IPC 桥接层的完整实现，涵盖 Preload 的三个 API 设计、`contextBridge.exposeInMainWorld` 命名、listener 适配模式、Main Process handler 分层策略，以及 `AbortController` 的共享方式。

---

## 模块 1：`exposeInMainWorld` 的命名

**Q：** `contextBridge.exposeInMainWorld` 的第一个参数该起什么名字？

**A：** 推荐使用 `'electronAPI'`（官方示例惯例）。这个名字会成为 Renderer 里所有 IPC 调用的命名空间前缀（如 `window.electronAPI.sendMessage`）。过早抽象（如 `synapseAPI`）是过度工程，在没有跨运行时移植需求时没有意义。

**关键知识点：**
- `exposeInMainWorld(name, api)` 的 `name` 会挂载到 `window` 对象上
- 选择社区惯例名称可以降低协作者认知成本
- 不要因为"可能换运行时"而提前抽象命名

---

## 模块 2：`onStreamEvent` 的内存泄漏问题与清理函数模式

**Q：** 不清楚 `onStreamEvent` 该怎么设计，直觉上觉得它是"触发回复并监听输出"。

**A：** `onStreamEvent` 只做一件事：**被动订阅**。它和 `sendMessage`（主动触发）是两个完全独立的职责。

直接把 callback 传给 `ipcRenderer.on` 会导致每次调用都累积一个新 listener，造成内存泄漏。正确模式是返回清理函数：

```ts
onStreamEvent: (callback: (event: StreamEvent) => void): (() => void) => {
    const listener = (ipcEvent: IpcRendererEvent, data: StreamEvent) => {
        callback(data)
    }
    ipcRenderer.on('on-streamEvent', listener)
    return () => { ipcRenderer.removeListener('on-streamEvent', listener) }
}
```

**关键知识点：**
- `ipcRenderer.removeListener` 必须传入**同一个函数引用**，所以 listener 必须先存为变量
- 返回清理函数（`() => void`）是 React `useEffect` 也在用的通用模式
- 闭包让返回的清理函数可以捕获到 `listener` 引用

---

## 模块 3：`ipcRenderer.on` 的 listener 签名适配

**Q：** 不清楚 listener 的 `(ipcEvent, data)` 两个参数是什么，以及为什么要做"适配"。

**A：** `ipcRenderer.on` 要求 listener 的第一个参数必须是 `IpcRendererEvent`（Electron 内部对象），真正的业务数据在第二个参数。如果直接把 `(event: StreamEvent) => void` 的 callback 传进去，Electron 会把 `IpcRendererEvent` 塞给 `event` 参数，真正的 `StreamEvent` 数据反而被丢弃。

必须用中间 listener 做参数适配：

```ts
// ❌ 错误：直接传 callback
ipcRenderer.on('on-streamEvent', callback)

// ✅ 正确：中间 listener 适配参数
const listener = (ipcEvent: IpcRendererEvent, data: StreamEvent) => {
    callback(data)  // 丢弃 ipcEvent，只把 data 传给 callback
}
ipcRenderer.on('on-streamEvent', listener)
```

**关键知识点：**
- `ipcRenderer.on` 的 listener 签名固定：`(event: IpcRendererEvent, ...args: any[]) => void`
- `IpcRendererEvent` 需要从 `electron` 包显式导入才能标注类型
- 适配层（wrapper function）是解决签名不兼容的标准手段

---

## 模块 4：`sendMessage` 用 `send` 还是 `invoke`

**Q：** `sendMessage` 应该用 `ipcRenderer.invoke`（双向）还是 `ipcRenderer.send`（单向）？

**A：** 用 `send`（单向）。流式调用的特点是"一次请求，多次响应"——流式数据由 Main 主动 push 给 Renderer（通过 `webContents.send`），`sendMessage` 只需要触发调用，不需要等返回值。错误处理也在流的层面（`LLMErrorEvent`），不需要 `invoke` 的 Promise 机制。

**关键知识点：**
- `invoke` = 单次请求/响应，适合"问一次得一个答案"
- `send` + `webContents.send` = 单次触发/多次推送，适合流式场景
- 错误已被 `client.ts` 归一化为 `LLMErrorEvent` yield 出来，IPC 层无需额外处理异常

---

## 模块 5：函数传递 vs 函数调用（括号问题）

**Q：** 写出了 `ipcMain.on('send-message', handleSendMessage())` 和 `ipcMain.on('abort-stream', handleAbortStream(currentController))`，两处都加了括号。

**A：** 这是将函数**立即执行**并把**返回值**传给 `ipcMain.on`，而不是把**函数本身**传过去。`ipcMain.on` 期望第二个参数是一个函数引用：

```ts
// ❌ 错误：立即调用，把 Promise<void> 传给 ipcMain.on
ipcMain.on('send-message', handleSendMessage())

// ✅ 正确：传入函数引用，用闭包捕获 mainWindow
ipcMain.on('send-message', (event, args) => {
    handleSendMessage(mainWindow, args)
})
```

**关键知识点：**
- `fn` 是函数引用，`fn()` 是立即执行并取返回值
- 需要捕获外部变量（如 `mainWindow`）时，用箭头函数闭包包裹
- `ipcMain.on` 的 callback 签名：`(event: IpcMainEvent, ...args: any[]) => void`

---

## 模块 6：`AbortController` 按值传递的陷阱

**Q：** 写出了 `ipcMain.on('abort-stream', handleAbortStream(currentController))`，把 `currentController` 作为参数传给函数。

**A：** 双重错误：其一是加了括号立即执行（见模块 5）；其二是即使修正了括号，`currentController` 也是按值传递的——注册时 `currentController` 是 `null`，后续对模块级变量的赋值不会影响已经传入的参数值。

```ts
// ❌ 错误：注册时传入的是 null 的快照
function handleAbortStream(controller: AbortController) {
    controller?.abort()  // controller 永远是 null
}

// ✅ 正确：直接读取模块级变量，拿到最新值
function handleAbortStream(conversationId?: string) {
    currentController?.abort()  // 读取当前最新的 controller
}
```

**关键知识点：**
- JavaScript 中对象引用按值传递，传入的是"当时的值的副本"
- 两个 handler 共享状态的正确方式：用模块级变量，函数体内直接读取
- 参数里有但函数体没用到的参数是代码异味，应该删除

---

## 模块 7：Main Process 里读取环境变量

**Q：** 在 `main.ts` 里使用了 `import.meta.env.VITE_MINIMAX_APIKEY`，报错 `Property 'env' does not exist on type 'ImportMeta'`。

**A：** `import.meta.env` 是 Vite 专属注入，只在 Renderer 进程（经过 Vite 编译）中可用。Main Process 运行在 Node.js 环境，应使用 `process.env`：

```ts
// ❌ Main Process 中不可用
import.meta.env.VITE_MINIMAX_APIKEY

// ✅ Main Process 中正确写法
process.env.VITE_MINIMAX_APIKEY
```

**关键知识点：**
- Electron 有两个进程：Main（Node.js）和 Renderer（Chromium + Vite）
- `import.meta.env` 只存在于 Vite 处理过的 Renderer 代码
- `process.env` 在 Node.js 环境中始终可用

---

## 模块 8：`main.ts` 的职责边界与 handler 分层

**Q：** 对 `main.ts` 应该写什么内容不清楚，担心像公司项目一样变得杂乱。

**A：** `main.ts` 的职责只有三件事：生命周期管理、窗口创建、IPC handler 注册入口（调用注册函数，不实现业务逻辑）。业务 handler 按功能模块拆分到独立文件：

```
src/main/
  main.ts              ← 只做注册入口：registerLlmHandlers(mainWindow)
  ipc/
    llmHandlers.ts     ← LLM 相关 handler 内聚在此
    windowHandlers.ts  ← 窗口控制相关
```

**关键知识点：**
- handler 实现越来越多时，用一个 `registerXxxHandlers(mainWindow)` 函数聚合，而不是 export 多个独立函数
- `mainWindow` 作为参数传入，而不是全局变量共享
- 杂乱的根源：把业务逻辑直接写进 `main.ts` 的 handler 闭包里

---

## 模块 9：并发请求与 `AbortController` 的架构决策

**Q：** 单个 `currentController` 能支持并发吗？A 对话正在回复时，B 对话发起请求能精准取消 A 吗？

**A：** 不能。单 controller 只追踪最后一次请求。但 V1 阶段 UI 层在流式输出期间禁用输入，并发本质上被 UI 阻断，单 controller 够用。正确策略是**渐进式预留**：

```ts
// V1：单 controller，但 args 里携带 conversationId 预留升级空间
// V2 升级时只改 llmHandlers.ts 内部，Preload 和 Renderer 不需要改动
let currentController: AbortController | null = null

// 未来 V2：
// const controllers = new Map<string, AbortController>()
```

**关键知识点：**
- 架构决策要考虑"现在够用"和"未来可升级"的平衡
- 预留字段（`conversationId`）的成本极低，但省去了未来改接口的代价
- UI 层的约束（禁用输入）可以简化后端的并发设计

---

## 汇总表

| 能力层 | 知识点 |
|--------|--------|
| Electron IPC | `ipcRenderer.send` vs `invoke` 的选择依据 |
| Electron IPC | `ipcRenderer.on` listener 签名适配（参数位移问题） |
| Electron IPC | `contextBridge.exposeInMainWorld` 命名约定 |
| Electron IPC | Main Process 用 `process.env`，Renderer 用 `import.meta.env` |
| JavaScript 基础 | 函数引用 vs 函数调用（括号的含义） |
| JavaScript 基础 | 按值传递：模块级变量共享 vs 参数传递的区别 |
| 设计模式 | 返回清理函数（unsubscribe 模式）防止内存泄漏 |
| 设计模式 | 闭包捕获变量 vs 参数传递的使用场景 |
| 架构设计 | `main.ts` 职责边界：入口层不写业务逻辑 |
| 架构设计 | 渐进式预留（预埋字段，延迟实现） |
