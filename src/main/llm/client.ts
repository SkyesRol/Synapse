import { StreamEvent } from "@/shared/streamEvents";
import { parseSSEEvents } from "./sseParser";
import { minimaxAdapter } from "./providers/minimaxAdapter";



export interface ModelMessage {
    role: 'user' | 'assistant' | 'tool',     // 不清楚这个 client 是每个厂家都能用还是只针对于 OpenAI Compatible 的格式，暂时写为 string，如果是 OpenAI兼容格式，则角色只有 'user','assistant','tool'
    content: string,
}
export type ModelMessages = ModelMessage[];
export interface ModelConfig {
    modelId: string,
    temperature: number,
    maxTokens: number,
    topP: number,
    stream: boolean,
    apiKey: string,
    baseUrl: string
}



export async function* fetchCompletions(
    messages: ModelMessages, config: ModelConfig, signal: AbortSignal
): AsyncGenerator<StreamEvent> {
    try {
        const payload = {
            model: config.modelId,
            messages,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            top_p: config.topP,
            stream: config.stream,
            reasoning_split: true,
        }
        const streamResponse = await fetch(config.baseUrl, {
            method: 'POST',
            signal: signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify(payload)
        });

        if (!streamResponse.ok) {
            let message = `HTTP ${streamResponse.status} ${streamResponse.statusText}`;
            try {
                const errBody = await streamResponse.json();
                message = errBody?.error?.message ?? errBody?.message ?? message;
            } catch { /* 响应体不是 JSON，用兜底文案 */ }

            const errorCode =
                streamResponse.status === 401 || streamResponse.status === 403 ? 'auth_error' :
                    streamResponse.status === 429 ? 'rate_limit' :
                        'provider_error';

            yield { type: 'error', message, errorCode };
            return;
        }

        if (!streamResponse.body) {
            yield { type: 'error', message: '响应体为空', errorCode: 'provider_error' };
            return;
        }

        const sseFrames = parseSSEEvents(streamResponse.body);
        const streamEvents = minimaxAdapter(sseFrames);

        for await (const event of streamEvents) {
            yield event;
        }
    } catch (err: any) {
        if (err?.name === 'AbortError') {
            yield { type: 'done', stopReason: 'aborted' };
        } else if (err instanceof TypeError) {
            yield { type: 'error', message: err.message, errorCode: 'network_error' };
        } else {
            yield { type: 'error', message: err?.message ?? '未知错误', errorCode: 'provider_error' };
        }
    }




}