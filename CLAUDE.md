# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Synapse is a local-first Electron desktop app — an LLM chat platform with a unique **tree-shaped context memory** architecture designed for student learning. Users can branch conversations to explore sub-questions, then auto-summarize and inject results back into the main thread.

Currently in V1.0 (MVP) phase: validating tree-shaped context for learning scenarios.

## Commands

```bash
npm run dev      # Start Vite dev server + Electron (hot reload)
npm run build    # tsc && vite build && electron-builder (production)
npm run preview  # Preview production build
```

## Architecture

**Electron dual-process model:**
- `src/main/` — Electron main process (window creation, preload)
- `src/renderer/` — React renderer process (UI, state, services)
- `src/shared/` — Types and utilities shared between both processes

**Renderer layer structure:**
- `pages/` — Route-level views: Chat (home), Conversation, MCPMarket, Settings
- `components/` — Reusable UI (Sidebar, Modals, StreamResponse, etc.)
- `store/` — Zustand stores with `persist` middleware (localStorage for metadata)
- `services/` — Data access layer over IndexedDB (via `idb` library)
- `hooks/` — Custom hooks (`useChat`, `useClickOutside`)
- `types/` — TypeScript interfaces (conversation, assistant, models, providers)
- `lib/db.ts` — IndexedDB schema definition (version 3: `messages` + `assistants` stores)

**LLM integration (main process):**
- `src/main/llm/sseParser.ts` — Generic SSE stream parser (ReadableStream → AsyncGenerator<SSEFrame>)
- `src/main/llm/client.ts` — LLM API client (currently scaffolded)
- `src/shared/streamEvents.ts` — Typed stream event protocol (thinking, content, done, error)

**Routing:** Hash router via react-router-dom. Routes: `/` (Chat), `/conversation/:conversationId`, `/market`, `/settings`.

## Key Patterns

- **Path alias:** `@` → `src/` (configured in both vite.config.ts and tsconfig.json)
- **State management:** Zustand stores persist metadata to localStorage; full message/assistant data lives in IndexedDB
- **Styling:** styled-components exclusively. Design is monochromatic grayscale (#fff, #fcfcfc, #f5f5f5, #eee, #999, #4a4a4a). Font: Inter.
- **Animations:** Motion (framer-motion) for transitions and loading states
- **Icons:** lucide-react
- **IDs:** `crypto.randomUUID()` for all entity IDs
- **Messages:** Each message has multi-part `content` array (text, image, thinking, tool_call, tool_result)

## Architecture Decisions (from ADRs)

- Messages carry `parentMessageId` to form a tree structure (even though V1 UI is mostly linear)
- Branch context = root-to-branch-point path + branch's own messages
- Branch summarization uses the conversation model + a summarize prompt, triggered on manual "complete branch"
- IndexedDB chosen for local-first privacy; tree traversal (ancestor path) must be done in application code
- Dual-model architecture planned for V2 (conversation model + lightweight judgment model for auto-branching)

## Babel Plugin

`plugins/babel-plugin-add-source` — Custom Babel plugin injected via Vite React plugin config. Adds source path info to components.
