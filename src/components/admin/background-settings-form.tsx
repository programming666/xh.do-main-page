"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Info, Save } from "lucide-react";

import { FilePicker } from "@/components/admin/file-picker";
import { CropRectPicker } from "@/components/admin/crop-rect-picker";
import {
  parseHeroBackgroundRects,
  serializeHeroBackgroundRects,
  type HeroBackgroundRects,
} from "@/lib/hero-crop";

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
  heroBackgroundRect: string | null;
  heroBackgroundRects: string | null;
};

type FieldGroupProps = {
  label: string;
  hint?: string;
  span?: boolean;
  children: React.ReactNode;
};

/**
 * Field wrapper for the hero-media form. Uses the console's .admin-field
 * vocabulary (real <label>, hint under the label, control last) so this page
 * matches site settings / projects / links.
 */
function FieldGroup({ label, hint, span, children }: FieldGroupProps) {
  return (
    <label className={`admin-field${span ? " admin-span-2" : ""}`}>
      <span className="admin-label">{label}</span>
      {hint ? <span className="admin-hint">{hint}</span> : null}
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

function PositionPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useTranslations("admin");
  return (
    <div className="admin-position-grid">
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
              aria-pressed={isActive}
              aria-label={`${t("heroBackgroundPositionLabel")}: ${position}`}
              onClick={() => onChange(position)}
              className="admin-position-cell"
            >
              <span className={`admin-position-dot ${dotPlacement}`} />
            </button>
          );
        }),
      )}
    </div>
  );
}

// One crop picker per hero image. Editing the rect writes into the shared
// per-image map (keyed by URL); resetting deletes the entry so the image
// falls back to the 9-grid position / cover behavior.
function CropPickerForUrl({
  url,
  rects,
  onRectsChange,
  label,
}: {
  url: string;
  rects: HeroBackgroundRects;
  onRectsChange: (next: HeroBackgroundRects) => void;
  label: string;
}) {
  const t = useTranslations("admin");
  const rect = rects[url] ?? null;
  return (
    <FieldGroup span label={label} hint={t("heroBackgroundRectPerImageHint")}>
      <CropRectPicker
        value={rect}
        imageUrl={url}
        onChange={(nextRect) => {
          const next = { ...rects };
          if (nextRect) next[url] = nextRect;
          else delete next[url];
          onRectsChange(next);
        }}
      />
    </FieldGroup>
  );
}

