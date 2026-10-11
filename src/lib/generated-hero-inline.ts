/**
 * GENERATED at deploy time by `scripts/gen_hero_inline.py`.
 *
 * Holds the hero's first-slide compacted AVIF as a base64 `data:` URI so the
 * LCP-critical image never hits the network on production builds: it ships
 * inside the HTML itself and paints with first paint. The HD source still
 * fades in afterwards via the progressive hook.
 *
 * The committed value is `null` — the fallback path (URL + `<link rel=preload>`)
 * keeps dev/build-verification working. The deploy pipeline overwrites this
 * file with the real payload before `npm run build`. Do not edit by hand.
 */
export const HERO_INLINE_AVIF: string | null = null;