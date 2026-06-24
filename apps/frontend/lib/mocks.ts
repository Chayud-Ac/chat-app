// Frontend-only view models + mock data for the Marginalia UI.
//
// These types are intentionally NOT in packages/contracts — they are
// presentational and exist only until the backend supports them (model
// picker, attachments, date-grouped history, user profile). This file is the
// single seam to replace with real API data (React Query) later.

import type { Conversation, Message } from "@contracts/chat";

// ---- User -----------------------------------------------------------------

export interface MockUser {
  name: string;
  initials: string;
  plan: string;
}

export const MOCK_USER: MockUser = {
  name: "Elif Kaya",
  initials: "EK",
  plan: "Free plan",
};

// ---- Models (top-bar picker) ----------------------------------------------

export interface ModelOption {
  id: string;
  label: string;
  status: "online";
}

export const MOCK_MODELS: ModelOption[] = [
  { id: "marginalia-pro", label: "Marginalia Pro", status: "online" },
  { id: "marginalia-air", label: "Marginalia Air", status: "online" },
];

// ---- Conversation history (date-grouped) ----------------------------------

export type GroupLabel = "Today" | "Yesterday" | "Last 7 days" | "Older";

export interface ConversationGroup {
  label: GroupLabel;
  items: Conversation[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Bucket conversations into Today / Yesterday / Last 7 days / Older by
 * createdAt. Empty groups are dropped; order is stable (newest bucket first).
 */
export function groupConversations(
  conversations: Conversation[],
  now: number = Date.now()
): ConversationGroup[] {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const buckets: Record<GroupLabel, Conversation[]> = {
    Today: [],
    Yesterday: [],
    "Last 7 days": [],
    Older: [],
  };

  for (const c of conversations) {
    const created = new Date(c.createdAt).getTime();
    if (created >= startOfToday) {
      buckets.Today.push(c);
    } else if (created >= startOfToday - DAY_MS) {
      buckets.Yesterday.push(c);
    } else if (created >= startOfToday - 7 * DAY_MS) {
      buckets["Last 7 days"].push(c);
    } else {
      buckets.Older.push(c);
    }
  }

  return (Object.keys(buckets) as GroupLabel[])
    .map((label) => ({ label, items: buckets[label] }))
    .filter((g) => g.items.length > 0);
}

function isoDaysAgo(days: number, now: number = Date.now()): string {
  return new Date(now - days * DAY_MS).toISOString();
}

export const MOCK_CONVERSATIONS: Conversation[] = [
  { id: "m1", title: "Revising the launch essay", createdAt: isoDaysAgo(0) },
  { id: "m2", title: "Naming the new feature", createdAt: isoDaysAgo(0) },
  { id: "m3", title: "Outline: quarterly memo", createdAt: isoDaysAgo(1) },
  { id: "m4", title: "Explain vector embeddings", createdAt: isoDaysAgo(1) },
  { id: "m5", title: "Cover letter, second pass", createdAt: isoDaysAgo(4) },
  { id: "m6", title: "Reading notes — Didion", createdAt: isoDaysAgo(6) },
];

export const MOCK_GROUPED_CONVERSATIONS: ConversationGroup[] =
  groupConversations(MOCK_CONVERSATIONS);

// ---- Sample thread (markdown + code block) --------------------------------

export const MOCK_MESSAGES: Message[] = [
  {
    id: "msg-1",
    conversationId: "m1",
    role: "user",
    content:
      "Here's my opening paragraph. Can you tighten it and tell me what the core claim is? Keep my voice.",
    createdAt: isoDaysAgo(0),
  },
  {
    id: "msg-2",
    conversationId: "m1",
    role: "assistant",
    content: [
      "Your core claim is simple and strong: *good tools disappear into the work*. Everything else is supporting it. Here's a tighter pass that keeps your cadence:",
      "",
      "> The best tools don't announce themselves. They get quiet, and the work gets loud.",
      "",
      "Two changes did most of the lifting:",
      "",
      "- Cut the throat-clearing first clause so the claim lands first.",
      "- Replaced `\"function invisibly\"` with a concrete image.",
      "",
      "If you want it programmatic, here's the revision rule I applied:",
      "",
      "```typescript",
      "// lead with the claim, cut hedges",
      "function tighten(sentence) {",
      "  return sentence",
      '    .drop("introductory hedges")',
      '    .front("the core claim");',
      "}",
      "```",
    ].join("\n"),
    createdAt: isoDaysAgo(0),
  },
];

// ---- Composer attachments -------------------------------------------------

export interface Attachment {
  id: string;
  filename: string;
  /** human-readable size, e.g. "8.2 KB" */
  size: string;
}

export const MOCK_ATTACHMENTS: Attachment[] = [
  { id: "att-1", filename: "draft-v3.md", size: "8.2 KB" },
];

// ---- Empty-state suggested prompts ----------------------------------------

export const MOCK_SUGGESTED_PROMPTS: string[] = [
  "Tighten this paragraph",
  "Outline an essay",
  "Explain a concept",
];
