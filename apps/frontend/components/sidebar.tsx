"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import type { Conversation } from "@contracts/chat";
import { createConversation, listConversations } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const conversationsKey = ["conversations"] as const;

export function Sidebar({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const { data: conversations, isLoading, isError } = useQuery({
    queryKey: conversationsKey,
    queryFn: listConversations,
  });

  const newChat = useMutation({
    mutationFn: createConversation,
    onSuccess: (conv) => {
      queryClient.setQueryData<Conversation[]>(conversationsKey, (prev) =>
        prev ? [conv, ...prev] : [conv]
      );
      onSelect(conv.id);
    },
  });

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-muted/30">
      <div className="p-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => newChat.mutate()}
          disabled={newChat.isPending}
        >
          <Plus className="size-4" />
          New chat
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {isLoading && (
          <p className="px-2 py-1 text-sm text-muted-foreground">Loading…</p>
        )}
        {isError && (
          <p className="px-2 py-1 text-sm text-destructive">
            Failed to load conversations
          </p>
        )}
        {conversations?.length === 0 && (
          <p className="px-2 py-1 text-sm text-muted-foreground">
            No conversations yet
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {conversations?.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className={cn(
                  "w-full truncate rounded-md px-3 py-2 text-left text-sm hover:bg-accent",
                  selectedId === c.id && "bg-accent font-medium"
                )}
              >
                {c.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
