import { cn } from "@/lib/utils";

export type ThinkingIndicatorProps = {
  label?: string;
  className?: string;
};

/** Three bouncing dots + an italic serif status label, shown before the first token. */
export function ThinkingIndicator({
  label = "Thinking…",
  className,
}: ThinkingIndicatorProps) {
  return (
    <div
      className={cn("flex items-center gap-2.5 text-muted-foreground", className)}
      role="status"
      aria-live="polite"
    >
      <span className="inline-flex gap-1" aria-hidden>
        <Dot delay="0s" />
        <Dot delay="0.2s" />
        <Dot delay="0.4s" />
      </span>
      <span className="font-serif text-[0.9375rem] italic">{label}</span>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-1.5 rounded-full bg-primary motion-safe:animate-[mg-bounce_1.2s_infinite]"
      style={{ animationDelay: delay }}
    />
  );
}
