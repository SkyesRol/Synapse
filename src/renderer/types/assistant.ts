import { ModelConfig } from "./models";


export interface AssistantMetadata {
    assistantId: string,
    name: string,
    icon: string,
    createdAt: number,
    updatedAt: number,
}

export interface Assistant extends AssistantMetadata {
    systemPrompt: string,
    modelConfig: ModelConfig,
    metadata?: Record<string, any>,
}