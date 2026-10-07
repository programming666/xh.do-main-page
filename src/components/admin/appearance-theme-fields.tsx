"use client";

import { useTranslations } from "next-intl";
import type { BackgroundTheme } from "@/lib/appearance";
import { FilePicker } from "@/components/admin/file-picker";

export function AppearanceThemeFields({ mode, value, onChange, onUpload, showBackground = true }: {
  showBackground?: boolean;
  mode: "light" | "dark";
  value: BackgroundTheme;
  onChange: (patch: Partial<BackgroundTheme>) => void;
  onUpload: (file?: File | null) => Promise<void>;
}) {
  const t = useTranslations("appearance");
  return <fieldset className="appearance-panel">
    <legend>{t(mode)}</legend>
    <div className="appearance-fields">
      {(["background", "foreground", "accent"] as const).map((key) => <label key={key}>{t(key)}
        <div className="appearance-color"><input aria-label={t(key)} type="color" value={/^#[0-9a-f]{6}$/i.test(value[key]) ? value[key] : "#000000"} onChange={(e) => onChange({ [key]: e.target.value })} />
          <input aria-label={`${t(key)} HEX`} value={value[key]} maxLength={7} pattern="#[0-9a-fA-F]{6}" required onChange={(e) => onChange({ [key]: e.target.value })} /></div>
      </label>)}
      {showBackground ? <label>{t("backgroundMode")}<select value={value.mode} onChange={(e) => onChange({ mode: e.target.value as BackgroundTheme["mode"] })}>{(["solid", "gradient", "image"] as const).map((item) => <option key={item} value={item}>{t(item)}</option>)}</select></label> : null}
      {showBackground && value.mode === "gradient" ? <>
        {(["gradientStart", "gradientEnd"] as const).map((key) => <label key={key}>{t(key)}<input type="color" value={value[key]} onChange={(e) => onChange({ [key]: e.target.value })} /></label>)}
        <label>{t("gradientAngle")}<input type="number" min={0} max={360} required value={value.gradientAngle} onChange={(e) => onChange({ gradientAngle: e.target.valueAsNumber })} /></label>
      </> : null}
      {showBackground && value.mode === "image" ? <>
        <label className="appearance-full">{t("imageUrl")}<input type="text" value={value.imageUrl} maxLength={2048} placeholder="https://… /uploads/backgrounds/…" onChange={(e) => onChange({ imageUrl: e.target.value })} /><small>{t("imageHint")}</small></label>
        <div className="appearance-full"><FilePicker accept="image/png,image/jpeg,image/webp,image/gif,image/avif" onSelect={onUpload} /></div>
        <label className="appearance-full">{t("overlay")} · {value.overlay}%<input type="range" min={0} max={90} value={value.overlay} onChange={(e) => onChange({ overlay: Number(e.target.value) })} /></label>
        {value.imageUrl ? <button type="button" className="appearance-clear" onClick={() => onChange({ imageUrl: "" })}>{t("clearImage")}</button> : null}
      </> : null}
    </div>
  </fieldset>;
}
