import { ModelConfig } from "./models";


export interface Assistant {
    assistantId: string,
    name: string,
    icon: string,
    systemPrompt: string,
    modelConfig: ModelConfig,
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, any>;
}