// 伪代码结构：
declare global {
    interface Window {
        electronAPI: {
            sendMessage(
                modelConfig: import('./shared/types').CallConfig,
                messages: import('./shared/types').ModelMessages,
                conversationId?: string
            ): void,
            onStreamEvent(callback: (event: import('./shared/streamEvents').StreamEvent) => void): () => void,
            abortStream(): void
        }
    }
}

export { }   // 保持文件为模块，让 declare global 生效