"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { CSSProperties } from "react";

import { heroCropVars, resolveHeroBackgroundRect, type HeroBackgroundRect } from "@/lib/hero-crop";

import { useTheme } from "@/components/theme-provider";

import { useProgressiveImage } from "./progressive-image";

import { firstFrameUrl } from "@/lib/media-compacted";

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
  // image is visible (e.g. "center", "left top", "right bottom"). Ignored for
  // slides that have a crop rect.
  backgroundPosition?: string;
  // Normalized crop rect {x,y,w,h} (0..1 each) — when present it overrides
  // `backgroundPosition` and zoom-crops the image to exactly that region.
  backgroundRect?: HeroBackgroundRect | null;
  // Per-image crop map (url → rect) — each slide of the light/dark stacks
  // resolves its own rect; falls back to `backgroundRect`, then to
  // `backgroundPosition`.
  backgroundRects?: Record<string, HeroBackgroundRect> | null;
  // Deploy-inlined data: URI of the dark stack's first slide (LCP image).
  // When set, that slide paints it instead of fetching the compacted URL.
  inlineDarkFirst?: string | null;
};

// Cross-fade duration when the user toggles light/dark. Slow enough to feel
// intentional, fast enough to not block reading.
const THEME_CROSSFADE_MS = 700;

// Hero root carries this so the crop layers can size themselves with
// container-query units (see the `.hero-crop-layer` rules in globals.css).
// `overflow-clip` (not `hidden`) is deliberate: a crop layer is many times the
// panel's size, and `overflow: hidden` would make this element a scroll
// container whose scrollable overflow can be shifted by keyboard/programmatic
// scrolling — which would displace the whole crop.
const HERO_CONTAINER_CLASS = "hero-cq";
// A slide layer whose URL has a crop rect carries this class plus the
// normalized --hero-crop-* variables.
const HERO_CROP_LAYER_CLASS = "hero-crop-layer";

// The layer the browser paints first is the CDN's thin 1024-edge `-first.avif`
// (see lib/media-compacted). Once `cover` stretches that layer wider than its
// own pixel width — counted in *device* pixels — it is being upscaled, and the
// full-resolution source is worth its bytes. The previous gate (hero box
// >= 1280 CSS px) required a ~1780px window, so every laptop, tablet, phone
// and non-maximised window was left on the blurry first frame forever.
const LOW_LAYER_EDGE_PX = 1024;
// Only used to estimate how wide `cover` draws the source inside the hero box
// (a short, wide panel scales a landscape photo by its height). Hero media is
// landscape photography, so 16:9 is a safe approximation.
const ASSUMED_SOURCE_ASPECT = 16 / 9;

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

// One slide layer: `style` (transform + either the normalized crop variables
// or a plain background-position) plus the class that consumes them.
interface HeroLayer {
  style: CSSProperties;
  className: string;
}

interface SlideStackProps {
  slides: string[];
  activeIndex: number;
  active: boolean;
  layerFor: (url: string) => HeroLayer;
  firstLowOverride?: string | null;
  hdEnabled?: boolean;
}

interface ProgressiveBackgroundProps {
  url: string;
  visible: boolean;
  layer: HeroLayer;
  crossfadeMs?: number;
  // When set, paint this instead of the compacted URL (deploy-inlined
  // data: URI for the first slide — eliminates the LCP image fetch).
  lowOverride?: string | null;
  // Mount the full-resolution fade-in layer. Skipped while the low layer is
  // not being upscaled (narrow / low-DPI screens), so the HD bytes stay off
  // those networks while the picture already looks right.
  enableHd?: boolean;
}

// Paints the compacted (low-byte) image immediately, then preloads the
// full-resolution source in the background and swaps to it once the browser
// has decoded it. Both layers carry the same crop, so the swap only changes
// which pixels are shown — never the geometry (no re-zoom, no CLS).
function ProgressiveBackground({
  url,
  visible,
  layer,
  crossfadeMs = 1400,
  lowOverride = null,
  enableHd = true,
}: ProgressiveBackgroundProps) {
  const { low, high, highReady } = useProgressiveImage(url, { enabled: enableHd });
  const lowUrl = lowOverride ?? low;
  const escapeUrl = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const layerClass = layer.className
    ? `absolute inset-0 bg-cover bg-center bg-no-repeat ${layer.className}`
    : "absolute inset-0 bg-cover bg-center bg-no-repeat";
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
          use the identical layer box). */}
      <div
        className={layerClass}
        style={{ ...layer.style, backgroundImage: `url("${escapeUrl(firstFrameUrl(lowUrl))}")` }}
      />
      {enableHd && high !== low && (
        <div
          className={layerClass}
          style={{
            ...layer.style,
            // Only attach the HD url once the compacted layer has painted and
            // the browser went idle — attaching it at mount made the 200KB+
            // webp compete with the LCP-critical compacted fetch.
            backgroundImage: highReady ? `url("${escapeUrl(high)}")` : undefined,
            opacity: highReady ? 1 : 0,
            transition: `opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)`,
          }}
        />
      )}
    </div>
  );
}


