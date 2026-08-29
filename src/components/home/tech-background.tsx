"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CSSProperties } from "react";

import { buildCropStyle, type HeroBackgroundRect } from "@/lib/hero-crop";

import { useTheme } from "@/components/theme-provider";

import { useProgressiveImage } from "./progressive-image";
type TechBackgroundProps = {
  mediaType: "image" | "video";
  mediaUrl?: string | null;
  mediaItems?: string[];
  lightMediaItems?: string[];
  darkMediaItems?: string[];
  posterUrl?: string | null;
  effect: "none" | "scroll-pan" | "parallax";
  overlayOpacity: number;
  intervalMs?: number;
  accentColor?: string | null;
  gradientEnabled?: boolean;
  gradientStart?: string | null;
  gradientEnd?: string | null;
  gradientAngle?: number;
  // CSS background-position controlling which part of a cover-cropped hero
  // image is visible (e.g. "center", "left top", "right bottom").
  backgroundPosition?: string;
  // Normalized crop rect {x,y,w,h} (0..1 each) — when present it overrides
  // `backgroundPosition` and zoom-crops the image to exactly that region.
  backgroundRect?: HeroBackgroundRect | null;
  // Per-image crop map (url → rect) — each slide of the light/dark stacks
  // resolves its own rect; falls back to `backgroundRect`, then to
  // `backgroundPosition`.
  backgroundRects?: Record<string, HeroBackgroundRect> | null;
};

// Cross-fade duration when the user toggles light/dark. Slow enough to feel
// intentional, fast enough to not block reading.
const THEME_CROSSFADE_MS = 700;

function clamp01(value: number) {
  return Math.max(0, Math.min(0.95, value));
}

/**
 * Build the dark gradient overlay that sits between the photo and the hero
 * copy. Dark mode keeps the original strong wash so the page reads as a deep
 * cinematic surface. Light mode uses a much weaker overlay so the photo's
 * true colors come through — visually the image looks lighter / brighter
 * without any image processing.
 */
function buildOverlayGradient(overlayOpacity: number, mode: "light" | "dark") {
  if (mode === "light") {
    // ~35% of the dark-mode strength: enough darkness at the bottom to keep
    // white hero text legible, but the top half of the photo is mostly clear.
    const top = clamp01(overlayOpacity / 420);
    const bottom = clamp01(overlayOpacity / 220);
    return `linear-gradient(180deg, rgba(2,6,23,${top}), rgba(2,6,23,${bottom}))`;
  }
  const top = clamp01(overlayOpacity / 150);
  const bottom = clamp01(overlayOpacity / 100);
  return `linear-gradient(180deg, rgba(2,6,23,${top}), rgba(2,6,23,${bottom}))`;
}

function pickStack(
  themedItems: string[],
  fallback: string[],
  fallbackUrl: string | null | undefined,
) {
  if (themedItems.length) return themedItems;
  if (fallback.length) return fallback;
  return fallbackUrl ? [fallbackUrl] : [];
}

interface SlideStackProps {
  slides: string[];
  activeIndex: number;
  active: boolean;
  styleFor: (url: string) => CSSProperties;
}


interface ProgressiveBackgroundProps {
  url: string;
  visible: boolean;
  style: CSSProperties;
  crossfadeMs?: number;
}

