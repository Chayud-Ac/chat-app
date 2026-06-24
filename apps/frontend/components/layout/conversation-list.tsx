import type { ConversationGroup } from "@/lib/mocks";
import { cn } from "@/lib/utils";

export type ConversationListProps = {
  groups: ConversationGroup[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
};

/** Date-grouped conversation history (Today / Yesterday / …) with item states. */
export function ConversationList({
  groups,
  selectedId,
  onSelect,
  className,
}: ConversationListProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {groups.map((group) => (
        <div key={group.label}>
          <div className="px-3 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {group.label}
          </div>
          <ul className="flex flex-col gap-0.5">
            {group.items.map((c) => {
              const active = selectedId === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "w-full truncate rounded-md px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-semibold text-sidebar-foreground"
                        : "font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    )}
                  >
                    {c.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
