"use client";

import { useEffect, useState } from "react";
import { derivePalette, type AdaptivePalette } from "@/lib/adaptive-palette";
import { firstFrameUrl, getCompactedUrl } from "@/lib/media-compacted";
import type { HeroBackgroundRect } from "@/lib/hero-crop";

const cache = new Map<string, AdaptivePalette | null>();

/** Browser-only sampling: cross-origin failures never trigger a server fetch. */
export function useImagePalette(url: string | null, crop: HeroBackgroundRect | null) {
  const key = url ? `${url}|${JSON.stringify(crop)}` : "";
  const [result, setResult] = useState<{ key: string; palette: AdaptivePalette | null } | null>(null);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    let image: HTMLImageElement | null = null;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (palette: AdaptivePalette | null) => {
      if (cancelled) return;
      clearTimeout(timer);
      if (cache.size >= 32) cache.delete(cache.keys().next().value!);
      cache.set(key, palette);
      setResult({ key, palette });
    };
    if (cache.has(key)) {
      queueMicrotask(() => { if (!cancelled) setResult({ key, palette: cache.get(key)! }); });
      return () => { cancelled = true; };
    }
    const compact = getCompactedUrl(url);
    const candidates = compact ? [firstFrameUrl(compact), url] : [url];
    const load = (index: number) => {
      if (cancelled) return;
      if (index >= candidates.length) { finish(null); return; }
      image = new Image();
      image.crossOrigin = "anonymous";
      image.decoding = "async";
      const current = image;
      const next = () => {
        clearTimeout(timer);
        current.onload = current.onerror = null;
        current.src = "";
        load(index + 1);
      };
      image.onload = () => {
        clearTimeout(timer);
        if (cancelled) return;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = canvas.height = 32;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) { finish(null); return; }
          const region = crop ?? { x: 0, y: 0, w: 1, h: 1 };
          context.drawImage(current, region.x * current.naturalWidth, region.y * current.naturalHeight,
            region.w * current.naturalWidth, region.h * current.naturalHeight, 0, 0, 32, 32);
          finish(derivePalette(context.getImageData(0, 0, 32, 32).data));
        } catch {
          // Tainted canvas, unsupported images and unavailable resources use manual colors.
          finish(null);
        }
      };
      image.onerror = next;
      timer = setTimeout(next, 5000);
      image.src = candidates[index];
    };
    load(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (image) { image.onload = image.onerror = null; image.src = ""; }
    };
  }, [url, key, crop]);
  // Keep the previous slide's palette while the next sample loads. A completed
  // failure is null, distinct from undefined (still loading).
  return !url ? null : result?.key === key ? result.palette : undefined;
}
