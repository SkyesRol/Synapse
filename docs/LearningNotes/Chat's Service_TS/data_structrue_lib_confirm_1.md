# Day 3: Synapse 数据结构设计与 IndexedDB 基础复盘

## 目录
- [1. 多模态数据存储方案 (Blob vs Base64)](#1-多模态数据存储方案-blob-vs-base64)
- [2. TypeScript 类型系统进阶 (Union & Record)](#2-typescript-类型系统进阶-union--record)
- [3. IndexedDB 现代化开发实践 (idb)](#3-indexeddb-现代化开发实践-idb)
- [总结与下一步](#总结与下一步)

---

## 1. 多模态数据存储方案 (Blob vs Base64)

### 🔴 问题现象
在设计 `ImageContent` 数据结构时，不确定应该使用 **Base64 字符串** 还是 **Blob (Binary Large Object)** 来存储图片数据，特别是在考虑到 Local-First (本地优先) 架构和 Text-to-Image 功能时。

### 🧠 知识盲区
*   **Base64 的性能开销**：不清楚 Base64 编码会导致体积膨胀约 33%，且大字符串的解析（Parse/Decode）会严重阻塞 UI 主线程。
*   **Structured Cloning 算法**：不知道 IndexedDB 原生支持存储 Blob 对象（通过结构化克隆算法），无需手动序列化为字符串。

### ✅ 解决方案
对于 **Synapse** 这样需要存储高清生成图或用户上传文件的应用，**坚决使用 Blob**。

*   **Blob**: 原始二进制，体积小，读写快，浏览器原生支持 `URL.createObjectURL()` 进行懒加载渲染。
*   **Base64**: 仅用于极小的图标或必须通过 JSON 纯文本传输的场景。

**代码决策**：
```typescript
export type ImageContent = {
    type: 'image';
    mimeType: string;
    data: Blob; // 优先使用 Blob，避免大字符串
};
```

---

## 2. TypeScript 类型系统进阶 (Union & Record)

### 🔴 问题现象
1.  **联合类型语法错误**：试图用对象嵌套的方式定义多态类型，写成了 `type Content = { Text, Image }`，导致类型含义变成了“同时包含 Text 和 Image 的对象”。
2.  **工具类型困惑**：不理解 `Record<string, any>` 的含义。

### 🧠 知识盲区
*   **Discriminated Union (可辨识联合)**：TypeScript 中处理多态数据的标准模式。需要通过一个共同的字面量字段（如 `type: 'text'`）来区分不同类型。
*   **Utility Types**：不熟悉 TS 内置工具类型，如 `Record<Key, Value>` 用于定义键值对对象。

### ✅ 解决方案
使用 `|` (竖线) 定义联合类型，并为每个子类型添加 `type` 标签。

**代码示例**：
```typescript
// 1. 定义子类型
export type TextContent = { type: 'text'; text: string };
export type ImageContent = { type: 'image'; data: Blob };

// 2. 定义联合类型 (Discriminated Union)
// 前置的 | 是合法的语法糖，用于提升排版可读性
export type MessageContent = 
    | TextContent 
    | ImageContent;

// 3. 使用 Record 定义动态键值对 (如工具参数)
// 意为：Key 必须是字符串，Value 可以是任意类型
type ToolArgs = Record<string, any>; 
// 等价于 { [key: string]: any }
```

---

## 3. IndexedDB 现代化开发实践 (idb)

### 🔴 问题现象
询问为什么要引入 `idb` 库，而不是直接使用浏览器原生的 `window.indexedDB` API。

### 🧠 知识盲区
*   **原生 API 的回调地狱**：原生 IndexedDB 设计于 Promise 普及之前，完全基于事件回调 (`onsuccess`, `onerror`)，代码逻辑难以维护，且无法直接使用 `async/await`。
*   **Promise 包装器**：不了解 `idb` 只是一个极小的 Wrapper (约 1KB)，它保留了原生性能，但提供了现代化的开发体验。

### ✅ 解决方案
采用 `idb` 库作为数据库操作层。

**对比示例**：

**原生 (The Hard Way)**:
```javascript
const request = indexedDB.open('db', 1);
request.onsuccess = (e) => {
  const db = e.target.result;
  const tx = db.transaction('store', 'readwrite');
  tx.objectStore('store').add(data);
  // 还要处理 tx.oncomplete...
};
```

**idb (The Modern Way)**:
```javascript
import { openDB } from 'idb';
const db = await openDB('db', 1);
await db.add('store', data); // 清晰、线性、强类型
```

---

## 总结与下一步

**Summary**: 
今天完成了 **Synapse** 核心数据结构的设计。我们将消息内容 (`MessageContent`) 设计为支持混合排版的数组结构，利用 **Discriminated Union** 实现了类型安全的文本、图片和工具调用处理。同时确定了使用 **Blob** 存储大文件，并引入 **idb** 库以简化数据库操作。

**Next Steps**:
1.  安装 `idb` 库。
2.  在 `src/renderer/lib/db.ts` 中实现数据库初始化与 Schema 迁移逻辑。
3.  编写 CRUD 方法，打通会话的增删改查。
