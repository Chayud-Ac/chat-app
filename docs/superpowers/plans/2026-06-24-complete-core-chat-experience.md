# Complete Core Chat Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a fresh app load show the designed first-run screen (greeting + composer + suggested prompts) that auto-creates a conversation on first send, and bring the streaming assistant turn up to design fidelity ("writing…" badge, code-block copy + language label, blockquote styling).

**Architecture:** Frontend-only. No backend, contract, or migration changes. `app/page.tsx` renders a new `FirstRunView` when no conversation is selected; its `onStart` callback creates a conversation, selects it, and passes the first message to `ChatView` via a new `initialMessage` prop that fires the existing `send()` once on mount. Streaming polish is presentational changes to `ChatView`'s in-flight-turn branch and the markdown/code render styles.

**Tech Stack:** Next.js 16 (App Router + Turbopack), TypeScript, React Query, Tailwind v4, `streamdown` + `@streamdown/code` for markdown/code rendering, pnpm.

**Service:** `apps/frontend` (single service — this whole plan).

---

## Pre-flight (run once before Task 1)

- [ ] **Install deps in the worktree** (node_modules is absent here)

Run: `cd apps/frontend && pnpm install`
Expected: completes; `node_modules/` populated.

- [ ] **Verify clean baseline**

Run: `cd apps/frontend && pnpm lint && pnpm build`
Expected: both succeed. If `pnpm build` fails on a pre-existing issue, STOP and report — do not start on a broken baseline.

> **Testing note:** `pnpm test` is a stub (`echo 'no frontend tests yet' && exit 0`). There is no component test harness. Per-task "verify" steps use `pnpm lint` + `pnpm build` + explicit manual checks. Do NOT fabricate a test suite.

---

## File Structure

- **Create** `apps/frontend/components/chat/first-run-view.tsx` — the first-run landing frame (greeting + suggested prompts + composer). Chat-domain → lives with `chat-view.tsx`. One responsibility: capture the first message and call `onStart`.
- **Modify** `apps/frontend/app/page.tsx` — render `FirstRunView` (not the placeholder) when `selectedId === null`; implement `onStart` (create → select → pass first message).
- **Modify** `apps/frontend/components/chat/chat-view.tsx` — add `initialMessage?: string` prop with a single-fire mount guard; add the streaming "writing…" badge to the in-flight assistant turn.
- **Modify** markdown/code render styling — code-block copy button + language label, blockquote styling. Exact file determined in Task 4 after reading the `@streamdown/code` plugin API.

---

## Task 1: `FirstRunView` component

**Files:**
- Create: `apps/frontend/components/chat/first-run-view.tsx`

This component reuses `MarginaliaEmptyState` (greeting + headline + suggested
prompts) and adds a composer. On submit it calls `onStart(text)`. It owns its own
draft state and a destructive-text error line for the auto-create failure path
(the parent sets the error via a callback — see Task 2).

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { AlignLeft, Paperclip } from "lucide-react";
import { MOCK_SUGGESTED_PROMPTS, MOCK_USER } from "@/lib/mocks";
import { MarginaliaEmptyState } from "@/components/chat/empty-state";
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputBody,
  PromptInputButton,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";

export type FirstRunViewProps = {
  /** Called with the first message when the user sends from the landing screen. */
  onStart: (text: string) => void;
  /** True while the parent is creating the conversation (disables submit). */
  isStarting?: boolean;
  /** Set by the parent when auto-create fails; shown inline. */
  error?: string | null;
};

