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
      githubUrl: "https://github.com/",
      showFriendLinks: true,
      heroMediaUrl:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80",
      heroMediaPlaylist:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80\nhttps://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80\nhttps://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1600&q=80",
      heroLightImageUrl:
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80",
      heroLightPlaylist:
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1600&q=80\nhttps://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=1600&q=80",
      heroDarkImageUrl:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80",
      heroDarkPlaylist:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80\nhttps://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80\nhttps://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1600&q=80",
      heroImageIntervalMs: 4500,
      logoUrl: null,
      accentColor: "#4cc9ff",
      gradientEnabled: true,
      gradientStart: "#1297ff",
      gradientEnd: "#7b61ff",
      gradientAngle: 135,
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
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
}

export async function getHomePageData(locale: AppLocale) {
  const [site, projects, friendLinks] = await Promise.all([
    getSiteSettings(locale),
    getProjects(locale),
    getFriendLinks(),
  ]);

  return {
    site,
    projects,
    friendLinks,
  };
}
