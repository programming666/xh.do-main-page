import { useEffect, useState } from "react";
import type { RefObject } from "react";

import { resolveProgressivePair } from "@/lib/media-compacted";

type DeferMode = "idle" | "visible";

type UseProgressiveImageOptions = {
  /**
   * When to begin fetching the full-resolution source:
   * - `"idle"` (default): after the browser goes idle / a short cooldown,
   *   i.e. once the compacted layer has painted and LCP has settled. Used by
   *   the hero, which is the LCP element itself.
   * - `"visible"`: only when the owning element approaches the viewport
   *   (IntersectionObserver + 200px margin). Used by project covers so the
   *   multi-MB HD scans don't compete with the critical path before the
   *   user scrolls to them.
   */
  defer?: DeferMode;
  /**
   * Element to observe when `defer: "visible"`. The caller owns the ref so it
   * can point at any wrapper that reflects the media's on-screen position.
   */
  el?: RefObject<HTMLElement | null>;
};

// requestIdleCallback is not in every TS lib baseline; window typing in
// browsers provides it, keep the lookup defensive so lint stays clean.
function scheduleIdle(cb: () => void): () => void {
  const w = window as unknown as {
    requestIdleCallback?: (c: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(cb, { timeout: 2000 });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, 1200);
  return () => window.clearTimeout(id);
}

/**
 * Track the progressive swap: start on the compacted twin, then advance to
 * the full-resolution source once it has been decoded by the browser. The
 * element is reused, so the swap is a pure opacity release with zero CLS.
 *
 * The HD fetch is deferred off the critical path (`idle` by default, or
 * `visible` for below-fold media) so the first window only carries the
 * small compacted layer plus the LCP-critical resources.
 */
export function useProgressiveImage(
  url: string,
  options?: UseProgressiveImageOptions,
): {
  low: string;
  high: string;
  highReady: boolean;
} {
  const defer = options?.defer ?? "idle";
  const el = options?.el;

  const [state, setState] = useState(() => {
    const { low, high } = resolveProgressivePair(url);
    const lowUrl = low ?? url;
    return { low: lowUrl, high: high ?? lowUrl, highReady: false };
  });

  useEffect(() => {
    const { low, high } = resolveProgressivePair(url);
    const lowUrl = low ?? url;
    const highUrl = high ?? lowUrl;
    if (!high || high === low) {
      return;
    }

    let cancelled = false;
    let stopEarly: (() => void) | undefined;

    const startLoad = () => {
      if (cancelled) return;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (cancelled) return;
        setState({ low: lowUrl, high: highUrl, highReady: true });
      };
      img.src = highUrl;
    };

    if (defer === "visible" && el?.current && typeof IntersectionObserver !== "undefined") {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            stopEarly?.();
            startLoad();
          }
        },
        { rootMargin: "200px" },
      );
      io.observe(el.current);
      stopEarly = () => io.disconnect();
    } else {
      stopEarly = scheduleIdle(startLoad);
    }

    return () => {
      cancelled = true;
      stopEarly?.();
    };
  }, [url, defer, el]);

  return state;
}

export type { UseProgressiveImageOptions };