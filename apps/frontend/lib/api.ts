import type { Conversation, Message } from "@contracts/chat";

// Backend base URL. Frontend dev (:3000) calls backend (:8080) cross-origin.
export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function listConversations(): Promise<Conversation[]> {
  return request<Conversation[]>("/api/conversations");
}

export function createConversation(): Promise<Conversation> {
  return request<Conversation>("/api/conversations", { method: "POST" });
}

export interface ConversationDetail {
  conversation: Conversation;
  messages: Message[];
}

export function getConversation(id: string): Promise<ConversationDetail> {
  return request<ConversationDetail>(`/api/conversations/${id}`);
}
