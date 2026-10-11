"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Component,
  Home,
  ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { authClient } from "@/lib/auth-client";

/**
 * Admin console chrome: sidebar + topbar + page container.
 *
 * Two things the previous shell got wrong and this one fixes: it rendered the
 * *dashboard's* intro panel above every page (so "品牌与媒体" appeared on the
 * projects page), and the floating utilities bar sat on top of the fixed
 * sidebar and clipped its brand block.
 *
 * Nav labels, page titles and page descriptions all come from the route table
 * below, so a new admin page adds one entry here and nothing else.
 */
type NavItem = {
  segment: string;
  icon: typeof LayoutDashboard;
  labelKey:
    | "dashboard"
    | "siteSettings"
    | "appearance"
    | "backgroundSettings"
    | "projects"
    | "friendLinks"
    | "security";
  descKey:
    | "dashboardDesc"
    | "siteDesc"
    | "appearanceDesc"
    | "backgroundDesc"
    | "projectsDesc"
    | "linksDesc"
    | "securityDesc";
};

const NAV_GROUPS: { key: "navOverview" | "navContent" | "navSystem"; items: NavItem[] }[] = [
  {
    key: "navOverview",
    items: [{ segment: "dashboard", icon: LayoutDashboard, labelKey: "dashboard", descKey: "dashboardDesc" }],
  },
  {
    key: "navContent",
    items: [
      { segment: "content/site", icon: Settings, labelKey: "siteSettings", descKey: "siteDesc" },
      { segment: "content/appearance", icon: Sparkles, labelKey: "appearance", descKey: "appearanceDesc" },
      { segment: "content/background", icon: ImageIcon, labelKey: "backgroundSettings", descKey: "backgroundDesc" },
      { segment: "content/projects", icon: Component, labelKey: "projects", descKey: "projectsDesc" },
      { segment: "content/links", icon: Link2, labelKey: "friendLinks", descKey: "linksDesc" },
    ],
  },
  {
    key: "navSystem",
    items: [{ segment: "security", icon: Shield, labelKey: "security", descKey: "securityDesc" }],
  },
];

export function AdminShell({
  locale,
  siteName,
  logoUrl,
  children,
}: {
  locale: string;
  siteName?: string;
  logoUrl?: string | null;
  children: React.ReactNode;
}) {
  const t = useTranslations("common");
  const a = useTranslations("admin");
  const pathname = usePathname();
  const router = useRouter();
  // The drawer remembers the route it was opened on, so any navigation closes it
  // without an effect that would set state during render.
  const [drawerRoute, setDrawerRoute] = useState<string | null>(null);
  const drawerOpen = drawerRoute === pathname;

  const routes = useMemo(
    () =>
      NAV_GROUPS.flatMap((group) =>
        group.items.map((item) => ({
          ...item,
          groupLabelKey: group.key,
          href: `/${locale}/admin/${item.segment}`,
        })),
      ),
    [locale],
  );

  // Deepest matching route wins, so nested admin pages still name their parent.
  const current =
    routes.find((entry) => pathname === entry.href) ??
    routes
      .filter((entry) => pathname.startsWith(`${entry.href}/`))
      .sort((left, right) => right.href.length - left.href.length)[0];

  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerRoute(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="admin-app" data-drawer={drawerOpen ? "open" : "closed"}>
      <div className="admin-layout">
        <aside className="admin-sidebar" id="admin-sidebar" aria-label={a("navigation")}>
          <Link className="admin-brand" href={`/${locale}/admin/dashboard`}>
            <span className="admin-brand-mark">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- uploaded logos are arbitrary SVG/raster files, not optimizable assets
                <img src={logoUrl} alt="" width={38} height={38} />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </span>
            <span className="min-w-0">
              <span className="admin-brand-name block truncate">{siteName ?? "xh.do"}</span>
              <span className="admin-brand-meta block">{t("admin")}</span>
            </span>
          </Link>

          <nav className="admin-nav">
            {NAV_GROUPS.map((group) => (
              <div key={group.key}>
                <p className="admin-nav-label">{a(group.key)}</p>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const href = `/${locale}/admin/${item.segment}`;
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={item.segment}
                      className="admin-nav-link"
                      href={href}
                      aria-current={active ? "page" : undefined}
                      prefetch
                    >
                      <Icon className="h-4 w-4" />
                      <span className="truncate">{a(item.labelKey)}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="admin-sidebar-foot">
            <Link className="admin-btn" data-variant="ghost" href={`/${locale}`}>
              <Home className="h-4 w-4" />
              {t("backHome")}
            </Link>
            <button
              type="button"
              className="admin-btn"
              data-variant="danger"
              onClick={async () => {
                await authClient.signOut();
                router.replace(`/${locale}/admin/login`);
              }}
            >
              <LogOut className="h-4 w-4" />
              {t("logout")}
            </button>
          </div>
        </aside>

        {drawerOpen ? (
          <button
            type="button"
            className="admin-scrim"
            aria-label={a("closeMenu")}
            onClick={() => setDrawerRoute(null)}
          />
        ) : null}

        <div className="admin-main">
          <header className="admin-topbar">
            <button
              type="button"
              className="admin-btn admin-menu-toggle"
              data-variant="ghost"
              data-icon="true"
              aria-expanded={drawerOpen}
              aria-controls="admin-sidebar"
              aria-label={drawerOpen ? a("closeMenu") : a("openMenu")}
              onClick={() => setDrawerRoute((open) => (open ? null : pathname))}
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="admin-topbar-text">
              <p className="admin-topbar-eyebrow">{current ? a(current.groupLabelKey) : t("admin")}</p>
              <h1 className="admin-topbar-title">{current ? a(current.labelKey) : t("admin")}</h1>
              {current ? <p className="admin-topbar-desc">{a(current.descKey)}</p> : null}
            </div>
            <div className="admin-topbar-actions">
              <LocaleSwitcher variant="admin" />
              <ThemeToggle variant="admin" />
            </div>
          </header>

          <main className="admin-page">{children}</main>
        </div>
      </div>
    </div>
  );
}
