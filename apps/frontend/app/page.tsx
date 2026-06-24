"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatView } from "@/components/chat/chat-view";

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="flex h-screen w-full">
      <Sidebar selectedId={selectedId} onSelect={setSelectedId} />
      <main className="flex flex-1 flex-col">
        {selectedId ? (
          <ChatView key={selectedId} conversationId={selectedId} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Select a conversation or start a new chat
          </div>
        )}
      </main>
    </div>
  );
}
