/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";

import { ensureSiteSettings } from "@/lib/site-data";
import { routing } from "@/i18n/routing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Pull fresh settings whenever the layout appends `?v=<updatedAt>`.
export const dynamic = "force-dynamic";

function toAbsoluteUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return new URL(url, base).toString();
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Without this guard Next.js's RSC chain calls the image route with locale=undefined
  // during builds and pre-renders, which crashes `ensureSiteSettings()` reads downstream.
  if (!hasLocale(routing.locales, locale)) {
    return new ImageResponse(<div />, size);
  }
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const site = await ensureSiteSettings();
  const translation =
    site.translations.find((item) => item.locale === locale) ??
    site.translations[0];
  const title =
    translation?.ogTitle?.trim() ||
    translation?.metaTitle?.trim() ||
    translation?.headline ||
    site.siteName;
  const description =
    translation?.ogDescription?.trim() ||
    translation?.metaDescription?.trim() ||
    translation?.subheadline ||
    site.siteName;
  // The site-level `ogImageUrl` is the global override; if absent we render the
  // typographic card below.
  const override = toAbsoluteUrl(site.ogImageUrl);

  return new ImageResponse(
    override ? (
      <img src={override} alt={title} width="1200" height="630" />
    ) : (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #03111f 0%, #112446 60%, #2a1463 100%)",
          color: "#e6f3ff",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 28,
            letterSpacing: "0.12em",
            color: "#7fd7ff",
          }}
        >
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 7,
              background: "#4cc9ff",
              boxShadow: "0 0 24px rgba(76,201,255,0.6)",
            }}
          />
          {site.siteName.toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: 1000,
              whiteSpace: "pre-wrap",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 400,
              color: "#b9d8ee",
              lineHeight: 1.45,
              maxWidth: 920,
              whiteSpace: "pre-wrap",
            }}
          >
            {description}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            color: "#7fa9c8",
          }}
        >
          <span>{new URL(baseUrl).hostname}</span>
          <span>
            {locale.toUpperCase()} · {site.translations.length} locales
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=300, must-revalidate",
      },
    },
  );
}