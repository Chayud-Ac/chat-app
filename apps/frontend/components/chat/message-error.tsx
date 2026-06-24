import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MessageErrorProps = {
  message: string;
  onRetry: () => void;
  onDismiss: () => void;
  className?: string;
};

/** Warm error/retry panel shown when a response is interrupted. */
export function MessageError({
  message,
  onRetry,
  onDismiss,
  className,
}: MessageErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-destructive/30 bg-destructive/10 p-3.5",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <p className="text-sm leading-relaxed text-destructive">{message}</p>
      </div>
      <div className="mt-3.5 flex gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={onRetry}
          className="gap-1.5"
        >
          <RefreshCw className="size-3.5" />
          Retry
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
