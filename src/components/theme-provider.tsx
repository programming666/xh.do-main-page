"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "xhdo-theme";

/**
 * Toggle the `dark` class on <html>. We intentionally rely on plain class
 * toggling + CSS transitions instead of `document.startViewTransition`: the
 * View Transitions snapshot crossfades the entire viewport (including the
 * hero image) which made it impossible for `tech-background.tsx` to do its
 * own smarter layered crossfade. With this lightweight approach the CSS
 * variables in globals.css transition smoothly on their own.
 */
function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
// The initial render must match SSR exactly to avoid a React hydration
  // mismatch, so we seed the React state with "dark" on both server and client
  // first paint. The root <html> in `src/app/layout.tsx` also hardcodes the
  // `dark` class to avoid a flash of unstyled content (FOUC). After mount the
  // effect below reads localStorage and reconciles both the state and the DOM.
  const [theme, setThemeState] = useState<Theme>("dark");

useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next: Theme = stored === "light" ? "light" : "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount-time hydration
    setThemeState(next);
    applyTheme(next);
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme(nextTheme: Theme) {
        setThemeState(nextTheme);
        applyTheme(nextTheme);
        window.localStorage.setItem(STORAGE_KEY, nextTheme);
      },
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
