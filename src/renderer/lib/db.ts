import { openDB, DBSchema } from "idb";
import { Message } from "../types/conversation";
import { Assistant } from "../types/assistant";
interface SynapseDB extends DBSchema {
    messages: {
        key: string;
        value: Message;
        indexes: {
            'by-date': ['conversationId', 'timestamp']
        };
    },
    assistants: {
        key: string;
        value: Assistant;
    }
}

const DB_NAME = 'synapse-db';
const DB_VERSION = 2;

export const dbPromise = openDB<SynapseDB>(DB_NAME, DB_VERSION, {
    upgrade: (db, oldVersion, newVersion, transaction) => {
        if (oldVersion < 1) {
            const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
            messageStore.createIndex('by-date', ['conversationId', 'timestamp']);
        }
        if (oldVersion < 2) {
            db.createObjectStore('assistants', { keyPath: 'assistantId' });
        }
    },
})