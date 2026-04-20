# Day 4: Chat 功能构建 - Service 层与 IndexedDB 高级应用复盘

## Table of Contents
1. [IndexedDB Schema 设计与优化](#1-indexeddb-schema-设计与优化)
2. [Service 层架构设计](#2-service-层架构设计)
3. [高性能分页查询 (Pagination)](#3-高性能分页查询-pagination)
4. [总结与下一步](#4-总结与下一步)

---

## 1. IndexedDB Schema 设计与优化

### 🔴 问题现象
1.  **DBSchema 的困惑**：在 `db.ts` 中定义了 `interface SynapseDB extends DBSchema`，但不知道这个接口具体有什么用，是否只是为了代码好看？
2.  **排序乱序**：当需要实现“获取某个对话最新的 10 条消息”时，如果只用 `by-conversation`，数据库返回的消息是按 `id` (UUID) 排序的，即乱序。

### 🧠 知识盲区
*   **TypeScript 泛型的威力 (DBSchema)**：`idb` 库是一个高度类型安全的封装。通过定义 `DBSchema`，我们告诉了 TypeScript 数据库里有哪些表 (Store)、每个表的 Key 是什么类型、存的 Value 是什么结构、有哪些索引。
    *   **作用**：如果你尝试 `db.put('wrong_store', ...)` 或者用错误的索引名查询，TS 编译器会直接报错，而不是等到运行时才崩溃。这在重构时是巨大的安全网。
*   **Primary Key (主键) 的作用**：在 `idb` 中，`keyPath: 'id'` 定义了主键。它是查询最快的方式 (O(1))，也决定了默认的排序方式。
*   **复合索引 (Compound Index)**：不了解可以通过 `['fieldA', 'fieldB']` 的形式创建复合索引，从而同时满足“筛选”和“排序”的需求。

### ✅ 解决方案
1.  **明确定义 Schema**：利用 TS 接口精确描述数据库结构。
2.  **引入复合索引**：解决排序问题。

**代码示例 (db.ts)**：
```typescript
// 这里的 SynapseDB 就是我们的 "类型契约"
interface SynapseDB extends DBSchema {
    messages: {
        key: string;
        value: Message;
        indexes: {
            // 如果你在这里拼错了索引名，下面的 createIndex 就会报错！
            'by-date': [string, number]; 
        };
    }
}

// Upgrade 回调中创建索引
messageStore.createIndex('by-date', ['conversationId', 'timestamp']);
```

---

## 2. Service 层架构设计

### 🔴 问题现象
如果直接在 UI 组件中调用数据库代码，会导致业务逻辑与视图耦合严重，难以复用和测试。同时，对于“删除对话”这种涉及多表操作（删 localStorage 里的元数据 + 删 IndexedDB 里的消息）的复合动作，需要一个统一的地方管理。

### 🧠 知识盲区
*   **分层架构**：View -> Store (状态) -> Service (业务逻辑) -> DB (持久化)。
*   **纯函数 vs 对象单例**：最初使用了对象导出 (`export const service = { ... }`)，但在现代前端开发中，直接导出纯函数 (`export async function ...`) 更有利于 Tree-shaking 和代码简洁性。

### ✅ 解决方案
创建 `conversationService.ts`，以纯函数形式导出核心业务逻辑。

**关键 API**：
*   `addMessage`: 利用 `put` 的 Upsert 特性（有则改之，无则加之）。
*   `deleteMessages`: 基于索引批量查找并删除。
*   `deleteMessagesById`: 基于主键精准删除。

---

## 3. 高性能分页查询 (Pagination)

### 🔴 问题现象
用户提出需求：
1.  **首屏**：加载最新的 10 条消息。
2.  **上拉**：加载之前的 10 条消息。
3.  **性能**：担心如果聊天记录有几万条，`IDBKeyRange` 范围过大会导致内存爆炸。

### 🧠 知识盲区
*   **Cursor (游标) 的方向**：不知道 `openCursor(range, 'prev')` 可以让数据库从后往前（倒序）扫描。
*   **KeyRange 的边界控制**：不清楚如何利用 `upperOpen: true` 来精准切分分页，避免重复加载数据。
*   **Lazy Loading 机制**：误以为 `IDBKeyRange` 圈定范围就会把所有数据读入内存。实际上，配合 `Cursor` 和 `limit`，数据库只会读取我们需要的那几条，**性能开销与总数据量无关**。

### ✅ 解决方案
实现 `getMessagesPaged` 函数，利用复合索引 + 游标倒序 + 范围切分。

**核心逻辑图解**：
```
Database (Time Order): [Msg1, Msg2 ... Msg89, Msg90, Msg91 ... Msg100]
                                          ^       ^
                                          |       |
Query 1 (Latest 10): Range(-∞, +∞), PREV -+-------+-> Get [100...91], Record LastTimestamp = T91

Query 2 (Next 10):   Range(-∞, T91), PREV ------------> Start from T90, Get [90...81]
                     (upperOpen=true 排除 T91)
```

**代码示例 (Service)**：
```typescript
export async function getMessagesPaged(
    conversationId: string, 
    limit: number = 20,
    lastTimestamp?: number
): Promise<Message[]> {
    const db = await dbPromise;
    const tx = db.transaction('messages', 'readonly');
    const index = tx.store.index('by-date');

    let range: IDBKeyRange;
    
    if (lastTimestamp) {
        // 加载历史：查比 lastTimestamp 小的
        // upperOpen: true 确保不包含 lastTimestamp 本身
        range = IDBKeyRange.bound(
            [conversationId, 0], 
            [conversationId, lastTimestamp], 
            false, 
            true 
        );
    } else {
        // 首次加载：查最新的
        range = IDBKeyRange.bound([conversationId, 0], [conversationId, Infinity]);
    }

    // 'prev' 倒序遍历
    let cursor = await index.openCursor(range, 'prev');
    const messages: Message[] = [];

    while (cursor && messages.length < limit) {
        messages.push(cursor.value);
        cursor = await cursor.continue();
    }

    // DB返回 [新->旧]，UI需要 [旧->新]
    return messages.reverse();
}
```

---

这是一份基于我们之前对话整理的 `idb` 库与 IndexedDB 核心知识点笔记。你可以直接将其保存为 `.md` 文件。

## 4. 如何通过非主键字段查找数据？(`getAllFromIndex`)

### ❓ 问题
通常 `db.get` 或 `db.getAll` 只能通过主键（Primary Key）查找。如果我想通过其他字段（如 `category` 或 `price`）查找数据，该怎么做？

### 🧠 知识盲区
*   不了解 **Index（索引）** 的作用是专门用于非主键查询的。
*   不清楚 `getAllFromIndex` 的参数签名和 TypeScript 类型检查机制。

### ✅ 解决方案
使用 `db.getAllFromIndex` 方法。前提是在 `upgrade` 回调中已经创建了对应的索引。

**语法：**
```javascript
// 返回数组：所有匹配的数据
const results = await db.getAllFromIndex(storeName, indexName, query?, count?);
```

**示例：**
```typescript
// 1. 定义 Schema (TS)
interface ShopDB extends DBSchema {
  'products': {
    value: { id: number; category: string; price: number };
    key: number;
    indexes: { 'by-category': string }; // 定义索引类型
  };
}

// 2. 创建索引
const db = await openDB<ShopDB>('shop', 1, {
  upgrade(db) {
    const store = db.createObjectStore('products', { keyPath: 'id' });
    store.createIndex('by-category', 'category'); // 索引名, 属性名
  }
});

// 3. 查询
// 查找所有 category 为 'electronics' 的产品
const items = await db.getAllFromIndex('products', 'by-category', 'electronics');
```

---

## 5. 索引的创建规则与依赖性

### ❓ 问题
一个 Store 中可以创建多个索引吗？创建索引时，数据对象必须包含该属性吗？

### 🧠 知识盲区
*   对 IndexedDB 索引数量限制的误解。
*   不了解 **稀疏索引（Sparse Index）** 的概念（即索引不强制要求每条数据都有该字段）。

### ✅ 解决方案
1.  **数量**：可以创建**多个**索引（如 `by-email`, `by-age`），但索引越多，写入数据（`put`/`add`）越慢。
2.  **依赖性**：
    *   **不需要存在**：如果某条数据缺少索引指定的属性，IndexedDB 不会报错，而是直接**忽略**这条数据（不加入该索引列表）。
    *   **支持嵌套**：可以使用点符号索引深层属性，如 `store.createIndex('by-city', 'address.city')`。
    *   **支持复合**：可以索引多个字段组合，如 `store.createIndex('by-fullname', ['lastname', 'firstname'])`。

---

## 6. 如何通过索引批量删除数据？

### ❓ 问题
代码如下，这里的 `index` 是什么？为什么要用 `Promise.all` 而不是循环？
```javascript
const index = tx.store.index('by-conversation');
const keys = await index.getAllKeys(conversationId);
await Promise.all(keys.map(key => tx.store.delete(key)));
```

### 🧠 知识盲区
*   混淆了 **Index 对象**（工具）与 **查询值**（参数）的区别。
*   不知道删除操作必须在 **Store** 上通过 **主键** 进行，而不能直接在 Index 上删除。
*   对异步操作的 **并行（Parallel）** 与 **串行（Serial）** 性能差异不敏感。

### ✅ 解决方案
1.  **`index` 是什么**：它是索引操作句柄（`IDBIndex`），类似于“目录书”，用来查找数据对应的位置（主键）。
2.  **流程解析**：
    *   `index.getAllKeys(val)`：通过索引找到匹配数据的**主键列表**（如 `[101, 102]`）。
    *   `tx.store.delete(key)`：拿着主键去 Store 里删除数据。
3.  **循环 vs Promise.all**：
    *   **推荐** `Promise.all`：并行发出所有删除请求，速度最快。
    *   **不推荐** `for...of + await`：删完一条才删下一条，效率低。

---

## 7. 游标遍历与倒序查询 (`openCursor`)

### ❓ 问题
`let cursor = await index.openCursor(range, 'prev');` 这行代码是什么意思？有什么用？

### 🧠 知识盲区
*   不了解 **Cursor（游标）** 是处理大量数据的内存友好方式。
*   不知道 IndexedDB 支持原生 **倒序（Reverse）** 遍历。

### ✅ 解决方案
`openCursor` 用于逐条遍历数据，比 `getAll` 更省内存，且支持遍历过程中的修改/删除。

**参数解析：**
*   `range`：查询范围（如 `IDBKeyRange` 或具体值），`null` 代表所有。
*   `direction`：
    *   `'next'` (默认)：升序。
    *   `'prev'`：**降序**（常用于获取“最新”消息）。

**代码模式：**
```javascript
// 获取最新的消息（倒序遍历）
let cursor = await index.openCursor(null, 'prev');

while (cursor) {
  console.log(cursor.value); // 当前数据
  // cursor.update({...}) // 可修改
  // cursor.delete()      // 可删除

  cursor = await cursor.continue(); // 移动指针到下一条
}
```

## 8. 总结与下一步

### Summary
今天我们打通了 Chat 功能的“任督二脉”——**数据层**。
我们没有急着写 UI，而是先确保了：
1.  **Schema** 能支撑复杂的查询（复合索引）。
2.  **Service** 能处理高效的分页（Cursor + KeyRange）。
3.  **性能** 即使在十万级数据量下也能保持丝滑（Lazy Loading）。

这种“Local-First”且关注底层性能的开发模式，是打造高质量 Desktop App 的基石。

### Next Steps
*   **Hook 层 (useChat)**: 将 Service 与 Store 结合，管理 `messages` 状态和分页游标。
*   **UI 层 (ChatWindow)**: 接入 Hook，实现真正的消息渲染和发送。
