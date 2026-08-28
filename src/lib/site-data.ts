import type { AppLocale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";

type SiteTranslation = {
  locale: string;
  eyebrow: string;
  headline: string;
  subheadline: string;
  aboutTitle: string;
  aboutBody: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  footerText: string;
  // Per-locale metadata & social card overrides. All optional; the runtime
  // chains fallbacks (translation.metaTitle -> translation.headline -> siteName).
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
};

const defaultTranslations: Record<AppLocale, SiteTranslation> = {
  zh: {
    locale: "zh",
    eyebrow: "个人主页 / xh.do",
    headline: "构建可长期演化的个人数字空间",
    subheadline:
      "聚焦前端工程、产品表达与技术体验，把灵感、项目和方法论沉淀成一个持续更新的科技感主页。",
    aboutTitle: "关于我",
    aboutBody:
      "这里是 xh.do 的个人主页原型。它支持在线修改文案、Logo、背景图片或背景视频，并通过密码加 TOTP 二次验证保护管理后台。",
    primaryLabel: "查看项目",
    primaryHref: "#projects",
    secondaryLabel: "",
    secondaryHref: "",
    footerText: "",
    metaTitle: "xh.do 个人主页",
    metaDescription:
      "xh.do 个人主页 —— 在线可管理的科技感首页，支持中英双语、明暗主题、项目展示与友链。",
    ogTitle: "xh.do 个人主页",
    ogDescription:
      "聚焦前端工程、产品表达与技术体验的持续更新的个人数字空间。",
    twitterTitle: "xh.do 个人主页",
    twitterDescription:
      "聚焦前端工程、产品表达与技术体验的持续更新的个人数字空间。",
  },
  en: {
    locale: "en",
    eyebrow: "Personal site / xh.do",
    headline: "A personal digital space built to evolve over time",
    subheadline:
      "A modern and cinematic home for projects, ideas and technical writing, with online content management and a secure admin workflow.",
    aboutTitle: "About",
    aboutBody:
      "This is the first version of the xh.do personal homepage. It supports live updates for text, logo and hero media, plus password and TOTP-based admin protection.",
    primaryLabel: "View projects",
    primaryHref: "#projects",
    secondaryLabel: "",
    secondaryHref: "",
    footerText: "",
    metaTitle: "xh.do · Personal site",
    metaDescription:
      "The xh.do personal homepage — an online-managed, cinematic single-page site with bilingual support, light/dark themes, project showcase and friend links.",
    ogTitle: "xh.do · Personal site",
    ogDescription:
      "A modern, evolving digital space for projects, ideas and technical writing.",
    twitterTitle: "xh.do · Personal site",
    twitterDescription:
      "A modern, evolving digital space for projects, ideas and technical writing.",
  },
};

export function parseMediaPlaylist(value?: string | null) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveMediaPlaylist(
  playlistValue?: string | null,
  fallbackUrl?: string | null,
) {
  const items = parseMediaPlaylist(playlistValue);
  if (fallbackUrl && !items.includes(fallbackUrl)) {
    items.unshift(fallbackUrl);
  }
  return items;
}

export function resolveThemeMediaSets(site: {
  heroMediaUrl?: string | null;
  heroMediaPlaylist?: string | null;
  heroLightImageUrl?: string | null;
  heroLightPlaylist?: string | null;
  heroDarkImageUrl?: string | null;
  heroDarkPlaylist?: string | null;
}) {
  const fallback = resolveMediaPlaylist(site.heroMediaPlaylist, site.heroMediaUrl);
  const lightItems = resolveMediaPlaylist(
    site.heroLightPlaylist ?? site.heroMediaPlaylist,
    site.heroLightImageUrl ?? site.heroMediaUrl,
  );
  const darkItems = resolveMediaPlaylist(
    site.heroDarkPlaylist ?? site.heroMediaPlaylist,
    site.heroDarkImageUrl ?? site.heroMediaUrl,
  );

  return {
    fallbackItems: fallback,
    lightItems: lightItems.length ? lightItems : fallback,
    darkItems: darkItems.length ? darkItems : fallback,
  };
}

export async function ensureSiteSettings() {
  const existing = await prisma.siteSettings.findUnique({
    where: { id: "default" },
    include: { translations: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.siteSettings.create({
    data: {
      id: "default",
      githubUrl: null,
      showFriendLinks: true,
      // Hero media is empty by default — admin uploads to /uploads/* via the
      // dashboard. Allowing arbitrary remote URLs (e.g. unsplash) would
      // contradict the `safeMediaUrl` whitelist enforced on PATCH.
      heroMediaUrl: null,
      heroMediaPlaylist: null,
      heroLightImageUrl: null,
      heroLightPlaylist: null,
      heroDarkImageUrl: null,
      heroDarkPlaylist: null,
      heroImageIntervalMs: 4500,
      heroBackgroundPosition: "center",
      heroBackgroundRect: null,
      logoUrl: null,
      accentColor: "#4cc9ff",
      gradientEnabled: true,
      gradientStart: "#1297ff",
      gradientEnd: "#7b61ff",
      gradientAngle: 135,
      ogImageUrl: null,
      twitterHandle: null,
      translations: {
        create: Object.values(defaultTranslations),
      },
    },
    include: { translations: true },
  });
}

export async function getSiteSettings(locale: AppLocale) {
  const site = await ensureSiteSettings();
  const mediaSets = resolveThemeMediaSets(site);
  const translation =
    site.translations.find((item) => item.locale === locale) ??
    defaultTranslations[locale];

  return {
    ...site,
    heroMediaItems: mediaSets.fallbackItems,
    heroLightItems: mediaSets.lightItems,
    heroDarkItems: mediaSets.darkItems,
    translation,
  };
}

export async function getProjects(locale: AppLocale) {
  const projects = await prisma.project.findMany({
    where: { isPublished: true },
    include: { translations: true },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return projects.map((project) => ({
    ...project,
    translation:
      project.translations.find((item) => item.locale === locale) ??
      project.translations[0] ?? {
        title: project.slug,
        summary: "",
        description: "",
        techStack: "",
      },
  }));
}

export async function getFriendLinks() {
  return prisma.socialLink.findMany({
    where: { isPublished: true, category: "friend" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getContactLinks() {
  return prisma.socialLink.findMany({
    where: { isPublished: true, category: "contact" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getHomePageData(locale: AppLocale) {
  const [site, projects, friendLinks, contactLinks] = await Promise.all([
    getSiteSettings(locale),
    getProjects(locale),
    getFriendLinks(),
    getContactLinks(),
  ]);

  return {
    site,
    projects,
    friendLinks,
    contactLinks,
  };
}
