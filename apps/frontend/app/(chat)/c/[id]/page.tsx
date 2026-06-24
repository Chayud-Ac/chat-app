"use client";

import { use } from "react";
import { ChatView } from "@/components/chat/chat-view";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // `key` remounts ChatView when the conversation changes, resetting its
  // local stream state and re-evaluating the initial-message handoff.
  return <ChatView key={id} conversationId={id} />;
}