// Paints the compacted (low-byte) image immediately, then preloads the
// full-resolution source in the background and swaps to it once the browser
// has decoded it. The element is an absolutely-positioned inset-0 div that
// already occupies its box, so changing backgroundImage never affects layout
// → no CLS. The visible/opacity state drives the slide crossfade, and the
// incoming style carries the scroll/parallax transform.
function ProgressiveBackground({
  url,
  visible,
  style,
  crossfadeMs = 1400,
}: ProgressiveBackgroundProps) {
  const { low, high, highReady } = useProgressiveImage(url);
  const escapeUrl = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${crossfadeMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    >
      {/* Compacted / low-byte image paints immediately, then the full source
          fades in over it once the browser has decoded it (no CLS — both layers
          are absolutely inset-0 so the swap never affects layout). */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ ...style, backgroundImage: `url("${escapeUrl(low)}")` }}
      />
      {high !== low && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            ...style,
            backgroundImage: `url("${escapeUrl(high)}")`,
            opacity: highReady ? 1 : 0,
            transition: `opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        />
      )}
    </div>
  );
}


function SlideStack({ slides, activeIndex, active, styleFor }: SlideStackProps) {
  const visibleIndex = slides.length ? activeIndex % slides.length : 0;
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: active ? 1 : 0,
        transition: `opacity ${THEME_CROSSFADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
    >
      {slides.map((item, index) => (
        <ProgressiveBackground
          key={`${item}-${index}`}
          url={item}
          visible={index === visibleIndex}
          style={styleFor(item)}
        />
      ))}
    </div>
  );
}

export function TechBackground({
  mediaType,
  mediaUrl,
  mediaItems = [],
  lightMediaItems = [],
  darkMediaItems = [],
  posterUrl,
  effect,
  overlayOpacity,
  intervalMs = 4500,
  accentColor,
  gradientEnabled = false,
  gradientStart,
  gradientEnd,
  gradientAngle = 135,
  backgroundPosition = "center",
  backgroundRect = null,
  backgroundRects = null,
}: TechBackgroundProps) {
  const { resolvedTheme } = useTheme();
  const [offset, setOffset] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  // Container box measured at runtime — required to translate the normalized
  // crop rect into pixel background-size/position (the container is fluid, so
  // this can't be precomputed at SSR time).
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  // Source image dimensions, loaded from the first media item (the compacted
  // avif and the HD source share the same intrinsic size).
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(
    null,
  );

  // Pre-compute both theme stacks so the inactive one stays mounted under the
  // active one. Toggling theme then becomes a simple opacity crossfade rather
  // than a hard image swap.
  const lightStack = useMemo(
    () => pickStack(lightMediaItems, mediaItems, mediaUrl),
    [lightMediaItems, mediaItems, mediaUrl],
  );
  const darkStack = useMemo(
    () => pickStack(darkMediaItems, mediaItems, mediaUrl),
    [darkMediaItems, mediaItems, mediaUrl],
  );

  const longestLength = Math.max(lightStack.length, darkStack.length, 1);
  const hasMedia =
    mediaType === "video" ? !!mediaUrl : lightStack.length > 0 || darkStack.length > 0;

  // Measure the hero box once mounted and keep it in sync on resize.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setBox({ w: rect.width, h: rect.height });
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Load the first media item's intrinsic size (compacted + HD share it).
  const sizeProbeUrl = darkStack[0] ?? lightStack[0] ?? mediaUrl ?? null;
  useEffect(() => {
    if (!sizeProbeUrl) return;
    const img = new Image();
    img.onload = () =>
      setImageSize({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
    img.src = sizeProbeUrl;
    return () => {
      img.onload = null;
    };
  }, [sizeProbeUrl]);

  const transformStyle = useMemo(() => {
    const translateY =
      effect === "parallax" ? offset * 0.12 : effect === "scroll-pan" ? offset * 0.06 : 0;
    return {
      transform: `translate3d(0, ${translateY}px, 0) scale(1.08)`,
    } satisfies CSSProperties;
  }, [effect, offset]);

  // Translate the normalized crop rect into pixel background-size/position
  // once both the image size and the container box are known.
  // Per-slide style: resolve the crop for the slide's own URL (per-image map
  // first, legacy single rect second), then translate it into pixel
  // background-size/position once the image size and container box are known.
  const styleFor = useCallback(
    (url: string): CSSProperties => {
      const rect = backgroundRects?.[url] ?? backgroundRect ?? null;
      const crop =
        rect && imageSize && box && imageSize.w > 0 && imageSize.h > 0
          ? buildCropStyle(rect, imageSize.w, imageSize.h, box.w, box.h)
          : null;
      return {
        ...transformStyle,
        ...(crop ?? { backgroundPosition }),
      };
    },
    [backgroundRects, backgroundRect, imageSize, box, transformStyle, backgroundPosition],
  );
  useEffect(() => {
    if (effect === "none") {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      return;
    }

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setOffset(window.scrollY);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [effect]);

  useEffect(() => {
    if (mediaType !== "image" || longestLength <= 1) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % longestLength);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [intervalMs, mediaType, longestLength]);


  const lightOverlayBackground = useMemo(
    () => buildOverlayGradient(overlayOpacity, "light"),
    [overlayOpacity],
  );
  const darkOverlayBackground = useMemo(
    () => buildOverlayGradient(overlayOpacity, "dark"),
    [overlayOpacity],
  );

  const isLight = resolvedTheme === "light";


  return (
    <div
      ref={boxRef}
      className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/10"
    >
      <div
        className="absolute inset-0 transition-[background] duration-[700ms] ease-out"
        style={{
          background:
            gradientEnabled && gradientStart && gradientEnd
              ? `linear-gradient(${gradientAngle}deg, ${gradientStart}, ${gradientEnd})`
              : (accentColor ?? "linear-gradient(135deg, #1297ff, #7b61ff)"),
        }}
      />
      <div className="absolute inset-0 bg-grid opacity-60" />
      {hasMedia ? (
        mediaType === "video" ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={mediaUrl ?? undefined}
            poster={posterUrl ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            style={transformStyle}
          />
        ) : (
          <>
            <SlideStack
              slides={darkStack}
              activeIndex={activeIndex}
              active={!isLight}
              styleFor={styleFor}
            />
            <SlideStack
              slides={lightStack}
              activeIndex={activeIndex}
              active={isLight}
              styleFor={styleFor}
            />
          </>
        )
      ) : null}

      {/* Two overlay layers crossfade with theme. The light-mode layer carries
          a stronger dark gradient so white hero text stays legible against
          bright photos. */}
      <div
        className="absolute inset-0"
        style={{
          background: darkOverlayBackground,
          opacity: isLight ? 0 : 1,
          transition: `opacity ${THEME_CROSSFADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: lightOverlayBackground,
          opacity: isLight ? 1 : 0,
          transition: `opacity ${THEME_CROSSFADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at top right, ${accentColor ?? "#4cc9ff"}44, transparent 24%), radial-gradient(circle at bottom left, rgba(123,97,255,0.22), transparent 28%)`,
        }}
      />
    </div>
  );
}
