"use client";

import { useEffect, useMemo, useState } from "react";

import type { CSSProperties } from "react";

import { useTheme } from "@/components/theme-provider";

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
  style: CSSProperties;
}

function SlideStack({ slides, activeIndex, active, style }: SlideStackProps) {
  const visibleIndex = slides.length ? activeIndex % slides.length : 0;
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: active ? 1 : 0,
        transition: `opacity ${THEME_CROSSFADE_MS}ms ease`,
      }}
    >
      {slides.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[1400ms]"
          style={{
            ...style,
            // Quote and escape the URL so admin-controlled values (which
            // already pass `safeMediaUrl` validation) cannot break out of
            // the CSS `url(...)` token, even if a value contains `"` or `\`.
            backgroundImage: `url("${item.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}")`,
            opacity: index === visibleIndex ? 1 : 0,
          }}
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
}: TechBackgroundProps) {
  const { theme } = useTheme();
  const [offset, setOffset] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

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

  const transformStyle = useMemo(() => {
    const translateY =
      effect === "parallax" ? offset * 0.12 : effect === "scroll-pan" ? offset * 0.06 : 0;
    return {
      transform: `translate3d(0, ${translateY}px, 0) scale(1.08)`,
    } satisfies CSSProperties;
  }, [effect, offset]);

  const lightOverlayBackground = useMemo(
    () => buildOverlayGradient(overlayOpacity, "light"),
    [overlayOpacity],
  );
  const darkOverlayBackground = useMemo(
    () => buildOverlayGradient(overlayOpacity, "dark"),
    [overlayOpacity],
  );

  const isLight = theme === "light";

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[2rem] border border-white/10">
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
              style={transformStyle}
            />
            <SlideStack
              slides={lightStack}
              activeIndex={activeIndex}
              active={isLight}
              style={transformStyle}
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
          transition: `opacity ${THEME_CROSSFADE_MS}ms ease`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: lightOverlayBackground,
          opacity: isLight ? 1 : 0,
          transition: `opacity ${THEME_CROSSFADE_MS}ms ease`,
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
