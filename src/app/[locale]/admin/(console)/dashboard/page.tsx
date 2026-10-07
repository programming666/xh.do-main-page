import Link from "next/link";
import {
  ArrowUpRight,
  Component,
  ImageIcon,
  Link2,
  Settings,
  Shield,
  Sparkles,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireAdminPageWith2FA } from "@/lib/admin-page";
import { readAppearance } from "@/lib/appearance";
import { prisma } from "@/lib/prisma";
import { ensureSiteSettings } from "@/lib/site-data";

/**
 * Admin landing page: a real overview instead of the empty welcome panel.
 *
 * The counters come straight from the DB, the 2FA badge from the admin's own
 * TwoFactor row (Better Auth defaults `verified` to true when the row exists),
 * and the background badge from the stored appearance, so the dashboard answers
 * "what is live right now?" at a glance.
 */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: "zh" | "en" }>;
}) {
  const { locale } = await params;
  const session = await requireAdminPageWith2FA(locale);
  const t = await getTranslations({ locale, namespace: "admin" });

  const [projectTotal, projectPublished, linkTotal, twoFactor, site] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { isPublished: true } }),
    prisma.socialLink.count(),
    prisma.twoFactor.findFirst({ where: { userId: session.user.id } }),
    ensureSiteSettings(),
  ]);

  const appearance = readAppearance(site.appearance);
  const twoFactorOn = Boolean(twoFactor?.verified);
  const heroBackground = appearance.backgroundSource === "hero" && appearance.mediaVisible;

  const quickLinks = [
    { href: `/${locale}/admin/content/site`, icon: Settings, label: t("siteSettings"), desc: t("siteDesc") },
    { href: `/${locale}/admin/content/appearance`, icon: Sparkles, label: t("appearance"), desc: t("appearanceDesc") },
    { href: `/${locale}/admin/content/background`, icon: ImageIcon, label: t("backgroundSettings"), desc: t("backgroundDesc") },
    { href: `/${locale}/admin/content/projects`, icon: Component, label: t("projects"), desc: t("projectsDesc") },
    { href: `/${locale}/admin/content/links`, icon: Link2, label: t("friendLinks"), desc: t("linksDesc") },
    { href: `/${locale}/admin/security`, icon: Shield, label: t("security"), desc: t("securityDesc") },
  ];

  return (
    <div className="admin-stack">
      <section className="admin-card">
        <div className="admin-card-body">
          <h2 className="admin-card-title">{t("welcomeBack", { name: session.user.name })}</h2>
          <p className="admin-card-desc">{t("dashboardIntro")}</p>
          <div className="admin-btn-row" style={{ marginTop: 16 }}>
            <a className="admin-btn" data-variant="primary" href={`/${locale}`} target="_blank" rel="noreferrer">
              {t("viewSite")}
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <Link className="admin-btn" href={`/${locale}/admin/content/site`}>
              {t("editContent")}
            </Link>
          </div>
        </div>
      </section>

      <div className="admin-grid">
        <div className="admin-stat">
          <span className="admin-stat-label">
            <Component className="h-3.5 w-3.5" />
            {t("statProjects")}
          </span>
          <span className="admin-stat-value">{projectTotal}</span>
          <span className="admin-hint">{t("statProjectsHint", { published: projectPublished, total: projectTotal })}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-label">
            <Link2 className="h-3.5 w-3.5" />
            {t("statFriendLinks")}
          </span>
          <span className="admin-stat-value">{linkTotal}</span>
          <span className="admin-hint">{t("statFriendLinksHint")}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-label">
            <Shield className="h-3.5 w-3.5" />
            {t("statTwoFactor")}
          </span>
          <span>
            <span className="admin-badge" data-tone={twoFactorOn ? "success" : "warn"}>
              {twoFactorOn ? t("twoFactorOn") : t("twoFactorOff")}
            </span>
          </span>
          <span className="admin-hint">{t("statTwoFactorHint")}</span>
        </div>
        <div className="admin-stat">
          <span className="admin-stat-label">
            <ImageIcon className="h-3.5 w-3.5" />
            {t("statAppearance")}
          </span>
          <span>
            <span className="admin-badge" data-tone="primary">
              {heroBackground ? t("bgHero") : t("bgCustom")}
            </span>
          </span>
          <span className="admin-hint">{t("statAppearanceHint")}</span>
        </div>
      </div>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">{t("quickStart")}</h2>
            <p className="admin-card-desc">{t("quickStartHint")}</p>
          </div>
        </div>
        <div className="admin-card-body" data-flush="true">
          <div className="admin-list">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} className="admin-list-row" data-link="true" href={item.href}>
                  <span className="admin-list-thumb" data-fallback="true">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="admin-list-main">
                    <span className="admin-list-title">{item.label}</span>
                    <span className="admin-list-meta">{item.desc}</span>
                  </span>
                  <span className="admin-list-actions">
                    <ArrowUpRight className="h-4 w-4 opacity-60" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
