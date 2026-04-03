

我理解你的问题是：不是抄功能，而是从 Claude Code 这个代码库里提炼“做 Agent 的方法论”。我先快速扫一遍仓库里和 query、tool、bridge、task 相关的关键实现，再给你一份可落地的实践清单。



我已经提炼完核心实现，下一步直接给你一份“做 Agent 值得学的实践清单”，每条都对应它解决的问题和你可以如何落地到自己的项目。如果目标是“做一个能长期演进的 Agent”，这个项目最值得学的不是某个功能，而是一整套工程思想。最核心可以抓这 10 条：

1. 输入处理分层，不让主循环背锅  
把用户输入拆成编辑层、提交调度层、预处理层、执行循环层。  
价值：每层职责单一，改一个点不容易炸全局。  
落地：先画一条从“用户输入到模型响应”的流水线图，再按层拆模块。

2. Agent 循环要做成可流式、可中断、可恢复  
采用“持续迭代直到 end_turn”的循环，支持流式输出和 Abort。  
价值：体验更实时，失败更可控。  
落地：主循环统一处理文本流、工具调用、异常和终止条件。

3. 会话管理和执行引擎分离  
一个组件负责会话状态与持久化，另一个只负责本轮推理和工具执行。  
价值：测试更清晰，也便于未来替换模型或执行策略。  
落地：把“历史/预算/状态”与“本轮执行”拆成两个明确边界的模块。

4. 消息历史只追加，尽量不改写  
工具结果、系统事件、错误都作为消息追加。  
价值：可审计、可回放、易调试。  
落地：把“对话历史”当事件日志，不要做隐式覆盖。

5. 工具编排采用“并发优先 + 安全退化”  
可并发的工具批量并发，不安全或有副作用的串行。  
价值：在性能和正确性之间找到稳定平衡。  
落地：给每个工具定义并发安全标记，调度器按标记自动分批执行。

6. 安全是多层防线，不靠单点规则  
命令安全、路径约束、权限确认、策略规则、拒绝回传给模型形成闭环。  
价值：就算一层失效，仍有后续防护。  
落地：至少做三层：输入静态检查 + 运行前权限判定 + 运行后审计。

7. 预算是第一等公民，不是“后面再说”  
同时跟踪 token 和费用，超预算要显式停机并反馈原因。  
价值：防失控、防账单惊喜。  
落地：在主循环每轮后都做预算检查，而不是最终结算。

8. 错误恢复要产品化  
区分可重试错误、工具失败、用户中断，分别走不同恢复路径。  
价值：Agent 不会“脆断”，用户也知道系统在做什么。  
落地：定义统一错误分类和 retry policy，别把所有异常都当 fatal。

9. 任务化与后台化能力内建  
把长任务抽象成 Task，支持进度、通知、日志、前后台切换。  
价值：Agent 不只是一次问答，而是可管理的工作流。  
落地：先实现最小 Task 模型：状态机 + 输出持久化 + 进度事件。

10. 可观测性优先  
统计指标、工具耗时、token 变化、会话持久化都留痕。  
价值：你能知道“为什么慢、为什么贵、为什么错”。  
落地：先定 5 个关键指标：轮次、工具次数、耗时、token、失败率。

一句话总结：  
这个项目真正厉害的是把 Agent 当“操作系统”来做，而不是“一个 prompt 函数”。

如果你愿意，我可以下一步给你做一版“可直接抄到你项目里”的最小 Agent 架构蓝图（目录结构 + 核心接口 + 执行循环伪代码）。











最小 Agent 架构蓝图（可直接落地，TypeScript 版）：

**1. 目录结构**
```txt
src/
  app/
    main.ts                 # 进程入口，组装依赖
    container.ts            # 依赖注入（logger, model, tools, storage）
  domain/
    message.ts              # Message/Event 类型
    task.ts                 # Task 状态机类型
    budget.ts               # token/cost 预算模型
    error.ts                # 错误分类
  input/
    editorAdapter.ts        # 输入源（CLI/UI/API）
    submitCoordinator.ts    # 排队、合并、Abort 管理
    preprocess.ts           # slash/bash/普通输入路由
  engine/
    queryEngine.ts          # 会话级编排（历史、预算、持久化）
    queryLoop.ts            # 单轮执行循环（模型->工具->追加消息）
    contextCompactor.ts     # 历史压缩策略
  tools/
    registry.ts             # 工具注册
    scheduler.ts            # 并发/串行批次调度
    executor.ts             # tool call 执行与结果包装
    permissions.ts          # canUseTool 与策略判定
  tasks/
    taskManager.ts          # 后台任务生命周期
    taskStore.ts            # 任务持久化
    notifications.ts        # 任务通知事件
  infra/
    modelClient.ts          # 模型流式 API 适配层
    sessionStore.ts         # 会话持久化
    metrics.ts              # 可观测性（counter/timer/histogram）
    logger.ts               # 结构化日志
```