export function FirstRunView({ onStart, isStarting, error }: FirstRunViewProps) {
  const [draft, setDraft] = useState("");

  const handleSubmit = (message: PromptInputMessage) => {
    const text = (message.text ?? "").trim();
    if (!text || isStarting) return;
    setDraft("");
    onStart(text);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <MarginaliaEmptyState
          user={MOCK_USER}
          prompts={MOCK_SUGGESTED_PROMPTS}
          greeting="Good evening"
          onPickPrompt={setDraft}
        />
        <div className="mt-8">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Ask anything, or paste a draft to revise…"
                value={draft}
                onChange={(e) => setDraft(e.currentTarget.value)}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputButton aria-label="Attach a file">
                  <Paperclip className="size-4" />
                </PromptInputButton>
                <PromptInputButton aria-label="Formatting">
                  <AlignLeft className="size-4" />
                </PromptInputButton>
              </PromptInputTools>
              <PromptInputSubmit status={isStarting ? "submitted" : "ready"} />
            </PromptInputFooter>
          </PromptInput>
          {error && (
            <p className="mt-2 text-center text-sm text-destructive">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

> Note: `MarginaliaEmptyState` already centers itself and renders the greeting +
> headline + `SuggestedPrompts`. We pass `onPickPrompt={setDraft}` so a prompt
> click prefills this composer's draft (same UX as `ChatView` today).

- [ ] **Step 2: Verify it compiles**

Run: `cd apps/frontend && pnpm lint && pnpm build`
Expected: both pass. (No usage yet — Task 2 wires it in.)

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/components/chat/first-run-view.tsx
git commit -m "feat(frontend): add FirstRunView landing component"
```

---

## Task 2: Wire `FirstRunView` into `page.tsx` + auto-create

**Files:**
- Modify: `apps/frontend/app/page.tsx`

Replace the `selectedId === null` placeholder with `FirstRunView`. Implement
`onStart`: create a conversation, seed the list cache, select it, and stash the
first message so the about-to-mount `ChatView` sends it (Task 3 adds the prop).

- [ ] **Step 1: Replace `page.tsx` with the wired version**

```tsx
"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "@contracts/chat";
import { createConversation } from "@/lib/api";
import { conversationsKey } from "@/lib/queries";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatView } from "@/components/chat/chat-view";
import { FirstRunView } from "@/components/chat/first-run-view";

export default function Home() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // First message captured on the first-run screen, handed to ChatView on mount.
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const handleStart = async (text: string) => {
    setIsStarting(true);
    setStartError(null);
    try {
      const conv = await createConversation();
      queryClient.setQueryData<Conversation[]>(conversationsKey, (prev) =>
        prev ? [conv, ...prev] : [conv]
      );
      setPendingMessage(text);
      setSelectedId(conv.id);
    } catch {
      setStartError("Couldn't start a conversation. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  const handleSelect = (id: string) => {
    setPendingMessage(null); // selecting an existing conversation: nothing to auto-send
    setSelectedId(id);
  };

  return (
    <div className="flex h-screen w-full">
      <Sidebar selectedId={selectedId} onSelect={handleSelect} />
      <main className="flex flex-1 flex-col">
        {selectedId ? (
          <ChatView
            key={selectedId}
            conversationId={selectedId}
            initialMessage={pendingMessage ?? undefined}
          />
        ) : (
          <FirstRunView
            onStart={handleStart}
            isStarting={isStarting}
            error={startError}
          />
        )}
      </main>
    </div>
  );
}
```

> `ChatView` is keyed by `selectedId`, so switching conversations remounts it and
> the `initialMessage` mount-guard (Task 3) re-evaluates per conversation.
> `pendingMessage` is only non-null right after auto-create, so existing
> conversations never auto-send.

- [ ] **Step 2: Verify**

Run: `cd apps/frontend && pnpm lint && pnpm build`
Expected: both pass. (`ChatView` does not yet accept `initialMessage` — TS will
error on that prop. If so, proceed to Task 3 in the SAME change set and verify
after Task 3. To keep tasks independently green, do Task 3 Step 1 before
re-running build.)

> **Sequencing:** Tasks 2 and 3 are coupled by the `initialMessage` prop. Apply
> Task 3 Step 1 (add the prop + guard to `ChatView`) before running the build for
> Task 2. Commit them together if the build only goes green with both.

- [ ] **Step 3: Commit** (may be combined with Task 3)

```bash
git add apps/frontend/app/page.tsx
git commit -m "feat(frontend): show FirstRunView on fresh load, auto-create on first send"
```

---

## Task 3: `ChatView` accepts `initialMessage` + "writing…" badge

**Files:**
- Modify: `apps/frontend/components/chat/chat-view.tsx`

Two changes: (a) an `initialMessage` prop that fires the existing `send()` exactly
once on mount; (b) the "writing…" badge on the in-flight assistant turn.

- [ ] **Step 1: Add the `initialMessage` prop + single-fire guard**

Change the component signature and add a guarded effect. The guard MUST be a ref
(not just an effect dep) to survive React 19 strict-mode double-invocation in dev.

Update the signature:

```tsx
export function ChatView({
  conversationId,
  initialMessage,
}: {
  conversationId: string;
  initialMessage?: string;
}) {
```

Add these imports to the existing `react` import line: `useEffect`. (Current
import is `import { useRef, useState } from "react";` → make it
`import { useEffect, useRef, useState } from "react";`.)

Add, just after the `send` function is defined (so `send` is in scope) and before
`handleSubmit`:

```tsx
  // Fire the first message exactly once when arriving from the first-run screen.
  const initialSent = useRef(false);
  useEffect(() => {
    if (initialMessage && !initialSent.current) {
      initialSent.current = true;
      void send(initialMessage);
    }
    // send is stable enough for this one-shot; deps intentionally minimal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);
```

- [ ] **Step 2: Add the "writing…" badge to the streaming turn**

In the `{turn && ( ... )}` block, the assistant `<Message from="assistant">` turn
currently renders only `MessageContent`. Add a label row with the badge above the
content. Replace the assistant `Message` inside the `turn` block with:

```tsx
              <Message from="assistant">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-wide text-foreground">
                    Marginalia
                  </span>
                  {!isThinking && (
                    <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium tracking-wide text-primary">
                      writing…
                    </span>
                  )}
                </div>
                <MessageContent>
                  {isThinking ? (
                    <ThinkingIndicator label="Reading your draft…" />
                  ) : (
                    <StreamingCaret>
                      <MessageResponse>{turn.assistantText}</MessageResponse>
                    </StreamingCaret>
                  )}
                </MessageContent>
              </Message>
```

> The badge only shows once streaming has begun (`!isThinking`), matching the
> design where "writing…" sits next to the assistant name during token output.
> `bg-accent`/`text-primary` are the existing Marginalia accent-muted + accent
> tokens (see `globals.css`).

- [ ] **Step 3: Verify (covers Task 2 + Task 3)**

Run: `cd apps/frontend && pnpm lint && pnpm build`
Expected: both pass.

- [ ] **Step 4: Manual verification**

Run: `cd apps/frontend && pnpm dev` (needs the backend running on :8080 for a real
send; the first-run render itself does not).
Check:
1. Fresh load (no conversation selected) shows the "Good evening, Elif / What are
   we working on?" screen with composer + suggested prompts — NOT the old
   "Select a conversation" text.
2. Typing a message and sending creates a conversation (appears in sidebar),
   navigates into it, and streams a reply.
3. During streaming, the assistant turn shows the "writing…" badge next to
   "Marginalia".

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/components/chat/chat-view.tsx apps/frontend/app/page.tsx
git commit -m "feat(frontend): auto-send first message + streaming 'writing…' badge"
```

---

## Task 4: Code-block copy button + language label

**Files:**
- Modify: markdown/code render config — exact location determined in Step 1.

The code rendering goes through `MessageResponse` → `<Streamdown plugins={{ code }} />`
using `@streamdown/code`. The copy button + language label are very likely
provided/configurable by that plugin rather than hand-rolled. Do NOT fabricate a
custom code renderer — investigate first.

- [ ] **Step 1: Read the plugin API**

Run: `ls apps/frontend/node_modules/@streamdown/code` and read its
`README`/types (`*.d.ts`) and any exported options.
Also check `node_modules/streamdown` docs for how plugins expose code-block
chrome (header, language label, copy control).
Determine: does the plugin already render a copy button + language label (then
this is a styling/enable task), or must we pass an option / wrap it?

- [ ] **Step 2: Implement the smallest change that yields the design's code header**

Based on Step 1:
- If the plugin renders a header by default → add Tailwind styles (via the
  `MessageResponse` `className` prose overrides or a global style) to match the
  design: dark header bar (`#26221C`-ish via tokens), mono language label, copy
  affordance.
- If the plugin needs an option (e.g. a `code` plugin config flag) → pass it in
  `streamdownPlugins`/`MessageResponse`.
- Only if neither is possible → wrap with a small custom code component, and note
  why in the commit message.

Write the actual change here once Step 1 is known. (Plan intentionally stops short
of fabricating the plugin's API — the executing agent fills this with the real
option/markup after reading the package.)

- [ ] **Step 3: Verify**

Run: `cd apps/frontend && pnpm lint && pnpm build`
Expected: both pass.

- [ ] **Step 4: Manual check**

In `pnpm dev`, send a prompt that returns a fenced code block (e.g. "show me a
typescript function"). Confirm the rendered code block has a language label and a
working copy button, matching the design's code header.

- [ ] **Step 5: Commit**

```bash
git add -A apps/frontend
git commit -m "feat(frontend): code-block language label + copy button"
```

---

## Task 5: Blockquote styling

**Files:**
- Modify: markdown render styling (same file/area touched in Task 4, or
  `MessageResponse` className prose overrides).

The design renders markdown blockquotes with a left accent border and serif
italic (the "The best tools don't announce themselves…" quote).

- [ ] **Step 1: Add blockquote prose styles**

Add to the `MessageResponse` `className` (in `apps/frontend/components/ai-elements/message.tsx`)
a blockquote override, or to the global prose styles if that's where existing
markdown styling lives (check first). Example override appended to the existing
`MessageResponse` className string:

```tsx
"[&_blockquote]:border-l-[3px] [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:font-serif [&_blockquote]:italic [&_blockquote]:text-secondary-foreground"
```

> Confirm whether markdown styling already lives in a central place
> (`globals.css` prose layer) before adding inline — match the existing pattern
> rather than scattering. If `globals.css` already styles `blockquote`, edit
> there instead.

- [ ] **Step 2: Verify**

Run: `cd apps/frontend && pnpm lint && pnpm build`
Expected: both pass.

- [ ] **Step 3: Manual check**

In `pnpm dev`, render an assistant message containing a `>` blockquote (the mock
thread in `lib/mocks.ts` already has one — viewable via the streamed reply or a
prompt that quotes). Confirm left accent border + serif italic.

- [ ] **Step 4: Commit**

```bash
git add -A apps/frontend
git commit -m "feat(frontend): style markdown blockquotes per design"
```

---

## Final verification (after all tasks)

- [ ] **Lint + build**

Run: `cd apps/frontend && pnpm lint && pnpm build`
Expected: both pass.

- [ ] **Full manual pass** of the three flows in Task 3 Step 4 plus the code-block
  and blockquote checks (Task 4/5). Confirm no regression to the existing
  active-conversation rendering.

- [ ] **Review before PR:** `code-reviewer` (frontend diff) + `cross-review`
  (clean-context Claude subagent). No `contract-guardian` (no contracts touched),
  no `ai-reviewer` (no ai-service touched).

---

## Spec coverage check

| Spec A requirement | Task |
|---|---|
| First-run landing replaces placeholder | Task 1 + 2 |
| Send from first-run auto-creates conversation | Task 2 (`handleStart`) |
| First message auto-sent into new conversation | Task 3 (`initialMessage` + guard) |
| Auto-create failure shows inline error | Task 2 (`startError`) + Task 1 (error prop) |
| "writing…" badge on streaming turn | Task 3 Step 2 |
| Code-block copy button + language label | Task 4 |
| Blockquote styling | Task 5 |
| No backend/contract/migration changes | (entire plan is `apps/frontend` only) |
| Honest testing (no fabricated suite) | Pre-flight note + per-task manual checks |
