"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { listConversations } from "@/lib/api";
import { conversationsKey } from "@/lib/queries";
import {
  MOCK_GROUPED_CONVERSATIONS,
  MOCK_USER,
  groupConversations,
} from "@/lib/mocks";
import { Button } from "@/components/ui/button";
import { Brand } from "@/components/layout/brand";
import { ConversationList } from "@/components/layout/conversation-list";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserAvatar } from "@/components/layout/user-avatar";

export function Sidebar({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { data: conversations, isLoading, isError } = useQuery({
    queryKey: conversationsKey,
    queryFn: listConversations,
  });

  // Real conversations get date-grouped; until the backend returns any, show
  // the mock history so the grouped layout is visible. (Single mock seam.)
  const groups = useMemo(() => {
    if (conversations && conversations.length > 0) {
      return groupConversations(conversations);
    }
    return MOCK_GROUPED_CONVERSATIONS;
  }, [conversations]);

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="px-4 pb-3.5 pt-4">
        <Brand size="sm" />
      </div>
      <div className="px-3.5 pb-3">
        <Button
          className="w-full justify-start gap-2"
          onClick={() => onSelect(null)}
        >
          <Plus className="size-4" />
          New conversation
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
        <ConversationList
          groups={groups}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </nav>
      <div className="flex items-center gap-2.5 border-t border-sidebar-border px-3 py-2.5">
        <UserAvatar initials={MOCK_USER.initials} size="lg" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold">{MOCK_USER.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {MOCK_USER.plan}
          </div>
        </div>
        <ThemeToggle className="-mr-1 shrink-0 text-muted-foreground hover:text-foreground" />
      </div>
    </aside>
  );
}
