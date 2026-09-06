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
 * Next.js image-optimizer URL for a compacted first-paint asset, downscaled
 * so the browser decodes ≈0.6MP (1080w) instead of the full payload the CDN
 * emits (1920×1080 at the moment) — a CSS background always decodes the
 * intrinsic size, which is the main CPU tail of the LCP element on
 * low-end phones. Deterministic (same src+w+q ⇒ same cached optimizer
 * output), so the SSR preload link and the rendered background attach to
 * the identical resource.
 *
 * Returns the input unchanged when it is not a compacted raster twin (e.g.
 * an SVG poster or a data: URI).
 */
const LQIP_OPTIMIZED_W = 1080;
const LQIP_OPTIMIZED_Q = 65;

export function lqipOptimizedUrl(compactedUrl: string): string {
  if (!compactedUrl.includes("-compacted.")) return compactedUrl;
  return `/_next/image?url=${encodeURIComponent(compactedUrl)}&w=${LQIP_OPTIMIZED_W}&q=${LQIP_OPTIMIZED_Q}`;
}
