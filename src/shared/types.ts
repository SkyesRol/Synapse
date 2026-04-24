// ─────────────────────────────────────────────────────────────
//  Shared types used by both Main Process and Renderer
// ─────────────────────────────────────────────────────────────

/** Single message sent to the LLM API */
export interface ModelMessage {
    role: 'user' | 'assistant' | 'tool' | 'system';
    content: string;
}

export type ModelMessages = ModelMessage[];

/**
 * Complete config required to make one LLM API call.
 * Assembled in the Renderer from ModelConfig + ProviderConfig,
 * then passed over IPC to the Main Process.
 */
export interface CallConfig {
    // ── Model params ──────────────────────────────────────────
    modelId: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    // ── Provider params ───────────────────────────────────────
    apiKey: string;
    baseUrl: string;
}
