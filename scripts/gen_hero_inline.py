"""Generate src/lib/generated-hero-inline.ts with the hero's first-slide
compacted AVIF inlined as a base64 data: URI.

This eliminates the LCP-critical image download entirely on production builds:
the image ships inside the HTML and paints with first paint, instead of waiting
on a CDN fetch + round-trip. The HD source still fades in afterwards via the
progressive hook.

Reads the current hero media from the running site's /api/public/home so the
inlined slide always matches what the admin has configured. Any failure
(resolve down / slow CDN / bad payload) is tolerated and falls back to the
`null` stub, which keeps the normal URL + <link rel=preload> path.

Run it on the production server BEFORE `npm run build` (the deploy script does
this automatically).

Usage:
    python3 scripts/gen_hero_inline.py [base_url]
        base_url defaults to http://127.0.0.1:3001/api/public/home
"""
import base64
import os
import re
import sys
import urllib.request

RASTER_EXT_RE = re.compile(r"\.(webp|png|jpe?g|avif)$", re.IGNORECASE)
OUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "src",
    "lib",
    "generated-hero-inline.ts",
)
MAX_INLINE_BYTES = 200_000  # keep the HTML bump sane (data: base64 ~1.37x)

STUB = '''/**
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
'''


def compacted_url(url: str) -> str | None:
    """webp/png/... -> -compacted.avif sibling (mirrors lib/media-compacted)."""
    if not url or "-compacted." in url or url.startswith("data:"):
        return None
    if not RASTER_EXT_RE.search(url):
        return None
    return RASTER_EXT_RE.sub("-compacted.avif", url)


def main() -> int:
    base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3001/api/public/home"
    try:
        with urllib.request.urlopen(base, timeout=10) as resp:
            data = json_load(resp.read())
        items = (
            data.get("heroDarkItems")
            or data.get("heroMediaItems")
            or data.get("heroMediaUrl")
            or []
        )
        first = items[0] if isinstance(items, list) and items else items
        if not first:
            raise RuntimeError("no hero media configured")
        url = compacted_url(first)
        if not url:
            raise RuntimeError(f"first hero item has no compacted twin: {first!r}")
        with urllib.request.urlopen(url, timeout=20) as resp:
            raw = resp.read()
        if not raw or len(raw) > MAX_INLINE_BYTES:
            raise RuntimeError(f"compacted payload too large ({len(raw)} bytes)")
        if raw[:12].lower() != b"ftypavif" and b"ftypavif" not in raw[:64]:
            # AVIF begins with ISO BMFF ftyp box; be lenient but sanity-check
            # we're not inlining a huge HTML error page.
            if len(raw) < 1000:
                raise RuntimeError("suspiciously small payload")
        b64 = base64.b64encode(raw).decode("ascii")
        data_uri = f"data:image/avif;base64,{b64}"
        with open(OUT_PATH, "w", encoding="utf-8") as fh:
            fh.write(STUB.replace(
                "export const HERO_INLINE_AVIF: string | null = null;",
                f"export const HERO_INLINE_AVIF: string | null = \"{data_uri}\";",
            ))
        print(f"[gen_hero_inline] inlined {len(raw)} bytes from {url} "
              f"({len(data_uri) / 1024:.0f} KiB base64)")
        return 0
    except Exception as exc:  # noqa: BLE001 - tolerant by design
        try:
            with open(OUT_PATH, "w", encoding="utf-8") as fh:
                fh.write(STUB)
        except OSError:
            pass
        print(f"[gen_hero_inline] FAILED ({exc!r}) — wrote null stub; "
              "falling back to URL + preload path", file=sys.stderr)
        return 1


def json_load(raw: bytes):
    import json
    return json.loads(raw)


if __name__ == "__main__":
    raise SystemExit(main())
