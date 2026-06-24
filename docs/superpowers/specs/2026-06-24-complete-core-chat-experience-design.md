# Spec A — Complete the core chat experience

**Date:** 2026-06-24
**Branch:** `feat/chat-feature`
**Status:** Design (awaiting user review)
**Series:** Spec A of A→B→C. B = message actions, C = title search (separate specs).

## Problem

The chat app's components and happy-path wiring exist (commits #21/#22), but the
core conversation flow is not actually complete against the Marginalia design:

1. **First-run landing is broken.** On load, `selectedId` is `null`, so `page.tsx`
   renders the placeholder text *"Select a conversation or start a new chat"*
   instead of the designed first-run screen (greeting + composer + suggested
   prompts). The `MarginaliaEmptyState` component exists but is only reachable
   *after* a conversation is selected — the wrong place. A new user lands on a
   dead placeholder.

2. **Streaming/active-chat fidelity is incomplete.** The send→stream→persist→reload
   path works, but the in-flight assistant turn is missing design details: the
   "writing…" badge, code-block copy button + language label, and blockquote
   styling.

This spec fixes both. It is **frontend-only** — no backend, contract, or
migration changes — so it ships without waiting on backend work.

## Scope

**In scope**
- First-run landing: render the designed entry screen when no conversation is
  selected; sending from it auto-creates a conversation and sends the first
  message.
- Streaming polish: "writing…" badge on the streaming turn; code-block copy
  button + language label; blockquote styling — to match the design frames.

**Out of scope** (other specs / YAGNI)
- Message actions row (copy / regenerate / feedback) → **Spec B**.
- Conversation title search → **Spec C**.
- Real attachments, real auth/user profile, model routing, edit/delete
  conversations.

## Current state (verified against code)

- `apps/frontend/app/page.tsx` — holds `selectedId` state; renders `<Sidebar>` +
  either `<ChatView>` (when selected) or the placeholder div (when null).
- `apps/frontend/components/chat/chat-view.tsx` — per-conversation view: React
  Query `getConversation`, `send()` drives `streamMessage` (SSE), renders turns,
  empty state (`MarginaliaEmptyState`), thinking indicator, streaming caret,
  composer (`PromptInput`).
- `apps/frontend/components/chat/empty-state.tsx` — `MarginaliaEmptyState`:
  eyebrow greeting + serif headline + `SuggestedPrompts`. Already matches design.
- `apps/frontend/lib/api.ts` — `createConversation()`, `getConversation()`,
  `streamMessage()` all call the real backend.
- New-chat flow today: the sidebar "New conversation" button calls
  `createConversation` → sets `selectedId` → `ChatView` shows its empty branch.

## Design

### 1. First-run landing

**Component boundary.** Introduce `components/chat/first-run-view.tsx` owning the
first-run frame: greeting + `SuggestedPrompts` + a composer. It is chat-domain,
so it sits in `components/chat/` alongside `chat-view.tsx` (consistent with
existing placement; confirm against `frontend-stack` shared-vs-colocated rules at
implementation time).

**Wiring in `page.tsx`.** When `selectedId === null`, render `<FirstRunView>`
instead of the placeholder div. `FirstRunView` receives an
`onStart(firstMessage: string)` callback.

**Auto-create on first send.** `onStart` is implemented in `page.tsx` (it owns
`selectedId` and the query client):
1. `createConversation()` → new conversation.
2. `setSelectedId(conv.id)` and seed the conversations list cache (same
   `setQueryData` pattern the sidebar already uses).
3. Hand the first message to the freshly-mounted `ChatView` so it sends
   immediately.

**Passing the first message into `ChatView`.** `ChatView` gains an optional
`initialMessage?: string` prop. On mount, if present, it calls its existing
`send()` once (guarded so it fires a single time). This reuses the entire
existing streaming path — no new send logic. Suggested-prompt clicks in the
first-run view prefill the composer draft (existing `onPickPrompt` behaviour);
the user still presses send.

**Greeting.** Keep the existing `greeting="Good evening"` literal that
`ChatView` passes today (time-of-day logic is out of scope). `MarginaliaEmptyState`
is reused as-is inside `FirstRunView` (or `FirstRunView` composes the same
greeting + prompts markup) — no duplicate styling.

### 2. Streaming polish

All presentational, in the frontend render layer:

- **"writing…" badge.** On the in-flight assistant turn (when `turn !== null`),
  show the small pill badge from the design next to the assistant label while
  streaming. Lives in `chat-view.tsx`'s `turn` render branch (alongside the
  existing `ThinkingIndicator` / `StreamingCaret` logic).
- **Code-block copy button + language label.** In the markdown/code rendering
  used by `MessageResponse`, render the language label and a copy button on
  fenced code blocks, matching the design's code header. (Uses the existing
  streamdown/code path; this is a styling + small interaction addition, not a
  new renderer.)
- **Blockquote styling.** Style markdown blockquotes to the design (left accent
  border, serif italic) via the markdown render styles.

These touch `chat-view.tsx`, the `ai-elements/message` render, and markdown
styling. No data or contract changes.

## Data flow

Unchanged from today. First-run just front-loads the existing
create → select → send → stream → persist → invalidate chain. No new endpoints.

## Error handling

- First-run auto-create: in `page.tsx` the first-send path calls
  `createConversation()` directly (not via the sidebar mutation). On failure it
  must show a visible inline error in the first-run view (e.g. a small
  destructive-text line, matching the sidebar's "Failed to load conversations"
  treatment) rather than failing silently. The composer stays usable so the user
  can retry. No new error component is required — reuse the existing muted/
  destructive text styling.
- Streaming errors: unchanged — `ChatView` already renders `MessageError` with
  retry on stream error.

## Testing

- **Frontend has no real test harness** — `pnpm test` is a stub
  (`echo 'no frontend tests yet' && exit 0`). This spec does **not** invent a
  suite. Verification is:
  - `pnpm lint` and `pnpm build` must pass.
  - Manual verification of three flows: (a) fresh load shows the first-run
    screen; (b) sending from first-run creates a conversation and streams a
    reply; (c) streaming turn shows the "writing…" badge, and a code block shows
    the copy button + language label.
- This testing limitation is stated honestly here so the plan and execution
  don't claim coverage that doesn't exist.

## Risks / open questions

- `initialMessage` single-fire guard must be robust to React strict-mode double
  mount in dev (use a ref, not just an effect dependency).
- Confirm `FirstRunView` placement against `frontend-stack` shared-vs-colocated
  rules at implementation (chat-domain → `components/chat/` is the expected home).
