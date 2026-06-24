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
