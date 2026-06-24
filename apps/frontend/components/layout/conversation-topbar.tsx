"use client";

import { MoreHorizontal, Share } from "lucide-react";
import type { ModelOption } from "@/lib/mocks";
import { Button } from "@/components/ui/button";
import { ModelPicker } from "@/components/layout/model-picker";
import { cn } from "@/lib/utils";

export type ConversationTopbarProps = {
  title: string;
  models: ModelOption[];
  modelId: string;
  onModelChange: (id: string) => void;
  className?: string;
};

/** Thread header: conversation title + model picker + action buttons. */
export function ConversationTopbar({
  title,
  models,
  modelId,
  onModelChange,
  className,
}: ConversationTopbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border bg-card px-6 py-3.5",
        className
      )}
    >
      <h2 className="min-w-0 truncate font-serif text-[1.0625rem] font-medium">
        {title}
      </h2>
      <div className="flex items-center gap-2">
        <ModelPicker models={models} value={modelId} onChange={onModelChange} />
        <Button variant="outline" size="icon-sm" aria-label="Share">
          <Share className="size-4" />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="More">
          <MoreHorizontal className="size-4" />
        </Button>
      </div>
    </div>
  );
}
