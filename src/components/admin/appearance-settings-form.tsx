"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { appearanceSchema, getBackgroundImage, readAppearance, type Appearance, type BackgroundTheme } from "@/lib/appearance";
import { AppearanceThemeFields } from "./appearance-theme-fields";

const layoutOptions = {
  width: ["compact", "standard", "wide"], density: ["compact", "relaxed"],
  backgroundSource: ["hero", "custom"], projectStyle: ["list", "cards"],
} as const;

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
    setMessage(""); setError("");
    if (!["image/png", "image/jpeg", "image/webp", "image/gif", "image/avif"].includes(file.type) || file.size > 50 * 1024 * 1024) {
      setError(t("uploadInvalid")); return;
    }
    setBusy(true);
    try {
      const form = new FormData(); form.set("kind", "backgrounds"); form.set("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || typeof data.url !== "string") throw new Error(t("uploadFailed"));
      setTheme(mode, { imageUrl: data.url });
      setMessage(t("uploaded"));
    } catch { setError(t("uploadFailed")); }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const parsed = appearanceSchema.safeParse(value);
    if (!parsed.success) {
      setError(`${t("invalid")} ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`); return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/site", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ appearance: parsed.data }) });
      const data = await response.json();
      if (!response.ok) { setError(response.status === 401 || response.status === 403 ? t("unauthorized") : t("saveFailed")); return; }
      setValue(readAppearance(data.site.appearance)); setMessage(t("saved"));
    } catch { setError(t("saveFailed")); }
    finally { setBusy(false); }
  }
  function moveSection(index: number, offset: number) {
    setMessage("");
    setValue((old) => {
      const order = [...old.sectionOrder];
      [order[index], order[index + offset]] = [order[index + offset], order[index]];
      return { ...old, sectionOrder: order };
    });
  }
  return <form className="appearance-form" onSubmit={save} onChange={() => setMessage("")}>
    <header className="appearance-heading"><p>DESIGN / SETTINGS</p><h2>{t("title")}</h2><p>{t("intro")}</p><Link href="/admin/content/background">{t("heroSettings")} ↗</Link></header>
    <fieldset disabled={busy} className="appearance-controls">
      <div className="appearance-preview" style={{ backgroundColor: previewTheme.background, backgroundImage: getBackgroundImage(previewTheme), color: previewTheme.foreground }}>
        <div style={{ background: previewTheme.background, opacity: previewTheme.mode === "image" ? previewTheme.overlay / 100 : 0 }} className="appearance-preview-overlay" />
        <div className="appearance-preview-content" style={{ background: previewTheme.background }}>
          <div className="appearance-preview-bar"><span>{t("preview")}</span><button type="button" onClick={() => setPreviewMode(previewMode === "light" ? "dark" : "light")}>{t(previewMode)} ◐</button></div>
          <div className="appearance-preview-hero" data-media="false">
            <div><small style={{ color: previewTheme.accent }}>PERSONAL SPACE</small><h3>{t("previewTitle")}</h3><p>{t("previewHint")}</p></div>
          </div>
        </div>
      </div>
      <div className="appearance-themes">{(["light", "dark"] as const).map((mode) => <AppearanceThemeFields key={mode} showBackground={value.backgroundSource === "custom"} mode={mode} value={value[mode]} onChange={(patch) => setTheme(mode, patch)} onUpload={(file) => upload(mode, file)} />)}</div>
      <fieldset className="appearance-panel"><legend>{t("layout")}</legend><p>{t("adaptiveHint")}</p><div className="appearance-fields">
        {(Object.keys(layoutOptions) as Array<keyof typeof layoutOptions>).map((key) => <label key={key}>{t(key)}<select value={value[key]} onChange={(e) => setValue((old) => ({ ...old, [key]: e.target.value }))}>{layoutOptions[key].map((option) => <option key={option} value={option}>{t(option)}</option>)}</select></label>)}
        <label className="appearance-toggle"><input type="checkbox" checked={value.autoColors} onChange={(e) => setValue((old) => ({ ...old, autoColors: e.target.checked }))} />{t("autoColors")}</label>
        <label className="appearance-toggle"><input type="checkbox" checked={value.mediaVisible} onChange={(e) => setValue((old) => ({ ...old, mediaVisible: e.target.checked }))} />{t("mediaVisible")}</label>
      </div></fieldset>
      <fieldset className="appearance-panel"><legend>{t("sections")}</legend><p>{t("sectionsHint")}</p><div className="appearance-order">{value.sectionOrder.map((key, index) => <div key={key}><label><input type="checkbox" checked={value.sections[key]} onChange={(e) => setValue((old) => ({ ...old, sections: { ...old.sections, [key]: e.target.checked } }))} />{t(key)}</label><div><button type="button" disabled={index === 0} aria-label={`${t("up")} ${t(key)}`} onClick={() => moveSection(index, -1)}>↑</button><button type="button" disabled={index === value.sectionOrder.length - 1} aria-label={`${t("down")} ${t(key)}`} onClick={() => moveSection(index, 1)}>↓</button></div></div>)}</div></fieldset>
    </fieldset>
    <div className="appearance-save"><div aria-live="polite">{error ? <p role="alert" className="appearance-error">{error}</p> : <p>{message || t("saveHint")}</p>}</div><button type="submit" disabled={busy}>{busy ? t("working") : t("save")}</button></div>
  </form>;
}
