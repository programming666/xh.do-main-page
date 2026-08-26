"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  useTheme,
  type ThemePreference,
} from "@/components/theme-provider";

/**
 * Click-to-cycle theme control. A single button advances the preference
 * through the three-state loop system → light → dark → system, so first-time
 * visitors stay on "system" (follow the OS) until they explicitly choose.
 *
 * The button icon reflects the *stored preference* (not the resolved theme):
 * Monitor when following the OS, Sun for light, Moon for dark.
 */
const CYCLE: ThemePreference[] = ["system", "light", "dark"];

function nextPreference(current: ThemePreference): ThemePreference {
  const index = CYCLE.indexOf(current);
  return CYCLE[(index + 1) % CYCLE.length];
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("admin");

  const CurrentIcon =
    theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      // aria-label reads the current selection so screen readers announce the
      // active state, not just the action.
      aria-label={`${t("themeToggleAria")} · ${t(themeLabelKey(theme))}`}
      title={t(themeLabelKey(theme))}
      onClick={() => setTheme(nextPreference(theme))}
      className="glass-panel inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-transform duration-200 ease-out hover:scale-105"
    >
      <CurrentIcon className="h-4 w-4" />
    </button>
  );
}

function themeLabelKey(value: ThemePreference): "themeLight" | "themeDark" | "themeSystem" {
  return value === "light" ? "themeLight" : value === "dark" ? "themeDark" : "themeSystem";
}
