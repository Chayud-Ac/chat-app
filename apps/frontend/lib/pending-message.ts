// Carries the first message from the first-run screen (`/`) across the
// navigation to `/c/[id]`, where ChatView sends it on mount. We use
// sessionStorage (keyed by conversation id) rather than a query param so the
// message — user PII — never appears in the URL, and so it survives the
// route change that discards React state.

const KEY_PREFIX = "pending-message:";

export function stashPendingMessage(conversationId: string, text: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY_PREFIX + conversationId, text);
}

/** Returns the stashed message (if any) and removes it — one-shot. */
export function takePendingMessage(conversationId: string): string | null {
  if (typeof window === "undefined") return null;
  const key = KEY_PREFIX + conversationId;
  const text = sessionStorage.getItem(key);
  if (text !== null) sessionStorage.removeItem(key);
  return text;
}
