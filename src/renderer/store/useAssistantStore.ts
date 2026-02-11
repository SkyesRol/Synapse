import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Assistant } from "../types/assistant";
import { ModelConfig } from "../types/models";

const DEFAULT_MODEL_CONFIG:
    ModelConfig = {
    modelId: 'Pro/moonshotai/Kimi-K2.5',
    modelName: 'Kimi-K2.5',
    temperature: 0.5,
    maxTokens: 4096,
    topP: 1,
    stream: true
}

export type CreateAssistantParams =
    Omit<Assistant, 'assistantId' | 'createdAt' | 'updatedAt'>


interface AssistantState {
    assistants: Assistant[];
    activeAssistantId: string | null;
    createAssistant: (params: CreateAssistantParams) => string;
    updateAssistant: (id: string, updates: Partial<Assistant>) => void;
    deleteAssistant: (id: string) => void;
    setActiveAssistantId: (id: string | null) => void;
}

export const useAssistantStore = create<AssistantState>()(
    persist(
        (set, get) => ({
            assistants: [],
            activeAssistantId: null,

            createAssistant: (params) => {
                const newId = crypto.randomUUID();
                const newAssistant: Assistant = {
                    assistantId: newId,
                    ...params,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                }
                set((state) => ({
                    assistants: [newAssistant, ...state.assistants],
                    activeAssistantId: newId,
                }));
                return newId;

            },
            updateAssistant: (id, updates) => {
                set((state) => ({
                    assistants: state.assistants.map((assistant) =>
                        assistant.assistantId === id ? { ...assistant, ...updates, updatedAt: Date.now() } : assistant
                    )
                }))

            },
            deleteAssistant: (id) => {
                set((state) => {
                    const newAssistants = state.assistants.filter((a) => a.assistantId !== id);
                    const newActiveId = state.activeAssistantId === id ? (newAssistants.length > 0 ? newAssistants[0].assistantId : null) : state.activeAssistantId;
                    return {
                        assistants: newAssistants,
                        activeAssistantId: newActiveId
                    }
                })
            },
            setActiveAssistantId: (id) => set({ activeAssistantId: id }),

        }),
        {
            name: 'synapse-assistants',
            storage: createJSONStorage(() => localStorage),
        }
    ))