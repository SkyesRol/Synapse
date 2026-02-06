export type Role = 'system' | 'user' | 'assistant';

export interface ConversationMetadata {
    id: string;
    topic: string;
    createdAt: number;
    updatedAt: number;
}

export interface Message {
    id: string;
    role: Role;
    content: string;
    timestamp: number;
    deepThinking: boolean;
}

export interface Conversation extends ConversationMetadata {
    messages: Message[];
}