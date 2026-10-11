import { Layers, Lock, Sparkles, Wand2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AppLocale } from "@/i18n/routing";
import { ensureSiteSettings } from "@/lib/site-data";

/**
 * Standalone chrome for the two pre-console screens (/admin/login and
 * /admin/2fa). It shares the admin design tokens with AdminShell, so the
 * console looks like one product from the first screen the admin sees.
 */
export async function AdminAuthShell({
  locale,
  children,
}: {
  locale: AppLocale;
  children: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "admin" });
  const site = await ensureSiteSettings();

  const points = [
    { icon: Layers, key: "authPointContent" as const },
    { icon: Wand2, key: "authPointAppearance" as const },
    { icon: Lock, key: "authPointSecurity" as const },
  ];

  return (
    <div className="admin-app admin-auth">
      <aside className="admin-auth-aside">
        <div>
          <span className="admin-auth-brand">
            <span className="admin-brand-mark">
              {site.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- uploaded logos are arbitrary SVG/raster files, not optimizable assets
                <img src={site.logoUrl} alt="" width={38} height={38} />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0">
              <span className="admin-brand-name block truncate">{site.siteName}</span>
              <span className="admin-brand-meta block">{t("brandTagline")}</span>
            </span>
          </span>
          <h2>{t("authAsideTitle")}</h2>
          <p>{t("authAsideBody")}</p>
          <div className="admin-auth-points">
            {points.map((point) => {
              const Icon = point.icon;
              return (
                <span key={point.key}>
                  <Icon className="h-4 w-4" />
                  {t(point.key)}
                </span>
              );
            })}
          </div>
        </div>
        <p className="admin-auth-note">{site.siteName}</p>
      </aside>
      <main className="admin-auth-main">
        <div className="admin-auth-card">
          <div className="admin-auth-tools">
            <LocaleSwitcher variant="admin" />
            <ThemeToggle variant="admin" />
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
