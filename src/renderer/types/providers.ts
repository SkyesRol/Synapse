

export interface ProviderConfig {
    apiBaseURL: string;
    apiKey: string;
}

export interface LLMProvider {
    providerId: string;
    name: string;
    config: ProviderConfig;
    icon: string; // SVG string or URL
}

// --------------------------------- Settings 展示模型 --------------------------------
// 1. 定义模型的能力 (Capabilities)
export interface ModelCapabilities {
    imageInput: boolean;  // 是否支持看图 (Vision)
    toolCall: boolean;    // 是否支持工具调用 (Function Calling)
    contextWindow: number; // 上下文窗口大小 (如 128000)
    streaming: boolean;   // 是否支持流式输出
}

// 2. 定义模型信息
export interface LLMModel {
    modelId: string;           // 模型 ID (如 "gpt-4o")
    name: string;         // 显示名称 (如 "GPT-4o")
    providerId: string;   // 所属厂商
    icon?: string;
    capabilities: ModelCapabilities; // 能力描述
}
// ------------------------------------------------------------------------