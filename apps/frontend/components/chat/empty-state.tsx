import { cn } from "@/lib/utils";
import type { MockUser } from "@/lib/mocks";
import { SuggestedPrompts } from "@/components/chat/suggested-prompts";

export type MarginaliaEmptyStateProps = {
  user: MockUser;
  prompts: string[];
  onPickPrompt: (prompt: string) => void;
  /** e.g. "Good evening" — caller decides the time-of-day greeting. */
  greeting?: string;
  className?: string;
};

/** First-run greeting: eyebrow + big serif headline + suggested prompts. */
export function MarginaliaEmptyState({
  user,
  prompts,
  onPickPrompt,
  greeting = "Welcome",
  className,
}: MarginaliaEmptyStateProps) {
  const firstName = user.name.split(" ")[0];
  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center px-6 text-center",
        className
      )}
    >
      <div className="w-full max-w-xl">
        <div className="text-[0.8125rem] font-semibold uppercase tracking-widest text-primary">
          {greeting}, {firstName}
        </div>
        <h1 className="mt-3.5 font-serif text-[2.875rem] font-medium leading-[1.08] tracking-[-0.02em]">
          What are we
          <br />
          working on?
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-secondary-foreground">
          Start with a thought, a draft, or a question. Marginalia keeps the
          thread tidy so you can stay in the writing.
        </p>
        <SuggestedPrompts
          prompts={prompts}
          onPick={onPickPrompt}
          className="mt-6"
        />
      </div>
    </div>
  );
}