**2. 核心接口（先把边界钉死）**
```ts
export type Role = 'system' | 'user' | 'assistant' | 'tool';

export type Message = {
  id: string;
  role: Role;
  content: unknown; // text | tool_use | tool_result ...
  ts: number;
  meta?: Record<string, unknown>;
};

export type QueryInput = {
  newMessages: Message[];
  abortSignal: AbortSignal;
  shouldQuery: boolean;
};

export type QueryEvent =
  | { type: 'assistant_text'; delta: string }
  | { type: 'assistant_message'; message: Message }
  | { type: 'tool_start'; toolName: string; toolUseId: string }
  | { type: 'tool_result'; message: Message }
  | { type: 'budget_exceeded'; reason: 'token' | 'cost' }
  | { type: 'done'; reason: 'end_turn' | 'abort' | 'max_turns' | 'error' };

export type Tool = {
  name: string;
  isConcurrencySafe(input: unknown): boolean;
  run(input: unknown, ctx: ToolContext): Promise<ToolRunResult>;
};

export type ToolContext = {
  cwd: string;
  sessionId: string;
  signal: AbortSignal;
  canUseTool: (toolName: string, input: unknown) => Promise<boolean>;
};

export type BudgetPolicy = {
  maxTurns: number;
  maxInputTokens: number;
  maxCostUsd: number;
};
```

**3. 主循环伪代码（最关键）**
```ts
async function* queryLoop(state: SessionState, input: QueryInput): AsyncGenerator<QueryEvent> {
  if (!input.shouldQuery) {
    yield { type: 'done', reason: 'end_turn' };
    return;
  }

  state.messages.push(...input.newMessages); // 只追加
  let turn = 0;

  while (true) {
    turn += 1;
    if (turn > state.budget.maxTurns) {
      yield { type: 'done', reason: 'max_turns' };
      return;
    }

    compactIfNeeded(state); // 历史压缩（可选）

    const stream = modelClient.stream({
      messages: state.messages,
      tools: toolRegistry.schemas(),
      signal: input.abortSignal,
    });

    const toolCalls: ToolCall[] = [];
    let assistantDraft: Message | null = null;

    for await (const chunk of stream) {
      if (chunk.type === 'text_delta') {
        yield { type: 'assistant_text', delta: chunk.text };
      } else if (chunk.type === 'tool_use') {
        toolCalls.push(chunk.toolCall);
      } else if (chunk.type === 'assistant_message') {
        assistantDraft = chunk.message;
      }
    }

    if (assistantDraft) {
      state.messages.push(assistantDraft);
      yield { type: 'assistant_message', message: assistantDraft };
    }

    if (toolCalls.length === 0) {
      yield { type: 'done', reason: 'end_turn' };
      return;
    }

    const batches = scheduler.partition(toolCalls, toolRegistry);
    for (const batch of batches) {
      const results = batch.concurrent
        ? await scheduler.runConcurrent(batch.calls, state.toolCtx)
        : await scheduler.runSerial(batch.calls, state.toolCtx);

      for (const r of results) {
        state.messages.push(r.toolResultMessage);
        yield { type: 'tool_result', message: r.toolResultMessage };
      }
    }

    const budgetStatus = budgetTracker.check(state.messages, state.usage);
    if (budgetStatus.exceeded) {
      yield { type: 'budget_exceeded', reason: budgetStatus.reason };
      return;
    }
  }
}
```

**4. 你应该先实现的“最小可用闭环”**
1. 单会话 + 单工具（ReadFile）+ 流式文本。  
2. 加工具调度器（并发安全标记）。  
3. 加预算（turn/token/cost）与显式停止。  
4. 加权限层（allow/ask/deny 三态）。  
5. 加任务管理（长任务后台化）。

**5. 安全与稳定默认值（建议直接用）**
1. 工具默认串行，只有显式 `isConcurrencySafe=true` 才并发。  
2. 预算默认开启：`maxTurns=12`，`maxCostUsd` 必填。  
3. 所有工具错误都包装成 `tool_result` 回传，不抛到顶层中断会话。  
4. 每轮执行后持久化消息，避免崩溃丢上下文。  
5. 所有用户可见停止都返回明确 reason，不要 silent fail。

**6. 迁移到你项目的方式**
1. 先把你现有代码映射到这 6 层：input、engine、tools、tasks、infra、domain。  
2. 找到“耦合最重”的一个点（通常是输入处理和 query 混在一起），先拆。  
3. 不追求一次重构完，按“可运行闭环”逐层替换。  
