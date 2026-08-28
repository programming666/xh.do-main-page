"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { FilePicker } from "@/components/admin/file-picker";

type BackgroundFormData = {
  showFriendLinks: boolean;
  accentColor: string;
  gradientEnabled: boolean;
  gradientStart: string;
  gradientEnd: string;
  gradientAngle: number;
  heroMediaType: "image" | "video";
  heroMediaMode: "url" | "upload";
  heroMediaUrl: string;
  heroMediaPlaylist: string;
  heroLightImageUrl: string;
  heroLightPlaylist: string;
  heroDarkImageUrl: string;
  heroDarkPlaylist: string;
  heroImageIntervalMs: number;
  heroPosterUrl: string;
  heroOverlayOpacity: number;
  heroEffect: "none" | "scroll-pan" | "parallax";
  heroBackgroundPosition: string;
};

const fieldClassName =
  "w-full rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-colors dark:bg-slate-950/35 dark:text-slate-100 dark:placeholder:text-slate-400";
const selectClassName = `${fieldClassName} appearance-none`;
const textareaClassName = `${fieldClassName} min-h-28 resize-y`;
const panelClassName =
  "glass-panel rounded-[1.75rem] border border-[color:var(--border)] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)]";

function FieldGroup({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="block text-sm font-medium text-foreground">{label}</span>
      {hint ? <span className="block text-xs leading-5 text-[color:var(--muted)]">{hint}</span> : null}
      {children}
    </label>
  );
}

// 3×3 grid of CSS background-position values — the admin picks which part of
// a cover-cropped hero image is visible. Each cell renders a tiny square dot
// at the corresponding spot inside a preview box.
const HERO_POSITIONS: string[][] = [
  ["left top", "center top", "right top"],
  ["left center", "center", "right center"],
  ["left bottom", "center bottom", "right bottom"],
];

function PositionPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const t = useTranslations("admin");
  return (
    <div className="grid w-fit grid-cols-3 gap-1.5">
      {HERO_POSITIONS.flatMap((row, rowIndex) =>
        row.map((position) => {
          const colIndex = HERO_POSITIONS[rowIndex].indexOf(position);
          const isActive = value === position;
          const dotPlacement = [
            rowIndex === 0 ? "top-1" : rowIndex === 2 ? "bottom-1" : "top-1/2 -translate-y-1/2",
            colIndex === 0 ? "left-1" : colIndex === 2 ? "right-1" : "left-1/2 -translate-x-1/2",
          ].join(" ");
          return (
            <button
              key={position}
              type="button"
              title={position}
              aria-label={`${t("heroBackgroundPositionLabel")}: ${position}`}
              onClick={() => onChange(position)}
              className={`relative h-9 w-9 rounded-lg border transition-colors ${
                isActive
                  ? "border-cyan-400 bg-cyan-400/15"
                  : "border-[color:var(--border)] bg-black/5 hover:border-cyan-300/50 dark:bg-white/5"
              }`}
            >
              <span
                className={`absolute h-1.5 w-1.5 rounded-full ${dotPlacement} ${
                  isActive ? "bg-cyan-400" : "bg-slate-400/70"
                }`}
              />
            </button>
          );
        }),
      )}
    </div>
  );
}


