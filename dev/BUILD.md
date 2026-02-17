# Sapling

Sapling is a **conversation tree** where every message is a node that can branch, rewind, and continue independently without losing context.

Each message:

* Has exactly **one parent** (except the root)
* Can have **multiple children**
* Is **immutable** once created

Reverting never deletes history — it simply changes which node you continue from.

---

## Example

```text
M1: System
 └─ M2: User ("Explain Redis")
     └─ M3: Assistant
         ├─ M4: User ("Go deeper on persistence")
         │   └─ M5: Assistant
         └─ M6: User ("Compare with Memcached")
             └─ M7: Assistant
```

If the user clicks **"Branch from M3"**:

* New messages attach to `M3`
* `M4` and `M5` still exist, untouched
* A new timeline is created

---

## Prompt Context

When sending a prompt to the LLM:

1. Pick the **current message node**
2. Walk **up the tree to the root**
3. Reverse the list
4. Send **only that path** to the model

### Pseudocode

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

* Perfect state restoration
* No **ghost memory** from abandoned branches
* Deterministic, reproducible prompts

---

## UX

### Required

* Timeline **tree view** (collapsible, in the sidebar)
* Branch indicator (small fork icon)
* **"Continue from here"** action on every message
* Current path highlight

### Avoid

* Dropdown-only history
* Linear chat illusion
* Auto-merging branches

Users must **see the tree** or they will get lost.

---

## Terminology

| Sappling Concept | Familiar Term |
| ---------------- | ------------- |
| Branch           | Fork          |
| Revert           | Checkout      |
| Current path     | Active branch |
| Root message     | Base commit   |

---

## Storage & Performance Reality Check

### Message count explodes

Assume:

* Users experiment
* Branches are cheap
* Trees get wide

### Decisions

* **Postgres** as the primary datastore
* Message IDs are **UUIDs** (prefer UUID v7 for time ordering)
* Tree stored as an **adjacency list**

### Do this early

* Index on `parent_message_id`
* Index on `conversation_id`
* Store `depth` on each message
* Cache resolved paths
* Consider materialized paths later (`1.4.7.9` style)

Postgres recursive CTEs are sufficient for all required traversal patterns.

---

## Optional Power Features (Phase 2)

Design so these are possible, not mandatory:

* Named branches
* Diff between branches
* Branch summaries
* Auto-prune abandoned branches
* Replay from a node with a different system prompt
