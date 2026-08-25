import { routing } from "@/i18n/routing";

// The public surface is intentionally small: root page + friends.
// Admin pages are deliberately excluded so they don't leak via sitemap.
export default async function sitemap() {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const staticPaths = ["", "/friends"];
  const locales = routing.locales;

  const entries = [];
  for (const locale of locales) {
    for (const path of staticPaths) {
      entries.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: path === "" ? 1.0 : 0.6,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${baseUrl}/${l}${path}`]),
          ),
        },
      });
    }
  }

  return entries;
}