export function BackgroundSettingsForm({ initialData }: { initialData: BackgroundFormData }) {
  const t = useTranslations("admin");
  const [form, setForm] = useState(initialData);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(kind: "backgrounds" | "logos", file?: File | null) {
    if (!file) return null;
    const body = new FormData();
    body.append("kind", kind);
    body.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Upload failed");
    return data.url as string;
  }

  return (
    <form
      className="space-y-6"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        const response = await fetch("/api/admin/site", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(typeof data.error === "string" ? data.error : t("saveFailed"));
          return;
        }
        setMessage(t("backgroundSaved"));
      }}
    >
      <section className={panelClassName}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">{t("backgroundSettings")}</h2>
            <p className="mt-2 text-sm text-[color:var(--muted)]">{t("backgroundSettingsHint")}</p>
          </div>
          <div
            className="h-20 w-44 rounded-3xl border border-white/10"
            style={{
              background: form.gradientEnabled
                ? `linear-gradient(${form.gradientAngle}deg, ${form.gradientStart}, ${form.gradientEnd})`
                : form.accentColor,
            }}
          />
        </div>
      </section>

      <section className={panelClassName}>
        <h3 className="text-lg font-semibold">{t("generalBackground")}</h3>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{t("backgroundSettingsHint")}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-[color:var(--border)] bg-black/5 px-4 py-3 text-sm dark:bg-white/5 md:col-span-2">
            <span>
              <span className="block font-medium">{t("showFriendLinks")}</span>
              <span className="mt-1 block text-[color:var(--muted)]">{t("showFriendLinksHint")}</span>
            </span>
            <input
              type="checkbox"
              checked={form.showFriendLinks}
              onChange={(e) => setForm({ ...form, showFriendLinks: e.target.checked })}
              className="h-5 w-5 accent-cyan-400"
            />
          </label>
          <FieldGroup label={t("accentColor")} hint={t("accentColorHint")}>
            <input className={fieldClassName} value={form.accentColor} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} placeholder="#4cc9ff" />
          </FieldGroup>
          <FieldGroup label={t("gradientMode")} hint={t("gradientModeHint")}>
            <select className={selectClassName} value={String(form.gradientEnabled)} onChange={(e) => setForm({ ...form, gradientEnabled: e.target.value === "true" })}>
              <option value="false">{t("gradientDisabled")}</option>
              <option value="true">{t("gradientEnabled")}</option>
            </select>
          </FieldGroup>
          <FieldGroup label={t("gradientStart")} hint={t("gradientStartHint")}>
            <input className={fieldClassName} value={form.gradientStart} onChange={(e) => setForm({ ...form, gradientStart: e.target.value })} placeholder="#1297ff" />
          </FieldGroup>
          <FieldGroup label={t("gradientEnd")} hint={t("gradientEndHint")}>
            <input className={fieldClassName} value={form.gradientEnd} onChange={(e) => setForm({ ...form, gradientEnd: e.target.value })} placeholder="#7b61ff" />
          </FieldGroup>
          <FieldGroup label={t("gradientAngle")} hint={t("gradientAngleHint")}>
            <input className={fieldClassName} type="number" min={0} max={360} value={form.gradientAngle} onChange={(e) => setForm({ ...form, gradientAngle: Number(e.target.value) || 135 })} placeholder="135" />
          </FieldGroup>
          <FieldGroup label={t("heroMediaTypeLabel")} hint={t("heroMediaTypeHint")}>
            <select className={selectClassName} value={form.heroMediaType} onChange={(e) => setForm({ ...form, heroMediaType: e.target.value as "image" | "video" })}>
              <option value="image">{t("heroImage")}</option>
              <option value="video">{t("heroVideo")}</option>
            </select>
          </FieldGroup>
          <FieldGroup label={t("heroEffectLabel")} hint={t("heroEffectHint")}>
            <select className={selectClassName} value={form.heroEffect} onChange={(e) => setForm({ ...form, heroEffect: e.target.value as "none" | "scroll-pan" | "parallax" })}>
              <option value="none">{t("noScrollEffect")}</option>
              <option value="scroll-pan">{t("scrollPan")}</option>
              <option value="parallax">{t("parallax")}</option>
            </select>
          </FieldGroup>
          <FieldGroup label={t("heroInterval")} hint={t("heroIntervalHint")}>
            <input className={fieldClassName} type="number" min={1500} max={20000} step={100} value={form.heroImageIntervalMs} onChange={(e) => setForm({ ...form, heroImageIntervalMs: Number(e.target.value) || 4500 })} placeholder="4500" />
          </FieldGroup>
          <FieldGroup label={t("heroOverlayOpacity")} hint={t("heroOverlayOpacityHint")}>
            <input className={fieldClassName} value={String(form.heroOverlayOpacity)} onChange={(e) => setForm({ ...form, heroOverlayOpacity: Number(e.target.value) || 55 })} placeholder="55" />
          </FieldGroup>
          <FieldGroup label={t("heroBackgroundPositionLabel")} hint={t("heroBackgroundPositionHint")}>
            <PositionPicker
              value={form.heroBackgroundPosition}
              onChange={(position) => setForm({ ...form, heroBackgroundPosition: position })}
            />
          </FieldGroup>
          <FieldGroup className="md:col-span-2" label={t("heroMediaUrl")} hint={t("heroMediaUrlHint")}>
            <input className={fieldClassName} value={form.heroMediaUrl} onChange={(e) => setForm({ ...form, heroMediaUrl: e.target.value })} placeholder="https://example.com/background.webp" />
          </FieldGroup>
          <FieldGroup className="md:col-span-2" label={t("upload")} hint={t("heroUploadHint")}>
            <FilePicker accept={form.heroMediaType === "video" ? "video/*" : "image/*"} onSelect={async (file) => {
              const url = await upload("backgrounds", file);
              if (!url) return;
              if (form.heroMediaType === "video") {
                setForm((prev) => ({ ...prev, heroMediaMode: "upload", heroMediaUrl: url }));
                return;
              }
              setForm((prev) => ({
                ...prev,
                heroMediaMode: "upload",
                heroMediaUrl: prev.heroMediaUrl || url,
                heroMediaPlaylist: [prev.heroMediaPlaylist, url].filter(Boolean).join("\n"),
              }));
            }} />
          </FieldGroup>
          <FieldGroup label={t("heroPosterUrl")} hint={t("heroPosterUrlHint")}>
            <input className={fieldClassName} value={form.heroPosterUrl} onChange={(e) => setForm({ ...form, heroPosterUrl: e.target.value })} placeholder="https://example.com/poster.webp" />
          </FieldGroup>
          <FieldGroup className="md:col-span-2" label={t("heroPlaylistLabel")} hint={t("heroPlaylistHint")}>
            <textarea className={textareaClassName} value={form.heroMediaPlaylist} onChange={(e) => setForm({ ...form, heroMediaPlaylist: e.target.value })} placeholder={t("heroPlaylistPlaceholder")} />
          </FieldGroup>
          <div className="md:col-span-2 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[color:var(--muted)]">
            {t("heroPlaylistHint")}
          </div>
        </div>
      </section>
      {form.heroMediaType === "image" ? (
        <>
          <section className={panelClassName}>
            <h3 className="text-lg font-semibold">{t("darkModeBackground")}</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FieldGroup className="md:col-span-2" label={t("darkHeroImageUrl")} hint={t("darkHeroImageUrlHint")}>
                <input className={fieldClassName} value={form.heroDarkImageUrl} onChange={(e) => setForm({ ...form, heroDarkImageUrl: e.target.value })} placeholder="https://example.com/dark-background.webp" />
              </FieldGroup>
              <FieldGroup className="md:col-span-2" label={t("upload")} hint={t("darkHeroUploadHint")}>
                <FilePicker accept="image/*" onSelect={async (file) => {
                  const url = await upload("backgrounds", file);
                  if (!url) return;
                  setForm((prev) => ({
                    ...prev,
                    heroDarkImageUrl: prev.heroDarkImageUrl || url,
                    heroDarkPlaylist: [prev.heroDarkPlaylist, url].filter(Boolean).join("\n"),
                  }));
                }} />
              </FieldGroup>
              <FieldGroup className="md:col-span-2" label={t("darkHeroPlaylist")} hint={t("darkHeroPlaylistHint")}>
                <textarea className={textareaClassName} value={form.heroDarkPlaylist} onChange={(e) => setForm({ ...form, heroDarkPlaylist: e.target.value })} placeholder={t("darkHeroPlaylist")} />
              </FieldGroup>
            </div>
          </section>

          <section className={panelClassName}>
            <h3 className="text-lg font-semibold">{t("lightModeBackground")}</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FieldGroup className="md:col-span-2" label={t("lightHeroImageUrl")} hint={t("lightHeroImageUrlHint")}>
                <input className={fieldClassName} value={form.heroLightImageUrl} onChange={(e) => setForm({ ...form, heroLightImageUrl: e.target.value })} placeholder="https://example.com/light-background.webp" />
              </FieldGroup>
              <FieldGroup className="md:col-span-2" label={t("upload")} hint={t("lightHeroUploadHint")}>
                <FilePicker accept="image/*" onSelect={async (file) => {
                  const url = await upload("backgrounds", file);
                  if (!url) return;
                  setForm((prev) => ({
                    ...prev,
                    heroLightImageUrl: prev.heroLightImageUrl || url,
                    heroLightPlaylist: [prev.heroLightPlaylist, url].filter(Boolean).join("\n"),
                  }));
                }} />
              </FieldGroup>
              <FieldGroup className="md:col-span-2" label={t("lightHeroPlaylist")} hint={t("lightHeroPlaylistHint")}>
                <textarea className={textareaClassName} value={form.heroLightPlaylist} onChange={(e) => setForm({ ...form, heroLightPlaylist: e.target.value })} placeholder={t("lightHeroPlaylist")} />
              </FieldGroup>
              <div className="md:col-span-2 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[color:var(--muted)]">
                {t("themePlaylistHint")}
              </div>
            </div>
          </section>
        </>
      ) : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      <button className="rounded-2xl bg-cyan-400 px-5 py-3 font-medium text-slate-950" type="submit">{t("saveBackground")}</button>
    </form>
  );
}
