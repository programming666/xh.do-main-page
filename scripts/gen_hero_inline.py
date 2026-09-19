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

Run it on the production server BEFORE `npm run build`.

Usage:
    python3 scripts/gen_hero_inline.py [base_url]
        base_url defaults to http://127.0.0.1:3001/api/public/home

Environment:
    HERO_INLINE_OUT   override the generated file path (used by tests)
"""
import base64
import os
import re
import sys
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36"

RASTER_EXT_RE = re.compile(r"\.(webp|png|jpe?g|avif)$", re.IGNORECASE)
OUT_PATH = os.environ.get("HERO_INLINE_OUT") or os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "src",
    "lib",
    "generated-hero-inline.ts",
)
MAX_INLINE_BYTES = 200_000  # keep the HTML bump sane (data: base64 ~1.37x)

# ISO-BMFF compatible brands an AVIF payload may carry right after `ftyp`.
AVIF_BRANDS = (b"avif", b"avis", b"mif1", b"msf1", b"heic", b"heix")

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


def absolute_url(url: str, base: str) -> str:
    """Resolve a site-relative media path (e.g. `/uploads/x.webp`) against the
    origin of `base`. Hero media uploaded through the admin UI is stored as a
    relative `/uploads/...` path, which urllib cannot fetch on its own."""
    if url.startswith(("http://", "https://")):
        return url
    if url.startswith("/"):
        parts = urllib.parse.urlsplit(base)
        if not parts.scheme or not parts.netloc:
            return url
        return urllib.parse.urlunsplit((parts.scheme, parts.netloc, url, "", ""))
    return url


def looks_like_avif(raw: bytes) -> bool:
    """True only for a real ISO-BMFF/AVIF payload.

    The previous check compared `raw[:12]` against `b"ftypavif"`, which can
    never match: bytes 0-3 hold the box size, `ftyp` sits at 4-7 and the brand
    at 8-11. Anything that failed that test and happened to be >= 1000 bytes —
    a 404 HTML page, a proxy error page, a JSON error body — was inlined as
    `data:image/avif` and shipped as a broken LCP image.
    """
    if len(raw) < 16 or raw[4:8] != b"ftyp":
        return False
    return raw[8:12] in AVIF_BRANDS


def fetch(url: str, timeout: int) -> tuple[bytes, str]:
    with urllib.request.urlopen(
        urllib.request.Request(url, headers={"User-Agent": UA}), timeout=timeout
    ) as resp:
        return resp.read(), resp.headers.get_content_type()


def main() -> int:
    base = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3001/api/public/home"
    try:
        body, _ = fetch(base, 10)
        data = json_load(body)
        # /api/public/home returns { site, projects, friendLinks, contactLinks }
        # — hero media lives under data["site"].
        site = data.get("site") or data
        items = (
            site.get("heroDarkItems")
            or site.get("heroMediaItems")
            or site.get("heroMediaUrl")
            or []
        )
        first = items[0] if isinstance(items, list) and items else items
        if not first:
            raise RuntimeError("no hero media configured")
        relative = compacted_url(first)
        if not relative:
            raise RuntimeError(f"first hero item has no compacted twin: {first!r}")
        url = absolute_url(relative, base)
        raw, content_type = fetch(url, 20)
        if not raw:
            raise RuntimeError(f"empty payload from {url}")
        if len(raw) > MAX_INLINE_BYTES:
            raise RuntimeError(f"compacted payload too large ({len(raw)} bytes) from {url}")
        if "html" in content_type:
            raise RuntimeError(f"expected an image, got {content_type} from {url}")
        if not looks_like_avif(raw):
            raise RuntimeError(
                f"payload from {url} is not an AVIF (first bytes: {raw[:16]!r})"
            )
        b64 = base64.b64encode(raw).decode("ascii")
        data_uri = f"data:image/avif;base64,{b64}"
        with open(OUT_PATH, "w", encoding="utf-8") as fh:
            fh.write(STUB.replace(
                "export const HERO_INLINE_AVIF: string | null = null;",
                f"export const HERO_INLINE_AVIF: string | null = \"{data_uri}\";",
            ))
        print(f"[gen_hero_inline] inlined {len(raw)} bytes from {url} "
              f"({len(data_uri) / 1024:.0f} KiB base64) -> {OUT_PATH}")
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
