"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  useTheme,
  type ThemePreference,
} from "@/components/theme-provider";

const OPTIONS: { value: ThemePreference; icon: typeof Sun }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("admin");

  const currentIcon = OPTIONS.find((o) => o.value === theme)?.icon ?? Sun;
  const CurrentIcon = currentIcon;

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    const onClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={t("themeToggleAria")}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="glass-panel inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-transform duration-200 ease-out hover:scale-105"
      >
        <CurrentIcon className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("themeMenuLabel")}
          className="glass-panel absolute right-0 top-12 z-50 w-44 overflow-hidden rounded-2xl p-1.5 shadow-xl"
        >
          {OPTIONS.map(({ value, icon: Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                role="menuitemradio"
                aria-checked={active}
                type="button"
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors duration-150 ${
                  active
                    ? "bg-foreground/10 font-medium text-foreground"
                    : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left">{t(themeLabelKey(value))}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function themeLabelKey(value: ThemePreference): "themeLight" | "themeDark" | "themeSystem" {
  return value === "light" ? "themeLight" : value === "dark" ? "themeDark" : "themeSystem";
}