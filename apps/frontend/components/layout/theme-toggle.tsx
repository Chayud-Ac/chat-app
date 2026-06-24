"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

export type ThemeToggleProps = {
  className?: string;
};

// Always false on the server / first client render, true after hydration.
// useSyncExternalStore is the lint-clean way to get a mount flag without
// calling setState inside an effect.
const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true, // client snapshot
    () => false // server snapshot
  );
}

/**
 * Light/dark toggle. next-themes resolves the persisted theme on the client
 * before hydration, so the server (which can't know the theme) and client can
 * disagree. We render a stable, theme-agnostic placeholder until mounted, then
 * swap in the real icon — keeping SSR and the first client render identical.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-label={
        mounted
          ? isDark
            ? "Switch to light theme"
            : "Switch to dark theme"
          : "Toggle theme"
      }
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Before mount, theme is unknown — render a neutral icon to match SSR. */}
      <Sun className={isDark ? "hidden size-4" : "size-4"} />
      {mounted && isDark ? <Moon className="size-4" /> : null}
    </Button>
  );
}