export function BackgroundSettingsForm({ initialData }: { initialData: BackgroundFormData }) {
  const t = useTranslations("admin");
  const [form, setForm] = useState(initialData);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Per-image crop map derived from the form's JSON field; editing any
  // picker rewrites the map and serializes it back into the form.
  const rects = useMemo(
    () => parseHeroBackgroundRects(form.heroBackgroundRects) ?? {},
    [form.heroBackgroundRects],
  );
  const setRects = (next: HeroBackgroundRects) =>
    setForm((prev) => ({
      ...prev,
      heroBackgroundRects: serializeHeroBackgroundRects(next),
    }));

  const splitList = (value?: string | null) =>
    (value ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
  const fallbackList = useMemo(() => {
    const list = splitList(form.heroMediaPlaylist);
    if (form.heroMediaUrl && !list.includes(form.heroMediaUrl)) list.unshift(form.heroMediaUrl);
    return list;
  }, [form.heroMediaUrl, form.heroMediaPlaylist]);
  const lightOwnList = useMemo(() => {
    if (!form.heroLightImageUrl && !form.heroLightPlaylist) return [];
    const list = splitList(form.heroLightPlaylist);
    if (form.heroLightImageUrl && !list.includes(form.heroLightImageUrl))
      list.unshift(form.heroLightImageUrl);
    return list;
  }, [form.heroLightImageUrl, form.heroLightPlaylist]);
  const darkOwnList = useMemo(() => {
    if (!form.heroDarkImageUrl && !form.heroDarkPlaylist) return [];
    const list = splitList(form.heroDarkPlaylist);
    if (form.heroDarkImageUrl && !list.includes(form.heroDarkImageUrl))
      list.unshift(form.heroDarkImageUrl);
    return list;
  }, [form.heroDarkImageUrl, form.heroDarkPlaylist]);

  const shortUrl = (url: string) => (url.length > 52 ? `${url.slice(0, 24)}…${url.slice(-24)}` : url);

  async function upload(kind: "backgrounds" | "logos", file?: File | null) {
    if (!file) return null;
    const body = new FormData();
    body.append("kind", kind);
    body.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? t("uploadFailed"));
    return data.url as string;
  }

  return (
    <form
      className="admin-stack"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        setSaving(true);
        const response = await fetch("/api/admin/site", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        const data = await response.json();
        setSaving(false);
        if (!response.ok) {
          setError(typeof data.error === "string" ? data.error : t("saveFailed"));
          return;
        }
        setMessage(t("backgroundSaved"));
      }}
    >
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <p className="admin-card-desc">{t("backgroundSettingsHint")}</p>
          </div>
          <div
            className="admin-swatch"
            aria-hidden="true"
            style={{
              background: form.gradientEnabled
                ? `linear-gradient(${form.gradientAngle}deg, ${form.gradientStart}, ${form.gradientEnd})`
                : form.accentColor,
            }}
          />
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">{t("generalBackground")}</h2>
            <p className="admin-card-desc">{t("heroMediaTypeHint")}</p>
          </div>
        </div>
        <div className="admin-card-body">
          <div className="admin-grid">
            <label className="admin-check admin-span-2">
              <input
                type="checkbox"
                checked={form.showFriendLinks}
                onChange={(event) => setForm({ ...form, showFriendLinks: event.target.checked })}
              />
              <span className="admin-check-body">
                <span className="admin-check-title">{t("showFriendLinks")}</span>
                <span className="admin-hint">{t("showFriendLinksHint")}</span>
              </span>
            </label>

            <FieldGroup label={t("accentColor")} hint={t("accentColorHint")}>
              <input
                className="admin-input admin-mono"
                value={form.accentColor}
                onChange={(event) => setForm({ ...form, accentColor: event.target.value })}
                placeholder="#4cc9ff"
              />
            </FieldGroup>
            <FieldGroup label={t("gradientMode")} hint={t("gradientModeHint")}>
              <select
                className="admin-select"
                value={String(form.gradientEnabled)}
                onChange={(event) => setForm({ ...form, gradientEnabled: event.target.value === "true" })}
              >
                <option value="false">{t("gradientDisabled")}</option>
                <option value="true">{t("gradientEnabled")}</option>
              </select>
            </FieldGroup>
            <FieldGroup label={t("gradientStart")} hint={t("gradientStartHint")}>
              <input
                className="admin-input admin-mono"
                value={form.gradientStart}
                onChange={(event) => setForm({ ...form, gradientStart: event.target.value })}
                placeholder="#1297ff"
              />
            </FieldGroup>
            <FieldGroup label={t("gradientEnd")} hint={t("gradientEndHint")}>
              <input
                className="admin-input admin-mono"
                value={form.gradientEnd}
                onChange={(event) => setForm({ ...form, gradientEnd: event.target.value })}
                placeholder="#7b61ff"
              />
            </FieldGroup>
            <FieldGroup label={t("gradientAngle")} hint={t("gradientAngleHint")}>
              <input
                className="admin-input"
                type="number"
                min={0}
                max={360}
                value={form.gradientAngle}
                onChange={(event) => setForm({ ...form, gradientAngle: Number(event.target.value) || 135 })}
                placeholder="135"
              />
            </FieldGroup>

            <FieldGroup label={t("heroMediaTypeLabel")} hint={t("heroMediaTypeHint")}>
              <select
                className="admin-select"
                value={form.heroMediaType}
                onChange={(event) =>
                  setForm({ ...form, heroMediaType: event.target.value as "image" | "video" })
                }
              >
                <option value="image">{t("heroImage")}</option>
                <option value="video">{t("heroVideo")}</option>
              </select>
            </FieldGroup>
            <FieldGroup label={t("heroEffectLabel")} hint={t("heroEffectHint")}>
              <select
                className="admin-select"
                value={form.heroEffect}
                onChange={(event) =>
                  setForm({ ...form, heroEffect: event.target.value as "none" | "scroll-pan" | "parallax" })
                }
              >
                <option value="none">{t("noScrollEffect")}</option>
                <option value="scroll-pan">{t("scrollPan")}</option>
                <option value="parallax">{t("parallax")}</option>
              </select>
            </FieldGroup>
            <FieldGroup label={t("heroInterval")} hint={t("heroIntervalHint")}>
              <input
                className="admin-input"
                type="number"
                min={1500}
                max={20000}
                step={100}
                value={form.heroImageIntervalMs}
                onChange={(event) =>
                  setForm({ ...form, heroImageIntervalMs: Number(event.target.value) || 4500 })
                }
                placeholder="4500"
              />
            </FieldGroup>
            <FieldGroup
              label={`${t("heroOverlayOpacity")} · ${form.heroOverlayOpacity}%`}
              hint={t("heroOverlayOpacityHint")}
            >
              <input
                className="admin-range"
                type="range"
                min={0}
                max={90}
                value={form.heroOverlayOpacity}
                onChange={(event) =>
                  setForm({ ...form, heroOverlayOpacity: Number(event.target.value) })
                }
              />
            </FieldGroup>
            <FieldGroup label={t("heroBackgroundPositionLabel")} hint={t("heroBackgroundPositionHint")}>
              <PositionPicker
                value={form.heroBackgroundPosition}
                onChange={(position) => setForm({ ...form, heroBackgroundPosition: position })}
              />
            </FieldGroup>

            <FieldGroup span label={t("heroMediaUrl")} hint={t("heroMediaUrlHint")}>
              <input
                className="admin-input admin-mono"
                value={form.heroMediaUrl}
                onChange={(event) => setForm({ ...form, heroMediaUrl: event.target.value })}
                placeholder="https://example.com/background.webp"
              />
            </FieldGroup>
            <FieldGroup span label={t("upload")} hint={t("heroUploadHint")}>
              <FilePicker
                accept={form.heroMediaType === "video" ? "video/*" : "image/*"}
                onSelect={async (file) => {
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
                }}
              />
            </FieldGroup>
            <FieldGroup span label={t("heroPlaylistLabel")} hint={t("heroPlaylistHint")}>
              <textarea
                className="admin-textarea"
                value={form.heroMediaPlaylist}
                onChange={(event) => setForm({ ...form, heroMediaPlaylist: event.target.value })}
                placeholder={t("heroPlaylistPlaceholder")}
              />
            </FieldGroup>
            <FieldGroup label={t("heroPosterUrl")} hint={t("heroPosterUrlHint")}>
              <input
                className="admin-input admin-mono"
                value={form.heroPosterUrl}
                onChange={(event) => setForm({ ...form, heroPosterUrl: event.target.value })}
                placeholder="https://example.com/poster.webp"
              />
            </FieldGroup>

            <FieldGroup span label={t("heroBackgroundRectPerImageLabel")} hint={t("heroBackgroundRectPerImageHint")}>
              {fallbackList.length ? (
                <div className="admin-stack" style={{ gap: 16 }}>
                  {fallbackList.map((url, index) => (
                    <CropPickerForUrl
                      key={url}
                      url={url}
                      rects={rects}
                      onRectsChange={setRects}
                      label={`${t("heroBackgroundRectPerImageLabel")} ${index + 1} — ${shortUrl(url)}`}
                    />
                  ))}
                </div>
              ) : (
                <p className="admin-hint">{t("heroBackgroundRectNoImage")}</p>
              )}
            </FieldGroup>
          </div>
        </div>
      </section>

      {form.heroMediaType === "image" ? (
        <>
          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2 className="admin-card-title">{t("darkModeBackground")}</h2>
                <p className="admin-card-desc">{t("darkHeroPlaylistHint")}</p>
              </div>
            </div>
            <div className="admin-card-body">
              <div className="admin-grid">
                <FieldGroup span label={t("darkHeroImageUrl")} hint={t("darkHeroImageUrlHint")}>
                  <input
                    className="admin-input admin-mono"
                    value={form.heroDarkImageUrl}
                    onChange={(event) => setForm({ ...form, heroDarkImageUrl: event.target.value })}
                    placeholder="https://example.com/dark-background.webp"
                  />
                </FieldGroup>
                <FieldGroup span label={t("upload")} hint={t("darkHeroUploadHint")}>
                  <FilePicker
                    accept="image/*"
                    onSelect={async (file) => {
                      const url = await upload("backgrounds", file);
                      if (!url) return;
                      setForm((prev) => ({
                        ...prev,
                        heroDarkImageUrl: prev.heroDarkImageUrl || url,
                        heroDarkPlaylist: [prev.heroDarkPlaylist, url].filter(Boolean).join("\n"),
                      }));
                    }}
                  />
                </FieldGroup>
                <FieldGroup span label={t("darkHeroPlaylist")} hint={t("darkHeroPlaylistHint")}>
                  <textarea
                    className="admin-textarea"
                    value={form.heroDarkPlaylist}
                    onChange={(event) => setForm({ ...form, heroDarkPlaylist: event.target.value })}
                    placeholder={t("darkHeroPlaylist")}
                  />
                </FieldGroup>
                {darkOwnList.length ? (
                  <div className="admin-span-2 admin-stack" style={{ gap: 16 }}>
                    {darkOwnList.map((url, index) => (
                      <CropPickerForUrl
                        key={url}
                        url={url}
                        rects={rects}
                        onRectsChange={setRects}
                        label={`${t("darkHeroCrop")} ${index + 1} — ${shortUrl(url)}`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <div>
                <h2 className="admin-card-title">{t("lightModeBackground")}</h2>
                <p className="admin-card-desc">{t("themePlaylistHint")}</p>
              </div>
            </div>
            <div className="admin-card-body">
              <div className="admin-grid">
                <FieldGroup span label={t("lightHeroImageUrl")} hint={t("lightHeroImageUrlHint")}>
                  <input
                    className="admin-input admin-mono"
                    value={form.heroLightImageUrl}
                    onChange={(event) => setForm({ ...form, heroLightImageUrl: event.target.value })}
                    placeholder="https://example.com/light-background.webp"
                  />
                </FieldGroup>
                <FieldGroup span label={t("upload")} hint={t("lightHeroUploadHint")}>
                  <FilePicker
                    accept="image/*"
                    onSelect={async (file) => {
                      const url = await upload("backgrounds", file);
                      if (!url) return;
                      setForm((prev) => ({
                        ...prev,
                        heroLightImageUrl: prev.heroLightImageUrl || url,
                        heroLightPlaylist: [prev.heroLightPlaylist, url].filter(Boolean).join("\n"),
                      }));
                    }}
                  />
                </FieldGroup>
                <FieldGroup span label={t("lightHeroPlaylist")} hint={t("lightHeroPlaylistHint")}>
                  <textarea
                    className="admin-textarea"
                    value={form.heroLightPlaylist}
                    onChange={(event) => setForm({ ...form, heroLightPlaylist: event.target.value })}
                    placeholder={t("lightHeroPlaylist")}
                  />
                </FieldGroup>
                {lightOwnList.length ? (
                  <div className="admin-span-2 admin-stack" style={{ gap: 16 }}>
                    {lightOwnList.map((url, index) => (
                      <CropPickerForUrl
                        key={url}
                        url={url}
                        rects={rects}
                        onRectsChange={setRects}
                        label={`${t("lightHeroCrop")} ${index + 1} — ${shortUrl(url)}`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        </>
      ) : null}

      <div className="admin-savebar">
        <span className="admin-btn-row" aria-live="polite">
          {error ? (
            <span className="admin-alert" data-variant="error">
              <AlertCircle className="h-4 w-4" />
              {error}
            </span>
          ) : message ? (
            <span className="admin-alert" data-variant="success">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </span>
          ) : (
            <span className="admin-alert" data-variant="info">
              <Info className="h-4 w-4" />
              {t("saveHint")}
            </span>
          )}
        </span>
        <button className="admin-btn" data-variant="primary" data-size="lg" type="submit" disabled={saving} aria-busy={saving}>
          <Save className="h-4 w-4" />
          {saving ? t("working") : t("saveBackground")}
        </button>
      </div>
    </form>
  );
}
