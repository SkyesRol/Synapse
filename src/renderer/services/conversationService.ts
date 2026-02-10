import { dbPromise } from "../lib/db";
import { Message } from "../types/conversation";
// ---------------------  添加信息（相互对话，每条对话都为一条信息）-----------------------------
export async function addMessage(message: Message): Promise<string> {
    const db = await dbPromise;
    await db.put('messages', message);
    return message.id
}
// ----------------------------------------------------------------------------------------


// ------------------------------ 获取对话所有信息 -----------------------------------------
export async function getAllMessages(conversationId: string | undefined): Promise<Message[]> {
    if (!conversationId) return [];
    const db = await dbPromise;
    const range = IDBKeyRange.bound([conversationId, 0], [conversationId, Infinity]);
    return await db.getAllFromIndex('messages', 'by-date', range);
}
// --------------------------------------------------------------------------------------


// ------------------------------- 获取10条信息 ------------------------------------------
export async function getMessagesPaged(conversationId: string | undefined, limit: number = 10, lastTimestamp?: number): Promise<Message[]> {
    if (!conversationId) return [];

    const db = await dbPromise;
    const transaction = db.transaction('messages', 'readonly');
    const index = transaction.store.index('by-date');
    let range: IDBKeyRange;
    if (lastTimestamp) {
        range = IDBKeyRange.bound([conversationId, 0], [conversationId, lastTimestamp], false, true);
    } else {
        range = IDBKeyRange.bound([conversationId, 0], [conversationId, Infinity]);
    }
    let cursor = await index.openCursor(range, 'prev');
    const messages: Message[] = [];
    while (cursor && messages.length < limit) {
        messages.push(cursor.value);
        cursor = await cursor.continue();
    }

    return messages.reverse();
}


// --------------------------------------------------------------------------------------




// -------------------------- 删除某个对话（删除所有信息）---------------------------------
export async function deleteConversation(conversationId: string | undefined): Promise<string | undefined> {
    if (!conversationId) return undefined;
    const db = await dbPromise;
    const transaction = db.transaction('messages', 'readwrite');
    // 删除 'by-conversation' 索引，仅利用 'by-date' 的字段来判断删除范围
    const index = transaction.store.index('by-date');
    const range = IDBKeyRange.bound([conversationId, 0], [conversationId, Infinity]);
    const keys = await index.getAllKeys(range);

    await Promise.all(keys.map((key => transaction.store.delete(key))));

    await transaction.done;
}
// ------------------------------------------------------------------------------------

// ---------------------------- 删除某些对话信息 -----------------------------------------
export async function deleteMessages(messageIds: string[]): Promise<void> {
    const db = await dbPromise;
    const transaction = db.transaction('messages', 'readwrite');

    await Promise.all(messageIds.map((id) => transaction.store.delete(id)));
    await transaction.done;
}
// ------------------------------------------------------------------------------------