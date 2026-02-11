
// ---------------------------------- Model Config（可在对话中设置） --------------------------------
export interface ModelConfig {
    modelId: string;
    // modelName 其实也可以移除，因为可以通过 modelId 查表得到
    modelName: string;
    // icon 已移除，通过元数据获取
    temperature: number;
    // 对应 OpenAI 的 max_tokens。
    maxTokens: number;
    // 对应 top_p (0-1)。
    topP: number;
    stream: boolean;
}
// ------------------------------------------------------------------------------------


