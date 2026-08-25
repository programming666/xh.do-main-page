import type { MetadataRoute } from "next";

import { ensureSiteSettings } from "@/lib/site-data";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const site = await ensureSiteSettings();
  const translation =
    site.translations.find((item) => item.locale === "zh") ??
    site.translations[0];

  return {
    name: site.siteName,
    short_name: site.siteName,
    description: translation?.subheadline ?? site.siteName,
    start_url: "/zh",
    display: "standalone",
    background_color: "#03111f",
    theme_color: "#03111f",
    lang: "zh-CN",
    icons: [
      {
        src: `${baseUrl}/icon?v=${encodeURIComponent(site.updatedAt.toISOString())}`,
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${baseUrl}/apple-icon?v=${encodeURIComponent(site.updatedAt.toISOString())}`,
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}