"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  /** The user's stored preference — may be "system". */
  theme: ThemePreference;
  /** The effective theme ("system" resolved against the OS scheme). */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "xhdo-theme";
const SYSTEM_QUERY = "(prefers-color-scheme: dark)";

function isStoredPreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function resolvePreference(
  preference: ThemePreference,
  systemDark: boolean,
): ResolvedTheme {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

function applyThemeClass(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  // Matches the OS color scheme so form controls / scrollbars / favicon
  // render with the right chrome in both modes.
  document.documentElement.style.colorScheme = resolved;
}

/**
 * Toggle the `dark` class on <html>. We intentionally rely on plain class
 * toggling + CSS transitions: the earlier View Transitions snapshot crossfaded
 * the entire viewport (including the hero image) and made it impossible for
 * `tech-background.tsx` to run its own layered crossfade. The CSS variables in
 * globals.css transition smoothly on their own.
 */
export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // The initial render must match SSR (html starts with class "dark"), and the
  // pre-paint inline script in the root layout has already applied the correct
  // class for the stored preference / OS scheme before this mounts — so we
  // only state the resolved theme here after the mount effect reconciles.
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  // Mount once: pick up the stored preference and apply it. Defaults to
  // "system" for first-time visitors so the site adapts to the OS scheme.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const preference: ThemePreference = isStoredPreference(stored)
      ? stored
      : "system";
    const systemDark = window.matchMedia(SYSTEM_QUERY).matches;
    const resolved: ResolvedTheme = resolvePreference(preference, systemDark);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount-time hydration
    setThemeState(preference);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, []);

  // While the preference is "system", follow OS scheme changes live.
  useEffect(() => {
    const mql = window.matchMedia(SYSTEM_QUERY);
    const onChange = () => {
      if (theme !== "system") return;
      const resolved: ResolvedTheme = mql.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      applyThemeClass(resolved);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme(next: ThemePreference) {
        setThemeState(next);
        const systemDark = window.matchMedia(SYSTEM_QUERY).matches;
        const resolved: ResolvedTheme = resolvePreference(next, systemDark);
        setResolvedTheme(resolved);
        applyThemeClass(resolved);
        window.localStorage.setItem(STORAGE_KEY, next);
      },
    }),
    [theme, resolvedTheme],
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