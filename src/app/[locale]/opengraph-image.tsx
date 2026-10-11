/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { hasLocale } from "next-intl";

import { ensureSiteSettings } from "@/lib/site-data";
import { routing } from "@/i18n/routing";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Pull fresh settings whenever the layout appends `?v=<updatedAt>`.
export const dynamic = "force-dynamic";

// ---- OG image caching ----
// Every share-crawler hit used to re-render Satori + re-fetch the background
// image + re-run sharp (expensive). The rendered PNG bytes are cached in
// memory keyed by `${locale}:${updatedAt}`: the layout appends `?v=updatedAt`
// to the og:image URL, so the moment settings change the URL changes and a
// fresh image is generated; unchanged URLs are served straight from cache.
// The sharp PNG conversion of the background is cached per raw URL (CDN
// assets are content-addressed & immutable, so the mapping never goes stale).
const OG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const OG_MAX_ENTRIES = 60;
const ogImageCache = new Map<
  string,
  { value: ArrayBuffer; expiresAt: number }
>();
const bgPngCache = new Map<
  string,
  { value: string; expiresAt: number }
>();

function cacheGet<T>(
  map: Map<string, { value: T; expiresAt: number }>,
  key: string,
): T | null {
  const entry = map.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.value;
  if (entry) map.delete(key);
  return null;
}

function cacheSet<T>(
  map: Map<string, { value: T; expiresAt: number }>,
  key: string,
  value: T,
  ttlMs: number,
) {
  if (map.size >= OG_MAX_ENTRIES) {
    const oldestKey = map.keys().next().value;
    if (oldestKey) map.delete(oldestKey);
  }
  map.set(key, { value, expiresAt: Date.now() + ttlMs });
}

const OG_RESPONSE_HEADERS = {
  "Content-Type": contentType,
  // Browser 1h, edge/CDN 1d, plus stale-while-revalidate so crawlers never
  // wait on a cold generation.
  "Cache-Control":
    "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
};

const CARD_FONT = "system-ui, -apple-system, Segoe UI, sans-serif";
// Default backdrop used when no custom `ogImageUrl` is configured.
const DEFAULT_BACKDROP =
  "linear-gradient(135deg, #03111f 0%, #112446 60%, #2a1463 100%)";
// Dark scrim layered over a custom background image so the light text stays
// readable regardless of what the admin uploads.
const IMAGE_SCRIM =
  "linear-gradient(180deg, rgba(3,17,31,0.78) 0%, rgba(3,13,26,0.92) 100%)";

function toAbsoluteUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return new URL(url, base).toString();
}

async function resolveBgSrc(rawUrl: string | null | undefined) {
  if (!rawUrl) return null;
  if (rawUrl.startsWith("data:")) return rawUrl;
  const cached = cacheGet(bgPngCache, rawUrl);
  if (cached) return cached;
  // Satori's own image loader can only decode PNG/JPEG. Fetch the bytes here
  // and normalize through sharp: webp/avif are converted to PNG (data URI) so
  // any URL the admin configures still renders, and EXIF rotation is applied.
  // `force-cache` lets Next's fetch cache dedupe repeated fetches; CDN assets
  // are immutable so this never goes stale.
  const res = await fetch(rawUrl, { cache: "force-cache" });
  if (!res.ok) {
    throw new Error(`og background fetch failed: ${rawUrl} -> ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const png = await sharp(buf).rotate().png().toBuffer();
  const src = `data:image/png;base64,${png.toString("base64")}`;
  cacheSet(bgPngCache, rawUrl, src, OG_CACHE_TTL_MS);
  return src;
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
  // Cache key: updatedAt changes on every settings save, so an edited card
  // regenerates once and is then served from memory + CDN until the next save.
  const cacheKey = `${locale}:${site.updatedAt.getTime()}`;
  const cached = cacheGet(ogImageCache, cacheKey);
  if (cached) {
    return new Response(cached, { headers: OG_RESPONSE_HEADERS });
  }
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
  // The site-level `ogImageUrl` becomes the card background; when absent we
  // fall back to the typographic gradient card below.
  const bgUrl = toAbsoluteUrl(site.ogImageUrl);
  const bgSrc = await resolveBgSrc(bgUrl);

  const content = (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        color: "#e6f3ff",
        fontFamily: CARD_FONT,
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
  );

  const response = new ImageResponse(
    bgSrc ? (
      <div style={{ position: "relative", display: "flex", width: "100%", height: "100%" }}>
        <img
          src={bgSrc}
          alt=""
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: IMAGE_SCRIM,
          }}
        />
        {content}
      </div>
    ) : (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          background: DEFAULT_BACKDROP,
        }}
      >
        {content}
      </div>
    ),
    {
      ...size,
    },
  );

  // Materialize the rendered PNG into a buffer so it can be cached and
  // returned as a plain Response (metadata route handlers pass it through
  // untouched).
  const bytes = await response.arrayBuffer();
  cacheSet(ogImageCache, cacheKey, bytes, OG_CACHE_TTL_MS);
  return new Response(bytes, { headers: OG_RESPONSE_HEADERS });
}