"use client";

import { useRef, useState } from "react";

import type { PointerEvent as ReactPointerEvent } from "react";

import { useTranslations } from "next-intl";

import { FULL_RECT, type HeroBackgroundRect } from "@/lib/hero-crop";

type DragState = {
  mode: "move" | "resize";
  startX: number;
  startY: number;
  startRect: HeroBackgroundRect;
};

const MIN_SIZE = 0.05;

/**
 * Interactive crop-rect picker. Shows the source image and a draggable /
 * resizable rectangle; the admin picks exactly which region of the hero
 * background should be visible. `value` is normalized (0..1 each, relative
 * to the source image); `null` means "whole image centered".
 */
export function CropRectPicker({
  value,
  imageUrl,
  onChange,
}: {
  value: HeroBackgroundRect | null;
  imageUrl: string | null;
  onChange: (rect: HeroBackgroundRect | null) => void;
}) {
  const t = useTranslations("admin");
  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  // Preview state: null → the full-image dashed box (drag its handle to
  // create a custom crop). Custom rect → solid box.
  const rect = value ?? FULL_RECT;
  const isCustom = value !== null;

  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max);

  const toRelative = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const bounds = el.getBoundingClientRect();
    return {
      x: (clientX - bounds.left) / bounds.width,
      y: (clientY - bounds.top) / bounds.height,
    };
  };

  const onPointerDown = (
    event: ReactPointerEvent,
    mode: "move" | "resize",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    // Best-effort capture; synthetic events (tests) have no active pointer
    // and throw — the drag still works via bubbling in that case.
    try {
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    } catch {
      // ignore — pointer capture is an enhancement
    }
    const point = toRelative(event.clientX, event.clientY);
    setDrag({
      mode,
      startX: point.x,
      startY: point.y,
      startRect: { ...rect },
    });
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    if (!drag) return;
    const point = toRelative(event.clientX, event.clientY);
    const { mode, startX, startY, startRect } = drag;
    if (mode === "move") {
      onChange({
        x: clamp(startRect.x + (point.x - startX), 0, 1 - startRect.w),
        y: clamp(startRect.y + (point.y - startY), 0, 1 - startRect.h),
        w: startRect.w,
        h: startRect.h,
      });
    } else {
      onChange({
        x: startRect.x,
        y: startRect.y,
        w: clamp(startRect.w + (point.x - startX), MIN_SIZE, 1 - startRect.x),
        h: clamp(startRect.h + (point.y - startY), MIN_SIZE, 1 - startRect.y),
      });
    }
  };

  const endDrag = () => setDrag(null);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        // Container is exactly the size of the rendered image (img is
        // w-full h-auto, no fixed height / no scrolling) so the normalized
        // rect maps 1:1 onto percentage coordinates.
        className="relative w-full select-none overflow-hidden rounded-xl border border-[color:var(--border)] bg-slate-950/40"
        style={{ touchAction: "none" }}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {imageUrl ? (
          // w-full h-auto keeps the container exactly the size of the
          // rendered image (no letterbox), so the normalized rect maps 1:1
          // onto percentage coordinates.
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="pointer-events-none block h-auto w-full"
          />
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-[color:var(--muted)]">
            {t("heroBackgroundRectNoImage")}
          </div>
        )}
        <div
          className={`absolute cursor-move border-2 ${
            isCustom
              ? "border-cyan-400/90 bg-cyan-400/10"
              : "border-dashed border-cyan-300/70 bg-cyan-300/5"
          }`}
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.w * 100}%`,
            height: `${rect.h * 100}%`,
          }}
          onPointerDown={(event) => onPointerDown(event, "move")}
        >
          <span className="pointer-events-none absolute left-1 top-1 text-[10px] font-semibold uppercase tracking-wider text-cyan-100/80">
            {isCustom ? t("heroBackgroundRectCrop") : t("heroBackgroundRectFull")}
          </span>
          {/* Resize handle (bottom-right corner) */}
          <div
            className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-nwse-resize rounded-[4px] border border-cyan-200 bg-cyan-400 shadow-[0_1px_4px_rgba(0,0,0,0.4)]"
            onPointerDown={(event) => onPointerDown(event, "resize")}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
        <span>{t("heroBackgroundRectHint")}</span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="shrink-0 rounded-lg border border-[color:var(--border)] px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-cyan-300/60 hover:text-cyan-300"
        >
          {t("heroBackgroundRectReset")}
        </button>
      </div>
    </div>
  );
}
