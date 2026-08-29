import type { CSSProperties } from "react";

/**
 * Normalized crop rectangle for the hero background. All values are 0..1
 * relative to the source image: {x, y} is the top-left corner, {w, h} is the
 * size. A rect of {x:0, y:0, w:1, h:1} means "show the whole image" (the
 * classic cover + center behavior).
 */
export type HeroBackgroundRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export const FULL_RECT: HeroBackgroundRect = { x: 0, y: 0, w: 1, h: 1 };

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

/** Tolerant parse of the JSON string stored in SiteSettings.heroBackgroundRect. */
export function parseHeroBackgroundRect(
  raw: string | null | undefined,
): HeroBackgroundRect | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof v?.x === "number" &&
      typeof v?.y === "number" &&
      typeof v?.w === "number" &&
      typeof v?.h === "number"
    ) {
      return {
        x: clamp01(v.x),
        y: clamp01(v.y),
        w: clamp01(v.w),
        h: clamp01(v.h),
      };
    }
  } catch {
    // fall through to null
  }
  return null;
}

/**
 * Per-image crop map: url → rect. Stored as JSON in SiteSettings.
 * heroBackgroundRects. `null`/empty map means "no custom per-image crop".
 */
export type HeroBackgroundRects = Record<string, HeroBackgroundRect>;

const RECT_KEYS = ["x", "y", "w", "h"] as const;

function parseRectObject(v: unknown): HeroBackgroundRect | null {
  if (typeof v !== "object" || v === null) return null;
  const record = v as Record<string, unknown>;
  if (RECT_KEYS.every((key) => typeof record[key] === "number")) {
    return {
      x: clamp01(record.x as number),
      y: clamp01(record.y as number),
      w: clamp01(record.w as number),
      h: clamp01(record.h as number),
    };
  }
  return null;
}

/** Tolerant parse of the JSON map stored in SiteSettings.heroBackgroundRects. */
export function parseHeroBackgroundRects(
  raw: string | null | undefined,
): HeroBackgroundRects | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (typeof v !== "object" || v === null) return null;
    const map: HeroBackgroundRects = {};
    for (const [url, rectValue] of Object.entries(v as Record<string, unknown>)) {
      const rect = parseRectObject(rectValue);
      if (rect) map[url] = rect;
    }
    return Object.keys(map).length ? map : null;
  } catch {
    return null;
  }
}

/** Canonical serialization of a per-image crop map (null when empty). */
export function serializeHeroBackgroundRects(
  map: HeroBackgroundRects | null | undefined,
): string | null {
  if (!map) return null;
  const entries = Object.entries(map).filter(([, rect]) => rect != null);
  if (!entries.length) return null;
  return JSON.stringify(Object.fromEntries(entries));
}

/**
 * Resolve the effective crop for one hero image: per-image rect first, then
 * the single legacy rect, then null (fall back to background-position).
 */
export function resolveHeroBackgroundRect(
  perImage: HeroBackgroundRects | null | undefined,
  url: string | undefined | null,
  legacy: HeroBackgroundRect | null | undefined,
): HeroBackgroundRect | null {
  if (url && perImage && perImage[url]) return perImage[url];
  return legacy ?? null;
}
export type ResizeDir = "se" | "ne" | "nw" | "sw";

/**
 * Resize `rect` by dragging the given corner by (dx, dy) in normalized units.
 * The opposite corner stays fixed; the dragged corner is clamped so it never
 * crosses the fixed corner (MIN_SIZE) or leaves the 0..1 canvas.
 */
export function resizeHeroBackgroundRect(
  rect: HeroBackgroundRect,
  dir: ResizeDir,
  dx: number,
  dy: number,
  minSize = 0.05,
): HeroBackgroundRect {
  const clamp = (v: number, lo: number, hi: number) =>
    Math.min(Math.max(v, lo), hi);
  let { x, y, w, h } = rect;
  if (dir === "se") {
    w = clamp(w + dx, minSize, 1 - x);
    h = clamp(h + dy, minSize, 1 - y);
  } else if (dir === "ne") {
    w = clamp(w + dx, minSize, 1 - x);
    const ny = clamp(y + dy, 0, y + h - minSize);
    y = ny;
    h = rect.y + rect.h - ny;
  } else if (dir === "nw") {
    const nx = clamp(x + dx, 0, x + w - minSize);
    const ny = clamp(y + dy, 0, y + h - minSize);
    x = nx;
    y = ny;
    w = rect.x + rect.w - nx;
    h = rect.y + rect.h - ny;
  } else {
    // sw
    const nx = clamp(x + dx, 0, x + w - minSize);
    x = nx;
    w = rect.x + rect.w - nx;
    h = clamp(h + dy, minSize, 1 - y);
  }
  return { x, y, w, h };
}


/**
 * Compute the `background-size` / `background-position` pair that shows
 * exactly the rect region of the source image inside a container of
 * cw×ch CSS pixels, without distortion and with `cover` semantics (the rect
 * always fills the container; if the rect's aspect ratio differs from the
 * container's, the longer axis clips — same trade-off as `background-size:
 * cover`). The rect's center is anchored to the container center.
 */
export function buildCropStyle(
  rect: HeroBackgroundRect,
  imgWidth: number,
  imgHeight: number,
  containerWidth: number,
  containerHeight: number,
): CSSProperties {
  const rectW = Math.max(rect.w, 0.001) * imgWidth;
  const rectH = Math.max(rect.h, 0.001) * imgHeight;
  const scale = Math.max(containerWidth / rectW, containerHeight / rectH);
  const displayWidth = imgWidth * scale;
  const displayHeight = imgHeight * scale;
  // Rect center in source-image pixels, then mapped into the container.
  const centerX = (rect.x + rect.w / 2) * imgWidth;
  const centerY = (rect.y + rect.h / 2) * imgHeight;
  return {
    backgroundSize: `${displayWidth}px ${displayHeight}px`,
    backgroundPosition: `${containerWidth / 2 - centerX * scale}px ${
      containerHeight / 2 - centerY * scale
    }px`,
  };
}
