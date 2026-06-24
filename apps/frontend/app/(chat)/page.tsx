"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { Conversation } from "@contracts/chat";
import { createConversation } from "@/lib/api";
import { conversationsKey } from "@/lib/queries";
import { stashPendingMessage } from "@/lib/pending-message";
import { FirstRunView } from "@/components/chat/first-run-view";

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
      // Carry the first message across the route change; ChatView sends it on mount.
      stashPendingMessage(conv.id, text);
      router.push(`/c/${conv.id}`);
    } catch (err) {
      // err.message is PII-safe: only HTTP method, path, and status code.
      console.error("[handleStart]", err instanceof Error ? err.message : err);
      setStartError("Couldn't start a conversation. Please try again.");
      setIsStarting(false);
    }
    // On success we navigate away, so isStarting need not be reset.
  };

  return (
    <FirstRunView
      onStart={handleStart}
      isStarting={isStarting}
      error={startError}
    />
  );
}
