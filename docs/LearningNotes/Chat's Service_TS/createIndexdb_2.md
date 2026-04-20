# Day 4: Synapse IndexedDB 集成与架构设计复盘

## Table of Contents

- [1. 混合存储策略 (Hybrid Storage Strategy)](#1-混合存储策略-hybrid-storage-strategy)
- [2. IndexedDB Schema 设计 (Relational Pattern)](#2-indexeddb-schema-设计-relational-pattern)
- [3. 类型系统的调整 (Type Enhancement)](#3-类型系统的调整-type-enhancement)
- [Summary & Next Steps](#summary--next-steps)

---

## 1. 混合存储策略 (Hybrid Storage Strategy)

### 🔴 问题现象

在构建 Synapse 这种重型 AI 客户端时，我们面临两个存储挑战：
1.  **容量限制**：LocalStorage 只有约 5MB，无法存储包含图片（Base64）的大量聊天记录。
2.  **性能瓶颈**：LocalStorage 是同步读写，如果数据量过大，应用启动和渲染列表时会阻塞主线程，导致 UI 卡顿。

### 🧠 知识盲区

*   **存储分层意识**：初学者容易试图把所有数据都塞进一个地方（要么全存 LS，要么全存 DB）。
*   **同步 vs 异步**：忽略了 LocalStorage 的同步阻塞特性对启动速度的影响。

### ✅ 解决方案

我们采用了 **“目录在内存/LS，内容在 DB”** 的混合策略：

*   **LocalStorage**: 存储轻量级的 `ConversationMetadata[]`（ID, 标题, 时间）。
    *   *优势*：同步读取，应用启动瞬间即可渲染左侧会话列表，体验极佳。
*   **IndexedDB**: 存储重量级的 `Message[]`（文本, 图片, 推理过程）。
    *   *优势*：异步读写，容量几乎无限，支持二进制数据，不阻塞 UI。

---

## 2. IndexedDB Schema 设计 (Relational Pattern)

### 🔴 问题现象

在设计数据库结构时，直觉上我们想：“既然是聊天软件，能不能为每个对话创建一个单独的表（Store），例如 `conversation_1`, `conversation_2`？”

### 🧠 知识盲区

*   **IndexedDB 的静态特性**：**Object Store (表)** 只能在数据库 **版本升级 (Version Upgrade)** 时创建或删除。我们无法在用户点击“新建对话”时动态创建一个新的 Store。
*   **Store != Folder**：数据库的 Store 更像 SQL 的 Table，而不是文件系统的文件夹。

### ✅ 解决方案

我们采用了 **“单表平铺 + 索引” (One Store + Index)** 的关系型设计模式。

所有消息都存放在同一个名为 `messages` 的 Store 中，通过 `conversationId` 字段来区分它们属于哪个对话。

**核心代码 (src/renderer/lib/db.ts)**：

```typescript
import { openDB, DBSchema } from "idb";
import { Message } from "../types/conversation";

interface SynapseDB extends DBSchema {
    messages: {
        key: string;
        value: Message;
        indexes: {
            'by-conversation': string // 定义索引名称
        };
    }
}

export const dbPromise = openDB<SynapseDB>('synapse-db', 1, {
    upgrade: (db) => {
        // 1. 创建 messages 表，主键为 id
        const messageStore = db.createObjectStore('messages', { keyPath: 'id' });
        // 2. 创建索引，用于后续按会话查询消息
        messageStore.createIndex('by-conversation', 'conversationId');
    },
});
```

---

## 3. 类型系统的调整 (Type Enhancement)

### 🔴 问题现象

在之前的内存版实现中，`Message` 是嵌套在 `Conversation` 对象里的数组，它不需要知道自己属于谁。但在数据库扁平化存储后，如果 Message 对象里没有 `conversationId`，我们就无法将它还原回对应的会话中。

### 🧠 知识盲区

*   **外键 (Foreign Key) 概念**：在从“嵌套文档结构”转向“扁平化数据库存储”时，必须引入外键来维护数据之间的关联。

### ✅ 解决方案

修改 TypeScript 类型定义，显式增加 `conversationId` 字段。

**核心代码 (src/renderer/types/conversation.ts)**：

```typescript
export interface Message {
    id: string;
    role: Role;
    content: MessageContent[];
    timestamp: number;
    deepThinking: boolean;
    conversationId: string; // 👈 新增外键字段
}
```

---

## Summary & Next Steps

**总结**:
今天我们成功搭建了 Synapse 的本地持久化基础设施。通过引入 IndexedDB 并采用关系型设计，我们解决了未来可能面临的大文件存储和性能问题，同时保持了应用启动的流畅性。

**Next Steps**:
1.  创建 `src/renderer/services/conversationService.ts`。
2.  实现 CRUD 逻辑：`addMessage`, `getMessagesByConversationId`。
3.  实现分页加载（利用 Cursor），优化长对话的加载体验。
