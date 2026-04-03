export type StopReason =
    | 'completed'
    | 'aborted'
    | 'budget_exceeded'
    | 'provider_error'

export type ErrorCode =
    | 'network_error'
    | 'auth_error'
    | 'rate_limit'
    | 'provider_error'

export interface Usage {
    inputTokens: number | undefined,
    outputTokens: number | undefined,
    thinkingTokens: number | undefined,
}

export type ThinkingEvent = {
    type: 'thinking',
    index: number,
    content: string,
}

export type ContentEvent = {
    type: 'content',
    index: number,
    content: string,
}

export type DoneEvent = {
    type: 'done',
    stopReason: StopReason,
    usage?: Usage,
}
// 不能命名为 ErrorEvent ， 因为和某个地方的声明重复了
export type LLMErrorEvent = {
    type: 'error',
    message: string,
    debugDetail?: string,
    errorCode: ErrorCode,
}

export type StreamEvent = ThinkingEvent | ContentEvent | DoneEvent | LLMErrorEvent