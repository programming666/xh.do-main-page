import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Turns the admin's Logo into something Satori (`next/og`'s ImageResponse) can
 * actually paint inside the generated favicon / apple-touch icon.
 *
 * Why this exists: ImageResponse embeds `<img src>` verbatim, and Satori only
 * rasterises PNG/JPEG/WebP/GIF — an SVG logo (or an unreachable URL) is simply
 * dropped, which shipped a blank dark tile as the site's favicon. Serving the
 * bytes as a data URI also avoids the icon route fetching its own `/uploads/*`
 * URL through Cloudflare, where a server-side request can be answered with a
 * bot 403.
 *
 * Everything is best-effort: any failure returns null so the caller falls back
 * to the site-name monogram instead of rendering an empty square.
 */
const ICON_BYTES_TTL_MS = 24 * 60 * 60 * 1000;
const ICON_BYTES_MAX_ENTRIES = 40;
const cache = new Map<string, { value: string | null; expiresAt: number }>();

/** Only local uploads are read from disk; anything else must be a real URL. */
const LOCAL_PREFIX = "/uploads/";

function isLocalUpload(url: string) {
  return url.startsWith(LOCAL_PREFIX);
}

async function readLocalFile(url: string): Promise<Buffer | null> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const relative = decodeURIComponent(url.split("?")[0].split("#")[0]).slice(LOCAL_PREFIX.length);
  const resolved = path.resolve(uploadsDir, relative);
  // Never leave the uploads directory, whatever the stored URL claims.
  if (!resolved.startsWith(`${uploadsDir}${path.sep}`)) return null;
  return readFile(resolved);
}

async function readRemote(url: string): Promise<Buffer | null> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    headers: { "User-Agent": "xh.do-icon/1.0 (+https://xh.do)" },
  });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

/**
 * @param logoUrl stored `SiteSettings.logoUrl` (root-relative or http(s))
 * @param pixels  raster size to produce (2× the rendered size keeps it crisp)
 */
export async function resolveIconLogo(logoUrl: string | null | undefined, pixels: number) {
  const url = logoUrl?.trim();
  if (!url) return null;
  if (!isLocalUpload(url) && !/^https?:\/\//i.test(url)) return null;

  const cacheKey = `${pixels}:${url}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let dataUri: string | null = null;
  try {
    const bytes = isLocalUpload(url) ? await readLocalFile(url) : await readRemote(url);
    if (bytes?.length) {
      // `density` gives SVG sources enough resolution; `contain` keeps non-square
      // logos inside the square instead of cropping the face off a portrait.
      const png = await sharp(bytes, { density: 288, failOn: "none" })
        .resize({
          width: pixels,
          height: pixels,
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
      dataUri = `data:image/png;base64,${png.toString("base64")}`;
    }
  } catch {
    dataUri = null;
  }

  if (cache.size >= ICON_BYTES_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(cacheKey, { value: dataUri, expiresAt: Date.now() + ICON_BYTES_TTL_MS });
  return dataUri;
}

/** Two-character monogram used when there is no usable logo. */
export function iconInitials(siteName: string) {
  return siteName.trim().slice(0, 2).toUpperCase();
}
