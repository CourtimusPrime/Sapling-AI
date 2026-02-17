# **Sapling**

Sapling is a **branching chat app** that turns every conversation into a clickable mindmap, letting you fork at any point, keeping multiple conversations alive, and precisely control what context the model sees.

Sapling looks like a familiar chatbot, but the real superpower is the sidebar mindmap: each message chain is a node path you can revisit and branch from. When generating replies, Sapling walks up the selected branch and includes messages until it hits ~45% of the model’s context window, so long conversations don’t turn into context soup.

# Terminology

| Term | Definition |
| ---- | ---------- |
| `chat` | Root container |
| `node` | A message or a checkpoint |

# Data Model

```dbml
Table chat {
  id bigint [pk, increment]
  title text
  created_at timestamp [default: current_timestamp]
}

Enum roles {
  user
  bot
  system
}

Table node {
  id uuid [pk, auto generated]
  chat_id bigint [not null]
  parent_id uuid [default: null]
  role roles [not null]
  content text
  created_at timestamp [default: current_timestamp]

  Indexes {
    (chat_id)
    (parent_id)
  }
}

Table node_metadata {
  node_id uuid [pk, ref: > node.id]
  provider text [not null]
  model text [not null]
  temperature float [not null]
  tools_called text[] [default: null]
  files text[] [default: null]
  token_count bigint [not null, default: 0]
  
  Indexes {
    (node_id)
    (provider)
    (model)
  }
}
```
