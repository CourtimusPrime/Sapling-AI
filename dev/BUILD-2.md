# Sappling — Full Working Design Specification

> **Purpose**: This document is a complete, implementation-ready specification for building *Sappling*, a branching conversational AI application. It is written to be handed directly to an AI engineering agent or development team.

---

## 1. Product Definition

Sappling is a conversational AI application where **every message is a node in a tree**. Users can branch, rewind, and continue conversations from any prior message without losing context or mutating history.

Key guarantees:

* Conversations are **non-linear**
* History is **immutable**
* Branching is **explicit and visible**
* Prompt context is **deterministic**

This is not undo/redo. This is persistent conversational timelines.

---

## 2. Core Principles (Non-Negotiable)

1. **Immutability** — Messages are never edited or deleted
2. **Single parent** — Every message has exactly one parent (except root)
3. **Explicit branching** — Branches are created intentionally
4. **Path-scoped context** — The LLM only sees the active path
5. **Visual clarity** — Users must always see where they are in the tree

Violating any of these breaks the product.

---

## 3. High-Level Architecture

### Frontend

* Next.js (App Router)
* shadcn/ui
* Existing Vercel AI SDK chatbot screen (to be extended)
* Server Components for data loading
* Client Components for chat + tree interactions

### Backend

* Postgres (primary datastore)
* UUID v7 for all IDs
* API routes (Next.js route handlers or equivalent)
* Vercel AI SDK for model streaming

No graph database. No message mutation.

---

## 4. Data Model (Authoritative)

### conversations

```sql
id UUID PRIMARY KEY
title TEXT
created_at TIMESTAMPTZ DEFAULT now()
```

### messages

```sql
id UUID PRIMARY KEY
conversation_id UUID NOT NULL REFERENCES conversations(id)
parent_message_id UUID REFERENCES messages(id)
role TEXT NOT NULL -- system | user | assistant
content TEXT NOT NULL
depth INT NOT NULL
created_at TIMESTAMPTZ DEFAULT now()
```

### Indexes

```sql
CREATE INDEX idx_messages_parent ON messages(parent_message_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_depth ON messages(depth);
```

---

## 5. Conversation Tree Semantics

* Root node is a **system message**
* All user/assistant messages descend from it
* Branching = creating a new child of an existing node
* Reverting = selecting a different node as the active head

### Example

```
M1: System
 └─ M2: User
     └─ M3: Assistant
         ├─ M4: User
         │   └─ M5: Assistant
         └─ M6: User
             └─ M7: Assistant
```

No messages are removed when branching.

---

## 6. Prompt Context Assembly (Critical Logic)

### Rules

* The LLM **only** sees messages on the active path
* Messages from sibling branches are never included

### Algorithm

1. Start from the current message ID
2. Walk parent pointers until root
3. Reverse the list
4. Send to the model

### Reference Implementation

```python
def build_context(message_id):
    messages = []
    current = get_message(message_id)

    while current:
        messages.append(current)
        current = get_message(current.parent_message_id)

    return reversed(messages)
```

This guarantees:

* Deterministic prompts
* No ghost memory
* Exact state restoration

---

## 7. API Contract (Minimum Viable)

### Create Conversation

```
POST /api/conversations
→ { conversationId }
```

### Create Message (User or Assistant)

```
POST /api/messages
{
  conversationId,
  parentMessageId,
  role,
  content
}
→ { messageId }
```

### Fetch Conversation Tree

```
GET /api/conversations/:id/messages
→ flat list of messages
```

Tree reconstruction is done client-side.

---

## 8. Streaming Response Flow

1. User submits input while positioned at a node
2. New **user message** is created as child of active node
3. Context is built from that new node
4. LLM response is streamed
5. Final assistant message is persisted as another child

Streaming **must not** mutate stored messages mid-stream.

---

## 9. UI Requirements (shadcn + Vercel AI SDK)

### Core Components

#### Chat Panel

* Standard chat UI
* Messages rendered from **active path only**
* Streaming assistant messages supported

#### Tree Panel (Required)

* Collapsible tree view
* Indentation = depth
* Fork icon when a node has multiple children
* Click any message to "Continue from here"

#### Active Path

* Highlight current branch
* Clear visual indicator of selected node

---

## 10. UX Anti-Patterns (Do Not Implement)

* Linear-only history
* Dropdown-based timeline navigation
* Auto-merging branches
* Implicit branching
* Hidden context changes

If users cannot see the tree, the product fails.

---

## 11. Performance Considerations

* Message counts will grow quickly
* Depth is stored to avoid recomputation
* Parent indexes are mandatory
* Cache resolved paths aggressively
* Recursive CTEs are sufficient

Materialized paths are optional later.

---

## 12. Optional Phase 2 Features

Design should allow:

* Named branches
* Branch diffs
* Branch summaries
* Pruning abandoned branches
* Replay from node with a different system prompt

Do **not** build these initially.

---

## 13. Explicit Non-Goals

Sappling does **not**:

* Auto-merge branches
* Rewrite history
* Share context across branches
* Perform graph analytics

---

## 14. One-Sentence Contract for AI Builders

> Implement a branching conversational system where messages are immutable tree nodes, prompt context is derived solely from the active path, and users can visibly fork and continue conversations at any point.