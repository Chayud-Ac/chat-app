import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-6 text-[10px]",
  md: "size-7 text-xs",
  lg: "size-9 text-sm",
} as const;

export type UserAvatarProps = {
  initials: string;
  size?: keyof typeof SIZES;
  className?: string;
};

/** Circular initials avatar for the signed-in user. */
export function UserAvatar({ initials, size = "md", className }: UserAvatarProps) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-foreground",
        SIZES[size],
        className
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
