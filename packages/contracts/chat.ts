export type Role = "user" | "assistant";

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  createdAt: string;
}

export type ChatChunk =
  | { type: "delta"; text: string }
  | { type: "done"; message: Message }
  | { type: "error"; message: string };
