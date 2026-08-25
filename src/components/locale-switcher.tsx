"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

function buildLocalePath(pathname: string, nextLocale: "zh" | "en") {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] === "zh" || segments[0] === "en") {
    segments[0] = nextLocale;
  } else {
    segments.unshift(nextLocale);
  }

  return `/${segments.join("/")}`;
}

export function LocaleSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="inline-flex rounded-full border border-slate-200/70 bg-white/85 p-1 text-sm shadow-[0_16px_48px_rgba(15,23,42,0.08)] transition-colors dark:border-white/10 dark:bg-slate-950/55"
    >
      {(["zh", "en"] as const).map((item) => {
        const active = locale === item;
        const label = item === "zh" ? "中文" : "English";
        return (
          <button
            key={item}
            type="button"
            aria-current={active ? "true" : undefined}
            aria-label={active ? `${label}（${t("language")}）` : label}
            onClick={() => {
              const nextPath = buildLocalePath(pathname, item);
              const query = searchParams.toString();
              router.replace(query ? `${nextPath}?${query}` : nextPath);
            }}
            className={`rounded-full px-3 py-1.5 transition-all duration-200 ease-out ${
              active
                ? "bg-slate-950 text-white shadow-sm dark:bg-white/12 dark:text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/8"
            }`}
          >
            {item.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}