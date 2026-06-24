import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Blinking block caret (the Marginalia StreamingIndicator).
 *
 * Wrap streaming assistant content so the caret hugs the end of the last
 * rendered block instead of dropping to its own line:
 *
 *   <StreamingCaret>
 *     <MessageResponse>{text}</MessageResponse>
 *   </StreamingCaret>
 *
 * Implemented as an `after:` pseudo-element on the last child so it flows
 * inline with the final line of prose. Respects `prefers-reduced-motion`.
 */
export type StreamingCaretProps = {
  children: ReactNode;
  className?: string;
};

export function StreamingCaret({ children, className }: StreamingCaretProps) {
  return (
    <div
      className={cn(
        "[&>*:last-child]:after:ml-0.5 [&>*:last-child]:after:inline-block [&>*:last-child]:after:h-[1.1em] [&>*:last-child]:after:w-0.75 [&>*:last-child]:after:translate-y-0.75 [&>*:last-child]:after:rounded-[1px] [&>*:last-child]:after:bg-primary [&>*:last-child]:after:align-baseline [&>*:last-child]:after:content-['']",
        "motion-safe:[&>*:last-child]:after:animate-[mg-blink_1s_steps(1)_infinite]",
        className
      )}
    >
      {children}
    </div>
  );
}
