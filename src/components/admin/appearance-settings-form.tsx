"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, ImageIcon, Info, MoveDown, MoveUp, Save } from "lucide-react";

import { Link } from "@/i18n/navigation";
import {
  appearanceSchema,
  getBackgroundImage,
  readAppearance,
  type Appearance,
  type BackgroundTheme,
} from "@/lib/appearance";
import { AppearanceThemeFields } from "./appearance-theme-fields";

const layoutOptions = {
  width: ["compact", "standard", "wide"],
  density: ["compact", "relaxed"],
  backgroundSource: ["hero", "custom"],
  projectStyle: ["list", "cards"],
} as const;

/**
 * Appearance console: one live preview, the light/dark palettes, layout
 * switches and the section order. The page title + description now live in the
 * topbar (AdminShell), so this component starts with content instead of
 * repeating a heading.
 */
export function AppearanceSettingsForm({ initialData }: { initialData: Appearance }) {
  const t = useTranslations("appearance");
  const [value, setValue] = useState(initialData);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
  const validPreview = appearanceSchema.safeParse(value);
  const previewTheme = validPreview.success ? validPreview.data[previewMode] : initialData[previewMode];

  function setTheme(mode: "light" | "dark", patch: Partial<BackgroundTheme>) {
    setValue((old) => ({ ...old, [mode]: { ...old[mode], ...patch } }));
    setMessage("");
  }

  async function upload(mode: "light" | "dark", file?: File | null) {
    if (!file) return;
    setMessage("");
    setError("");
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"].includes(file.type) ||
      file.size > 50 * 1024 * 1024
    ) {
      setError(t("uploadInvalid"));
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("kind", "backgrounds");
      form.set("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") throw new Error(t("uploadFailed"));
      setTheme(mode, { imageUrl: data.url });
      setMessage(t("uploaded"));
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const parsed = appearanceSchema.safeParse(value);
    if (!parsed.success) {
      setError(`${t("invalid")} ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/site", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appearance: parsed.data }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(response.status === 401 || response.status === 403 ? t("unauthorized") : t("saveFailed"));
        return;
      }
      setValue(readAppearance(data.site.appearance));
      setMessage(t("saved"));
    } catch {
      setError(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  function moveSection(index: number, offset: number) {
    setMessage("");
    setValue((old) => {
      const order = [...old.sectionOrder];
      [order[index], order[index + offset]] = [order[index + offset], order[index]];
      return { ...old, sectionOrder: order };
    });
  }

  return (
    <form className="admin-stack" onSubmit={save} onChange={() => setMessage("")}>
      <fieldset disabled={busy} className="admin-stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <p className="admin-card-desc">{t("intro")}</p>
            </div>
            <Link className="admin-btn" data-size="sm" href="/admin/content/background">
              <ImageIcon className="h-3.5 w-3.5" />
              {t("heroSettings")}
            </Link>
          </div>
          <div className="admin-card-body">
            <div
              className="admin-preview"
              style={{
                backgroundColor: previewTheme.background,
                backgroundImage: getBackgroundImage(previewTheme),
                color: previewTheme.foreground,
              }}
            >
              <div
                className="admin-preview-overlay"
                style={{
                  background: previewTheme.background,
                  opacity: previewTheme.mode === "image" ? previewTheme.overlay / 100 : 0,
                }}
              />
              <div className="admin-preview-content" style={{ background: previewTheme.background }}>
                <div className="admin-preview-bar">
                  <span>{t("preview")}</span>
                  <button
                    type="button"
                    className="admin-btn"
                    data-size="sm"
                    onClick={() => setPreviewMode(previewMode === "light" ? "dark" : "light")}
                  >
                    {t(previewMode)} ◐
                  </button>
                </div>
                <div className="admin-preview-hero">
                  <small style={{ color: previewTheme.accent }}>PERSONAL SPACE</small>
                  <h3>{t("previewTitle")}</h3>
                  <p>{t("previewHint")}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="admin-grid">
          {(["light", "dark"] as const).map((mode) => (
            <AppearanceThemeFields
              key={mode}
              showBackground={value.backgroundSource === "custom"}
              mode={mode}
              value={value[mode]}
              onChange={(patch) => setTheme(mode, patch)}
              onUpload={(file) => upload(mode, file)}
            />
          ))}
        </div>

        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2 className="admin-card-title">{t("layout")}</h2>
              <p className="admin-card-desc">{t("adaptiveHint")}</p>
            </div>
          </div>
          <div className="admin-card-body">
            <div className="admin-grid">
              {(Object.keys(layoutOptions) as Array<keyof typeof layoutOptions>).map((key) => (
                <label key={key} className="admin-field">
                  <span className="admin-label">{t(key)}</span>
                  <select
                    className="admin-select"
                    value={value[key]}
                    onChange={(event) => setValue((old) => ({ ...old, [key]: event.target.value }))}
                  >
                    {layoutOptions[key].map((option) => (
                      <option key={option} value={option}>
                        {t(option)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={value.autoColors}
                  onChange={(event) => setValue((old) => ({ ...old, autoColors: event.target.checked }))}
                />
                <span className="admin-check-body">
                  <span className="admin-check-title">{t("autoColors")}</span>
                </span>
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={value.mediaVisible}
                  onChange={(event) => setValue((old) => ({ ...old, mediaVisible: event.target.checked }))}
                />
                <span className="admin-check-body">
                  <span className="admin-check-title">{t("mediaVisible")}</span>
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h2 className="admin-card-title">{t("sections")}</h2>
              <p className="admin-card-desc">{t("sectionsHint")}</p>
            </div>
          </div>
          <div className="admin-card-body">
            <div className="admin-order">
              {value.sectionOrder.map((key, index) => (
                <div key={key} className="admin-order-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={value.sections[key]}
                      onChange={(event) =>
                        setValue((old) => ({
                          ...old,
                          sections: { ...old.sections, [key]: event.target.checked },
                        }))
                      }
                    />
                    {t(key)}
                  </label>
                  <div className="admin-order-actions">
                    <button
                      type="button"
                      className="admin-btn"
                      data-size="sm"
                      data-icon="true"
                      disabled={index === 0}
                      aria-label={`${t("up")} ${t(key)}`}
                      title={`${t("up")} ${t(key)}`}
                      onClick={() => moveSection(index, -1)}
                    >
                      <MoveUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="admin-btn"
                      data-size="sm"
                      data-icon="true"
                      disabled={index === value.sectionOrder.length - 1}
                      aria-label={`${t("down")} ${t(key)}`}
                      title={`${t("down")} ${t(key)}`}
                      onClick={() => moveSection(index, 1)}
                    >
                      <MoveDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </fieldset>

      <div className="admin-savebar">
        <span aria-live="polite">
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
        <button className="admin-btn" data-variant="primary" data-size="lg" type="submit" disabled={busy} aria-busy={busy}>
          <Save className="h-4 w-4" />
          {busy ? t("working") : t("save")}
        </button>
      </div>
    </form>
  );
}
