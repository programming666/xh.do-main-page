/**
 * Utility for deriving a "compacted" (low-resolution / low-byte) media URL
 * from a full-resolution source URL, and for deciding whether a URL should
 * be progressively loaded (compacted first, HD swapped in later).
 *
 * The CDN build pipeline (`xh-do-cdn` GitHub repo → Cloudflare Pages) emits a
 * `-compacted.avif` sibling for every image. For example:
 *
 *   https://cdn.xh.do/69e1a949....webp        → HD source (kept as-is)
 *   https://cdn.xh.do/69e1a949....-compacted.avif → first-paint low-byte version
 *
 * A URL that does not end in a raster image extension (svg, mp4, etc.) has no
 * compacted sibling and should be loaded directly.
 */

// Image extensions that get a `-compacted.avif` sibling from the build pipeline.
const RASTER_EXT_RE = /\.(webp|png|jpe?g|avif)$/i;

/**
 * Return the compacted URL for a media URL, or `null` when the URL has no
 * compacted twin (non-raster media, empty input, or already-compacted).
 *
 * Accepted input shapes:
 *   https://cdn.xh.do/69e1a949....webp  → https://cdn.xh.do/69e1a949....-compacted.avif
 *   /uploads/backgrounds/x.webp         → /uploads/backgrounds/x-compacted.avif
 */
export function getCompactedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // Never try to compact something already compacted, or a data: URI.
  if (url.includes("-compacted.") || url.startsWith("data:")) return null;
  if (!RASTER_EXT_RE.test(url)) return null;
  return url.replace(RASTER_EXT_RE, () => `-compacted.avif`);
}

/**
 * True when a URL is worth progressive loading: it has a compacted twin and is
 * not already the compacted form.
 */
export function hasCompacted(url: string | null | undefined): boolean {
  return getCompactedUrl(url) !== null;
}

/**
 * Resolve the "best" progression for a single media URL:
 * - `low`  → the compacted sibling to paint first
 * - `high` → the full-resolution source to swap in once loaded
 */
export function resolveProgressivePair(
  url: string | null | undefined,
): { low: string | null; high: string | null } {
  if (!url) return { low: null, high: null };
  const compacted = getCompactedUrl(url);
  if (!compacted) return { low: url, high: url };
  return { low: compacted, high: url };
}

/**
 * First-frame URL for a compacted raster twin: the CDN pipeline emits a
 * thin 1024-edge `-first.avif` (≤48 KB, ~0.6MP intrinsic) alongside the
 * compacted twin. The hero background and its preload attach to it
 * directly — a CSS background decodes the intrinsic size, so using the
 * 1920px compacted would cost the LCP element a ~2MP decode; -first keeps
 * that at ~0.6MP and needs no server-side optimizer hop.
 *
 * Returns the input unchanged when it is not a compacted raster twin (e.g.
 * an SVG poster, a video, or a data: URI).
 */
export function firstFrameUrl(compactedUrl: string): string {
  if (!compactedUrl.includes("-compacted.")) return compactedUrl;
  return compactedUrl.replace("-compacted.avif", "-first.avif");
}
