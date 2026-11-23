"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Detect whether we're rendering on the client without triggering the
 * `react-hooks/set-state-in-effect` lint rule. `useSyncExternalStore`
 * returns the server snapshot (`false`) during SSR and hydration, then
 * the client snapshot (`true`) afterwards — no `useEffect` + `setState`
 * cascade, and no hydration mismatch because the first client render
 * still matches the server output.
 */
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * Dark-mode toggle for the SHEEGOW ACADEMY navbar.
 *
 * Uses next-themes to persist the user's choice to localStorage and to
 * respect the OS preference on first visit. The toggle only resolves its
 * icon after mount to avoid a React hydration mismatch (the server has no
 * idea which theme the client will resolve to).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useIsClient();

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
    >
      {/* Both icons sit stacked; we fade between them so the swap animates. */}
      <Sun
        className={`absolute h-[18px] w-[18px] transition-all duration-300 ${
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0"
        }`}
        aria-hidden="true"
      />
      <Moon
        className={`absolute h-[18px] w-[18px] transition-all duration-300 ${
          mounted && !isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
        aria-hidden="true"
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
