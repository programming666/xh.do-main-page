"use client";

import Link from "next/link";
import {
  Component,
  ImageIcon,
  LayoutDashboard,
  Link2,
  LogOut,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function AdminShell({
  locale,
  children,
}: {
  locale: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("common");
  const a = useTranslations("admin");
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { href: `/${locale}/admin/dashboard`, icon: LayoutDashboard, label: a("dashboard") },
    { href: `/${locale}/admin/content/site`, icon: Settings, label: a("siteSettings") },
    { href: `/${locale}/admin/content/background`, icon: ImageIcon, label: a("backgroundSettings") },
    { href: `/${locale}/admin/content/projects`, icon: Component, label: a("projects") },
    { href: `/${locale}/admin/content/links`, icon: Link2, label: a("friendLinks") },
    { href: `/${locale}/admin/security`, icon: Shield, label: a("security") },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(18,151,255,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(123,97,255,0.1),transparent_20%),var(--background)]">
      <aside className="fixed inset-y-0 left-0 z-40 w-72 border-r border-border bg-[color:var(--card-strong)]/80 backdrop-blur-2xl">
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-6">
            <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(18,151,255,0.18),rgba(123,97,255,0.16))] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.15)]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/15 text-cyan-100 dark:bg-white/10">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">xh.do</p>
                  <h1 className="mt-1 text-lg font-semibold text-foreground">{a("dashboard")}</h1>
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">{a("dashboardIntro")}</p>
            </div>
          </div>
          <div className="px-4 pt-4">
            <p className="px-3 text-xs font-medium uppercase tracking-[0.24em] text-[color:var(--muted)]">
              {a("navigation")}
            </p>
          </div>
          <nav className="flex-1 space-y-1.5 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[linear-gradient(135deg,var(--primary),var(--secondary))] text-white shadow-lg shadow-cyan-500/20 dark:text-slate-950"
                      : "text-[color:var(--muted)] hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                  }`}
                  prefetch
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-4">
            <Link
              href={`/${locale}`}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[color:var(--muted)] transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
            >
              {t("backHome")}
            </Link>
            <button
              type="button"
              className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
              onClick={async () => {
                await authClient.signOut();
                router.push(`/${locale}/admin/login`);
              }}
            >
              <LogOut className="h-4 w-4" />
              {t("logout")}
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-72 flex-1">
        <div className="mx-auto max-w-6xl px-8 py-10">
          <div className="glass-panel mb-6 rounded-[1.75rem] border border-[color:var(--border)] px-6 py-5">
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-400">{a("dashboard")}</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">{a("brandMedia")}</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">{a("dashboardIntro")}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
