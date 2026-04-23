import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AssistantMetadata, Assistant } from "../types/assistant";
import { ModelConfig } from "../types/models";
import * as assistantService from '../services/assistantService'
export type CreateAssistantParams =
    {
        name: string;
        icon: string;
    }



interface AssistantState {
    assistants: AssistantMetadata[];
    activeAssistantId: string | null;
    activeAssistant: Assistant | null;
    createAssistant: (params: CreateAssistantParams) => Promise<string>;
    updateAssistant: (id: string, updates: Partial<Assistant>) => Promise<void>;
    deleteAssistant: (id: string, conversationIds: string[]) => Promise<void>;
    setActiveAssistantId: (id: string | null) => void;
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
    modelId: 'MiniMax-M2.7',
    modelName: 'MiniMax-M2.7',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 1,
    stream: true
};

export const useAssistantStore = create<AssistantState>()(
    persist(
        (set, get) => ({
            assistants: [],
            activeAssistantId: null,
            activeAssistant: null,
            createAssistant: async (params) => {
                const newId = crypto.randomUUID();
                const newAssistant: Assistant = {
                    assistantId: newId,
                    name: params.name,
                    icon: params.icon,
                    systemPrompt: 'You are a helpful assistant',
                    modelConfig: DEFAULT_MODEL_CONFIG,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
                await assistantService.addAssistant(newAssistant);
                const metadata: AssistantMetadata = {
                    assistantId: newId,
                    name: newAssistant.name,
                    icon: newAssistant.icon,
                    createdAt: newAssistant.createdAt,
                    updatedAt: newAssistant.updatedAt
                };
                set((state) => ({
                    assistants: [metadata, ...state.assistants],
                    activeAssistantId: newId,
                    activeAssistant: newAssistant,
                }));
                return newId;

            },
            updateAssistant: async (id, updates) => {
                // 1. 持久化 (Service 负责合并逻辑)
                await assistantService.updateAssistant(id, updates);

                set((state) => {
                    // 2. 更新列表元数据
                    const newAssistants = state.assistants.map((a) =>
                        a.assistantId === id ? {
                            ...a,
                            // 仅当 updates 中包含 name/icon 时才更新，否则保持原样
                            ...(updates.name && { name: updates.name }),
                            ...(updates.icon && { icon: updates.icon }),
                            updatedAt: Date.now()
                        } : a
                    );

                    // 3. 如果当前激活的就是这个助手，更新内存对象
                    let newActiveAssistant = state.activeAssistant;
                    if (state.activeAssistantId === id && state.activeAssistant) {
                        newActiveAssistant = {
                            ...state.activeAssistant,
                            ...updates, // 内存对象接受全量更新
                            updatedAt: Date.now()
                        };
                    }

                    return {
                        assistants: newAssistants,
                        activeAssistant: newActiveAssistant
                    };
                });
            },
            deleteAssistant: async (id, conversationIds) => {
                await assistantService.deleteAssistant(id, conversationIds);
                set((state) => {
                    const newAssistants = state.assistants.filter((a) => a.assistantId !== id);
                    // 如果删除了当前激活的助手，重置或切到下一个
                    let newActiveId = state.activeAssistantId;
                    let newActiveAssistant = state.activeAssistant;

                    if (state.activeAssistantId === id) {
                        newActiveId = newAssistants.length > 0 ? newAssistants[0].assistantId : null;
                        newActiveAssistant = null; // 先置空，等待组件触发 setActive 或者我们可以这里尝试加载
                    }

                    return {
                        assistants: newAssistants,
                        activeAssistantId: newActiveId,
                        activeAssistant: newActiveAssistant
                    };
                });

                // 如果自动切换了 ID，这里可以触发加载新助手数据的逻辑
                const newId = get().activeAssistantId;
                if (newId) {
                    get().setActiveAssistantId(newId);
                }
            },
            setActiveAssistantId: async (id) => {
                if (!id) {
                    set({ activeAssistantId: null, activeAssistant: null });
                    return;
                }

                set({ activeAssistantId: id }); // 立即响应 UI

                try {
                    const assistant = await assistantService.getAssistant(id);
                    // 再次检查 ID 是否变化（防止竞态条件）
                    if (get().activeAssistantId === id) {
                        set({ activeAssistant: assistant });
                    }
                } catch (error) {
                    console.error("Failed to load active assistant:", error);
                    // 可以在这里处理错误，比如重置 activeId
                }
            },

        }),
        {
            name: 'synapse-assistants',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                assistants: state.assistants,
                activeAssistantId: state.activeAssistantId
            }),
        }
    ))
