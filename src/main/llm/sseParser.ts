export interface SSEFrame {
    event?: string;
    id?: string;
    retry?: number;
    data: string;
    // 方便调试，后续可按需删掉
    raw?: string;
}

const DONE_SENTINEL = '[DONE]';

/**
 * 协议层解析器：
 * ReadableStream<Uint8Array> -> AsyncGenerator<SSEFrame>
 * 只做 SSE 规则解析，不做 JSON 语义解析。
 * 遇到 data: [DONE] 直接终止。
 */
export async function* parseSSEEvents(
    stream: ReadableStream<Uint8Array>
): AsyncGenerator<SSEFrame> {
    if (!stream) {
        throw new Error('parseSSEEvents: stream is empty');
    }

    const reader = stream.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            // stream: true 保证 UTF-8 多字节字符跨 chunk 时不会乱码
            buffer += decoder.decode(value, { stream: true });

            while (true) {
                const boundary = findEventBoundary(buffer);
                if (boundary.index < 0) break;

                const rawEvent = buffer.slice(0, boundary.index);
                buffer = buffer.slice(boundary.index + boundary.length);

                const frame = parseSingleEvent(rawEvent);
                if (!frame) continue;

                if (frame.data === DONE_SENTINEL) {
                    return;
                }

                yield frame;
            }
        }

        // flush decoder 内部残留字节
        buffer += decoder.decode();

        // 流结束后如果还有尾巴，尝试再解析一次
        if (buffer.trim().length > 0) {
            const tailFrame = parseSingleEvent(buffer);
            if (tailFrame && tailFrame.data !== DONE_SENTINEL) {
                yield tailFrame;
            }
        }
    } finally {
        reader.releaseLock();
    }
}

function findEventBoundary(input: string): { index: number; length: number } {
    const n2 = input.indexOf('\n\n');
    const rn2 = input.indexOf('\r\n\r\n');

    if (n2 === -1 && rn2 === -1) return { index: -1, length: 0 };
    if (n2 === -1) return { index: rn2, length: 4 };
    if (rn2 === -1) return { index: n2, length: 2 };

    return n2 < rn2
        ? { index: n2, length: 2 }
        : { index: rn2, length: 4 };
}

function parseSingleEvent(rawEvent: string): SSEFrame | null {
    const lines = rawEvent.split(/\r?\n/);

    let event: string | undefined;
    let id: string | undefined;
    let retry: number | undefined;
    const dataLines: string[] = [];

    for (const line of lines) {
        if (!line) continue;
        if (line.startsWith(':')) continue; // SSE 注释行

        const colon = line.indexOf(':');

        let field: string;
        let value: string;

        if (colon === -1) {
            // 只有字段名，没有值
            field = line;
            value = '';
        } else {
            field = line.slice(0, colon);
            value = line.slice(colon + 1);
            if (value.startsWith(' ')) value = value.slice(1);
        }

        if (field === 'data') {
            dataLines.push(value);
            continue;
        }

        if (field === 'event') {
            event = value;
            continue;
        }

        if (field === 'id') {
            id = value;
            continue;
        }

        if (field === 'retry') {
            const n = Number(value);
            if (Number.isFinite(n) && n >= 0) retry = n;
        }
    }

    // SSE 规范里，无 data 行的事件通常可忽略
    if (dataLines.length === 0) return null;

    return {
        event,
        id,
        retry,
        data: dataLines.join('\n'),
        raw: rawEvent
    };
}