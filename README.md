![Sapling](./public/banner.png)

# Sapling

**Sapling is a branching chat app that turns every conversation into a navigable mindmap.**

Unlike linear chat interfaces, Sapling lets you fork any message, keep multiple threads alive simultaneously, and precisely control what context the model sees — so you can explore ideas without losing earlier paths or polluting the model's attention with irrelevant history.

---

## The Problem

When conversations drift — because you explored a tangent, tried a different framing, or the model went in the wrong direction — your only options are to scroll back, start over, or manually stuff context into a new message. There is no way to keep multiple simultaneous lines of reasoning alive or to precisely choose which messages the model should and should not see.

---

## How It Works

Sapling looks like a familiar chatbot, but the real superpower is the **sidebar mindmap**: each message chain is a node path you can revisit and branch from at any time.

- **Fork any message** — branch the conversation from any node and pursue multiple lines of thought independently
- **Spatial navigation** — the mindmap gives conversations a physical location you can learn and return to, rather than relying on scroll position
- **Context control** — Sapling walks up the selected branch and includes ancestor messages until it reaches ~45% of the model's context window, so long conversations never become context soup
- **Model agnostic** — bring your own API key and choose the model per chat or per branch

---

## Docs

- [docs/BUILD.md](./docs/BUILD.md) — features, data model, user stories, terminology, and UX principles
- [docs/TECH.md](./docs/TECH.md) — full tech stack with rationale
- [docs/LOCAL.md](./docs/LOCAL.md) — local development setup

---

## Who It's For

Sapling is designed for individual practitioners — engineers, product managers, researchers, and writers — who use AI assistants heavily and have hit the ceiling of linear chat. The target user is comfortable supplying their own AI API key and values explicit control over the model's context.

**Out of scope (for now):** real-time collaboration, mobile-native apps, voice I/O, fine-tuning or model hosting.
