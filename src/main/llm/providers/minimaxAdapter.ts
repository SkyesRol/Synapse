import { SSEFrame } from "../sseParser";
import { StreamEvent } from "@/shared/streamEvents";
import { StopReason } from "@/shared/streamEvents";

type StopReasonMap = Record<string, StopReason>

const STOP_REASON_MAP: StopReasonMap = {
    'stop': 'completed',
    'length': 'budget_exceeded',
    'content_filter': 'provider_error',
}

export async function* minimaxAdapter(
    sseFrames: AsyncGenerator<SSEFrame>
): AsyncGenerator<StreamEvent> {
    let index = 0;

    for await (const frame of sseFrames) {
        try {
            let streamEvent = JSON.parse(frame.data);
            let delta = streamEvent.choices[0]?.delta;
            if (!delta) continue;
            if (delta.reasoning_content) {
                yield {
                    type: "thinking",
                    index: index,
                    content: delta.reasoning_content
                }
                index++;
            } else if (delta.content) {

                yield {
                    type: "content",
                    index: index,
                    content: delta.content,
                }
            }

            if (streamEvent.choices[0]?.finish_reason) {

                yield {
                    type: 'done',
                    stopReason: STOP_REASON_MAP[streamEvent.choices[0].finish_reason],
                }
                return;

            }


        } catch (error: any) {
            throw error;
        }

    }
}