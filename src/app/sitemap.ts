import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { ensureSiteSettings } from "@/lib/site-data";

// The public surface is intentionally small: root page + friends.
// Admin pages are deliberately excluded so they don't leak via sitemap.
//
// Re-render at most once a minute (the same window the pages use) so `lastmod`
// can follow real content edits instead of freezing at the last deploy, while
// crawlers still normally receive a prebuilt document.
export const revalidate = 60;

type Page = {
  path: string;
  priority: number;
  lastModified: Date;
};

/** Newest of the timestamps that feed a page, ignoring the missing ones. */
function latest(...dates: Array<Date | null | undefined>) {
  return dates.reduce<Date | null>((newest, date) => {
    if (!date) return newest;
    if (!newest || date > newest) return date;
    return newest;
  }, null);
}

export default async function sitemap() {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const locales = routing.locales;

  // `lastmod` should mean "this page's content changed", so each entry takes
  // the newest of the rows that actually feed it: the homepage renders the site
  // copy plus the project list, the friends page renders the site copy plus the
  // links. `SiteSettings.updatedAt` is bumped by every admin save, so a copy or
  // appearance change counts too.
  const [site, projects, links] = await Promise.all([
    ensureSiteSettings(),
    prisma.project.aggregate({ _max: { updatedAt: true } }),
    prisma.socialLink.aggregate({ _max: { updatedAt: true } }),
  ]);

  const pages: Page[] = [
    {
      path: "",
      priority: 1,
      lastModified: latest(site.updatedAt, projects._max.updatedAt) ?? site.updatedAt,
    },
    {
      path: "/friends",
      priority: 0.6,
      lastModified: latest(site.updatedAt, links._max.updatedAt) ?? site.updatedAt,
    },
  ];

  return locales.flatMap((locale) =>
    pages.map((page) => ({
      url: `${baseUrl}/${locale}${page.path}`,
      lastModified: page.lastModified,
      changeFrequency: "monthly" as const,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(locales.map((l) => [l, `${baseUrl}/${l}${page.path}`])),
      },
    })),
  );
}
