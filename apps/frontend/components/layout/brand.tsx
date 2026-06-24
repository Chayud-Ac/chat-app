import { cn } from "@/lib/utils";

const SIZES = {
  sm: { badge: "size-6 rounded-md text-base", word: "text-lg" },
  md: { badge: "size-[30px] rounded-[7px] text-xl", word: "text-3xl" },
} as const;

export type BrandProps = {
  size?: keyof typeof SIZES;
  /** Hide the wordmark, show only the badge. */
  badgeOnly?: boolean;
  className?: string;
};

/** The Marginalia "M" badge + wordmark. Reused in the sidebar header and footer. */
export function Brand({ size = "sm", badgeOnly = false, className }: BrandProps) {
  const s = SIZES[size];
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex items-center justify-center bg-primary font-heading font-semibold leading-none text-primary-foreground",
          s.badge
        )}
      >
        M
      </span>
      {!badgeOnly && (
        <span
          className={cn(
            "font-heading font-semibold tracking-tight",
            s.word
          )}
        >
          Marginalia
        </span>
      )}
    </div>
  );
}
