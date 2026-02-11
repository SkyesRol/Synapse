import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ConversationMetadata } from "../types/conversation";

interface ConversationState {
    conversations:
    ConversationMetadata[];
    activeId: string | null;


    createConversation: (assistantId: string, topic?: string) => string;
    deleteConversation: (id: string) => void;
    setActiveId: (id: string | null) => void;
}


export const useConversationStore =

    create<ConversationState>()(
        persist(

            (set, get) => ({
                conversations: [],
                activeId: null,

                createConversation: (assistantId: string, topic = 'New Chat') => {
                    const newId = crypto.randomUUID();

                    const newChat: ConversationMetadata = {
                        id: newId,
                        assistantId,
                        topic: topic,
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                    };
                    set((state) => ({
                        conversations: [newChat, ...state.conversations],
                        activeId: newId
                    }));
                    return newId;
                },

                deleteConversation: (id) =>
                    set((state) => ({
                        conversations: state.conversations.filter((item) => item.id != id),
                        activeId: state.activeId === id ? null : state.activeId
                    })),


                setActiveId: (id) => set({ activeId: id }),
            }),
            {
                name: 'conversationMetadata',
                storage: createJSONStorage(() => localStorage),
            }

        )
    )












