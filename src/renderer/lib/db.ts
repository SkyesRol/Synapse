import { openDB, DBSchema } from "idb";
import { Message } from "../types/conversation";
interface SynapseDB extends DBSchema {
    messages: {
        key: string;
        value: Message;
        indexes: {
            'by-conversation': string,
            'by-date': ['conversationId', 'timestamp']
        };
    }
}

const DB_NAME = 'synapse-db';
const DB_VERSION = 1;

export const dbPromise = openDB<SynapseDB>(DB_NAME, DB_VERSION, {
    upgrade: (db) => {
        const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
        messageStore.createIndex('by-conversation', 'conversationId');
        messageStore.createIndex('by-date', ['conversationId', 'timestamp']);
    },
})