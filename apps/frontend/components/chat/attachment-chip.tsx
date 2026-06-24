import { FileText, X } from "lucide-react";
import type { Attachment } from "@/lib/mocks";
import { cn } from "@/lib/utils";

export type AttachmentChipProps = {
  attachment: Attachment;
  onRemove?: (id: string) => void;
  className?: string;
};

/** Composer attachment pill: file icon + name + size + remove. */
export function AttachmentChip({
  attachment,
  onRemove,
  className,
}: AttachmentChipProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5",
        className
      )}
    >
      <span className="flex size-6 items-center justify-center rounded-md bg-accent text-primary">
        <FileText className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold">
          {attachment.filename}
        </span>
        <span className="block font-mono text-[10px] text-muted-foreground">
          {attachment.size}
        </span>
      </span>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(attachment.id)}
          aria-label={`Remove ${attachment.filename}`}
          className="ml-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
