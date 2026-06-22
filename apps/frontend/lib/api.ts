import type { ChatChunk, Conversation, Message } from "@contracts/chat";

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

// streamMessage POSTs a user message and reads the backend's SSE response,
// parsing each `data: <json>\n\n` frame into a ChatChunk and invoking onChunk.
// (Hand-rolled instead of useChat: backend emits our own ChatChunk format,
// not AI SDK's wire protocol.)
export async function streamMessage(
  conversationId: string,
  content: string,
  onChunk: (chunk: ChatChunk) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(
    `${BACKEND_URL}/api/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal,
    }
  );
  if (!res.ok || !res.body) {
    throw new Error(`send message failed: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);

      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.slice("data:".length).trim();
      if (!json) continue;
      onChunk(JSON.parse(json) as ChatChunk);
    }
  }
}
