

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface ConversationMetadata {
    id: string;
    topic: string;
    createdAt: number;
    updatedAt: number;
    assistantId: string;
}
// --------------------------  Message Content ---------------------------
export interface Message {
    id: string;
    role: Role;
    content: MessageContent[];
    timestamp: number;
    deepThinking: boolean;
    conversationId: string;
}

export type MessageContent =
    | TextContent
    | ImageContent
    | ToolCallContent
    | ToolResultContent;

export type TextContent = {
    type: 'text';
    text: string;
}
export type ImageContent = {
    type: 'image';
    mimeType: string;
    // Base64 string or URL
    data: string;
}
export type ToolCallContent = {
    type: 'tool_call';
    toolName: string;
    callId: string;
    args: Record<string, any>;
}
export type ToolResultContent = {
    type: 'tool_result';
    toolName: string;
    callId: string;
    result: any;
    isError: boolean;
}


// -------------------------------------------------------------
export interface Conversation extends ConversationMetadata {
    messages: Message[];
}