"use client";

import { useTranslations } from "next-intl";
import type { BackgroundTheme } from "@/lib/appearance";
import { FilePicker } from "@/components/admin/file-picker";

/**
 * Per-theme colour + background controls. Rendered as a console card so the
 * light/dark pair reads as two comparable panels instead of two loose
 * fieldsets.
 */
export function AppearanceThemeFields({
  mode,
  value,
  onChange,
  onUpload,
  showBackground = true,
}: {
  showBackground?: boolean;
  mode: "light" | "dark";
  value: BackgroundTheme;
  onChange: (patch: Partial<BackgroundTheme>) => void;
  onUpload: (file?: File | null) => Promise<void>;
}) {
  const t = useTranslations("appearance");

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <h3 className="admin-card-title">{t(mode)}</h3>
        </div>
      </div>
      <div className="admin-card-body">
        <div className="admin-grid">
          {(["background", "foreground", "accent"] as const).map((key) => (
            <label key={key} className="admin-field">
              <span className="admin-label">{t(key)}</span>
              <span className="admin-color">
                <input
                  aria-label={t(key)}
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(value[key]) ? value[key] : "#000000"}
                  onChange={(event) => onChange({ [key]: event.target.value })}
                />
                <input
                  className="admin-input admin-mono"
                  aria-label={`${t(key)} HEX`}
                  value={value[key]}
                  maxLength={7}
                  pattern="#[0-9a-fA-F]{6}"
                  required
                  onChange={(event) => onChange({ [key]: event.target.value })}
                />
              </span>
            </label>
          ))}

          {showBackground ? (
            <label className="admin-field">
              <span className="admin-label">{t("backgroundMode")}</span>
              <select
                className="admin-select"
                value={value.mode}
                onChange={(event) => onChange({ mode: event.target.value as BackgroundTheme["mode"] })}
              >
                {(["solid", "gradient", "image"] as const).map((item) => (
                  <option key={item} value={item}>
                    {t(item)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {showBackground && value.mode === "gradient" ? (
            <>
              {(["gradientStart", "gradientEnd"] as const).map((key) => (
                <label key={key} className="admin-field">
                  <span className="admin-label">{t(key)}</span>
                  <span className="admin-color">
                    <input
                      aria-label={t(key)}
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(value[key]) ? value[key] : "#000000"}
                      onChange={(event) => onChange({ [key]: event.target.value })}
                    />
                    <input
                      className="admin-input admin-mono"
                      aria-label={`${t(key)} HEX`}
                      value={value[key]}
                      maxLength={7}
                      pattern="#[0-9a-fA-F]{6}"
                      required
                      onChange={(event) => onChange({ [key]: event.target.value })}
                    />
                  </span>
                </label>
              ))}
              <label className="admin-field">
                <span className="admin-label">{t("gradientAngle")}</span>
                <input
                  className="admin-input"
                  type="number"
                  min={0}
                  max={360}
                  required
                  value={value.gradientAngle}
                  onChange={(event) => onChange({ gradientAngle: event.target.valueAsNumber })}
                />
              </label>
            </>
          ) : null}

          {showBackground && value.mode === "image" ? (
            <>
              <label className="admin-field admin-span-2">
                <span className="admin-label">{t("imageUrl")}</span>
                <span className="admin-hint">{t("imageHint")}</span>
                <input
                  className="admin-input admin-mono"
                  type="text"
                  value={value.imageUrl}
                  maxLength={2048}
                  placeholder="https://… /uploads/backgrounds/…"
                  onChange={(event) => onChange({ imageUrl: event.target.value })}
                />
              </label>
              <div className="admin-field admin-span-2">
                <span className="admin-label">{t("imageUrl")}</span>
                <FilePicker accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onSelect={onUpload} />
              </div>
              <label className="admin-field admin-span-2">
                <span className="admin-label">{`${t("overlay")} · ${value.overlay}%`}</span>
                <input
                  className="admin-range"
                  type="range"
                  min={0}
                  max={90}
                  value={value.overlay}
                  onChange={(event) => onChange({ overlay: Number(event.target.value) })}
                />
              </label>
              {value.imageUrl ? (
                <div className="admin-field admin-span-2">
                  <button type="button" className="admin-btn" data-size="sm" onClick={() => onChange({ imageUrl: "" })}>
                    {t("clearImage")}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
