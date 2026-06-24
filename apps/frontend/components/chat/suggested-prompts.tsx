import { cn } from "@/lib/utils";

export type SuggestedPromptsProps = {
  prompts: string[];
  onPick: (prompt: string) => void;
  className?: string;
};

/** Row of pill-shaped prompt suggestions shown in the empty state. */
export function SuggestedPrompts({
  prompts,
  onPick,
  className,
}: SuggestedPromptsProps) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-2.5", className)}>
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onPick(prompt)}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm text-secondary-foreground transition-colors hover:border-primary/40 hover:bg-accent/40"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
