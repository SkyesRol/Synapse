import { StreamEvent } from "@/shared/streamEvents";
import { CallConfig, ModelMessages } from "@/shared/types";
import { parseSSEEvents } from "./sseParser";
import { minimaxAdapter } from "./providers/minimaxAdapter";



export async function* fetchCompletions(
    messages: ModelMessages, config: CallConfig, signal: AbortSignal
): AsyncGenerator<StreamEvent> {
    try {
        const payload = {
            model: config.modelId,
            messages,
            temperature: config.temperature,
            max_tokens: config.maxTokens,
            top_p: config.topP,
            stream: true,
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