function SlideStack({ slides, activeIndex, active, layerFor, firstLowOverride, hdEnabled = true }: SlideStackProps) {
  const visibleIndex = slides.length ? activeIndex % slides.length : 0;
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: active ? 1 : 0,
        transition: `opacity ${THEME_CROSSFADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`
      }}
    >
      {slides.map((item, index) => (
        <ProgressiveBackground
          key={`${item}-${index}`}
          url={item}
          lowOverride={index === 0 ? firstLowOverride : null}
          visible={index === visibleIndex}
          layer={layerFor(item)}
          enableHd={hdEnabled}
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
  inlineDarkFirst = null,
}: TechBackgroundProps) {
  const { resolvedTheme } = useTheme();
  const [offset, setOffset] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  // Hero box + device pixel ratio. Used *only* to decide whether mounting the
  // full-resolution layer is worth it — the crop itself is resolved by CSS, so
  // nothing here can move the picture after the first paint.
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [pixelRatio, setPixelRatio] = useState(1);

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
      // Browser zoom changes devicePixelRatio without resizing the element.
      setPixelRatio(window.devicePixelRatio || 1);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const transformStyle = useMemo(() => {
    const translateY =
      effect === "parallax" ? offset * 0.12 : effect === "scroll-pan" ? offset * 0.06 : 0;
    return {
      transform: `translate3d(0, ${translateY}px, 0) scale(1.08)`,
    } satisfies CSSProperties;
  }, [effect, offset]);

  // Per-slide layer. A crop rect becomes four normalized CSS variables that
  // `.hero-crop-layer` (globals.css) turns into the layer's box and
  // background-position with container-query units — the same "cover the panel
  // with the rect" mapping the old px-based buildCropStyle() produced from a
  // measured container and a probed image size, but resolved by CSS at first
  // paint. That means the server-rendered frame already shows the final crop:
  // no cover → crop snap on mount, on a locale switch (which remounts this
  // component), or once a probe lands. Without a rect we keep the plain
  // cover + `backgroundPosition` pair.
  const layerFor = useCallback(
    (url: string): HeroLayer => {
      const rect = resolveHeroBackgroundRect(backgroundRects, url, backgroundRect);
      return rect
        ? {
            style: { ...transformStyle, ...heroCropVars(rect) },
            className: HERO_CROP_LAYER_CLASS,
          }
        : { style: { ...transformStyle, backgroundPosition }, className: "" };
    },
    [backgroundRects, backgroundRect, transformStyle, backgroundPosition],
  );

  // The strongest crop in play. A rect makes `cover` inside the enlarged layer
  // draw the first frame `box.w / rect.w` wide — wider than the panel itself —
  // so comparing the panel box alone would keep the gate off on windows where
  // the frame is already upscaled. 0.05 mirrors the smallest rect the admin
  // crop picker can produce; taking the min over both stacks covers whichever
  // slide is worst. Without rects this reduces to `max(box.w, box.h*16/9)`.
  const { minCropW, minCropH } = useMemo(() => {
    const rects = [backgroundRect, ...Object.values(backgroundRects ?? {})].filter(
      (rect): rect is HeroBackgroundRect => rect != null,
    );
    let minW = 1;
    let minH = 1;
    for (const rect of rects) {
      minW = Math.min(minW, Math.max(rect.w, 0.05));
      minH = Math.min(minH, Math.max(rect.h, 0.05));
    }
    return { minCropW: minW, minCropH: minH };
  }, [backgroundRect, backgroundRects]);

  // How wide the first-paint layer ends up on this screen, in device pixels.
  // The 1.08 overscan transform is left out, so this errs slightly towards
  // keeping HD off.
  const lowLayerDeviceWidth = box
    ? Math.max(box.w / minCropW, (box.h / minCropH) * ASSUMED_SOURCE_ASPECT) * pixelRatio
    : 0;
  const hdEnabled = box !== null && lowLayerDeviceWidth > LOW_LAYER_EDGE_PX;
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
      className={`absolute inset-0 overflow-clip rounded-[2rem] border border-white/10 ${HERO_CONTAINER_CLASS}`}
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
              layerFor={layerFor}
              firstLowOverride={inlineDarkFirst}
              hdEnabled={hdEnabled}
            />
            <SlideStack
              slides={lightStack}
              activeIndex={activeIndex}
              active={isLight}
              layerFor={layerFor}
              hdEnabled={hdEnabled}
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
