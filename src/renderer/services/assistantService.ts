import { dbPromise } from "../lib/db";
import { Assistant } from "../types/assistant";

//-------------------- 添加Assistant ------------------------------------
export async function addAssistant(assistant: Assistant): Promise<string> {
    const db = await dbPromise;
    await db.put('assistants', assistant);
    return assistant.assistantId
}

// -----------------------------------------------------------------------------


// ------------------------  更新 Assistant -------------------------------------
export type AssistantUpdates = Partial<Omit<Assistant, 'assistantId'>>;

export async function updateAssistant(id: string, updates: AssistantUpdates):
    Promise<void> {
    const db = await dbPromise;
    const tx = db.transaction('assistants', 'readwrite');
    const store = tx.objectStore('assistants');
    const existingData = await store.get(id);
    if (!existingData) {
        throw new Error(`Assistant id: ${id} not found`)
    };
    const updateAssistant: Assistant = {
        ...existingData,
        ...updates,
        updatedAt: Date.now()
    };
    await store.put(updateAssistant);
    await tx.done;
}

// -----------------------------------------------------------------------------

export async function deleteAssistant(id: string, conversationIds: string[]): Promise<void> {
    const db = await dbPromise;
    const tx = db.transaction(['assistants', 'messages'], 'readwrite');

    await tx.objectStore('assistants').delete(id);

    const messageStore = tx.objectStore('messages');
    const index = messageStore.index('by-conversation');

    await Promise.all(conversationIds.map(async (conversationId) => {
        const keys = await index.getAllKeys(conversationId);
        for (const key of keys) {
            await messageStore.delete(key);
        }
    }));

    await tx.done;
}

export async function getAssistant(id: string): Promise<Assistant> {
    const db = await dbPromise;
    const assistant = await db.get('assistants', id);
    if (!assistant) throw new Error(`Assistant id: ${id} not found`);
    return assistant;
}