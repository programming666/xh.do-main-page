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
