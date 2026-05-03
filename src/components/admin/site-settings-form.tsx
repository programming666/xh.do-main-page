"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { FilePicker } from "@/components/admin/file-picker";

type LocaleContent = {
  eyebrow: string;
  headline: string;
  subheadline: string;
  aboutTitle: string;
  aboutBody: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  footerText: string;
};

type SiteFormData = {
  siteName: string;
  metaTitle: string;
  githubUrl: string;
  logoMode: "url" | "upload";
  logoUrl: string;
  translations: {
    zh: LocaleContent;
    en: LocaleContent;
  };
};

const fieldClassName =
  "w-full rounded-2xl border border-white/10 bg-white/70 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-500 transition-colors dark:bg-black/20 dark:text-slate-100 dark:placeholder:text-slate-400";
const selectClassName = `${fieldClassName} appearance-none`;
const textareaClassName = `${fieldClassName} min-h-28 resize-y`;

export function SiteSettingsForm({ initialData }: { initialData: SiteFormData }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [form, setForm] = useState(initialData);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const helperMessage = useMemo(() => {
    return locale === "zh"
      ? "这里管理站点品牌、Logo、GitHub 主页和首页核心文案。背景、强调色和渐变已移到背景设置。"
      : "Manage site branding, logo, GitHub profile and homepage copy here. Background visuals, accent color and gradients are moved to background settings.";
  }, [locale]);

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
        setMessage(t("siteSaved"));
      }}
    >
      <section className="glass-panel rounded-3xl p-6">
        <div>
          <h2 className="text-xl font-semibold">{t("brandMedia")}</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">{helperMessage}</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <input className={`${fieldClassName} md:col-span-2`} value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} placeholder={t("siteName")} />
          <label className="block space-y-2 md:col-span-2">
            <span className="block text-sm font-medium text-foreground">{t("metaTitle")}</span>
            <span className="block text-xs leading-5 text-[color:var(--muted)]">{t("metaTitleHint")}</span>
            <input className={fieldClassName} value={form.metaTitle} onChange={(e) => setForm({ ...form, metaTitle: e.target.value })} placeholder={form.siteName || t("metaTitle")} />
          </label>
          <input className={`${fieldClassName} md:col-span-2`} value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })} placeholder={t("githubUrl")} />
          <select className={selectClassName} value={form.logoMode} onChange={(e) => setForm({ ...form, logoMode: e.target.value as "url" | "upload" })}>
            <option value="url">{t("logoFromUrl")}</option>
            <option value="upload">{t("logoFromUpload")}</option>
          </select>
          <input className={fieldClassName} value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder={t("logoUrl")} />
          <FilePicker accept="image/*,.svg" onSelect={async (file) => {
            const url = await upload("logos", file);
            if (url) setForm((prev) => ({ ...prev, logoMode: "upload", logoUrl: url }));
          }} />
        </div>
      </section>
      {(["zh", "en"] as const).map((entryLocale) => (
        <section key={entryLocale} className="glass-panel rounded-3xl p-6">
          <h2 className="text-xl font-semibold">{t("contentForLocale", { locale: entryLocale.toUpperCase() })}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input className={fieldClassName} value={form.translations[entryLocale].eyebrow} onChange={(e) => setForm({ ...form, translations: { ...form.translations, [entryLocale]: { ...form.translations[entryLocale], eyebrow: e.target.value } } })} placeholder={t("eyebrow")} />
            <input className={`${fieldClassName} md:col-span-2`} value={form.translations[entryLocale].headline} onChange={(e) => setForm({ ...form, translations: { ...form.translations, [entryLocale]: { ...form.translations[entryLocale], headline: e.target.value } } })} placeholder={t("headline")} />
            <textarea className={`${textareaClassName} md:col-span-2`} value={form.translations[entryLocale].subheadline} onChange={(e) => setForm({ ...form, translations: { ...form.translations, [entryLocale]: { ...form.translations[entryLocale], subheadline: e.target.value } } })} placeholder={t("subheadline")} />
            <input className={fieldClassName} value={form.translations[entryLocale].aboutTitle} onChange={(e) => setForm({ ...form, translations: { ...form.translations, [entryLocale]: { ...form.translations[entryLocale], aboutTitle: e.target.value } } })} placeholder={t("aboutTitle")} />
            <textarea className={`${textareaClassName} md:col-span-2`} value={form.translations[entryLocale].aboutBody} onChange={(e) => setForm({ ...form, translations: { ...form.translations, [entryLocale]: { ...form.translations[entryLocale], aboutBody: e.target.value } } })} placeholder={t("aboutBody")} />
            <input className={fieldClassName} value={form.translations[entryLocale].primaryLabel} onChange={(e) => setForm({ ...form, translations: { ...form.translations, [entryLocale]: { ...form.translations[entryLocale], primaryLabel: e.target.value } } })} placeholder={t("primaryLabel")} />
            <input className={fieldClassName} value={form.translations[entryLocale].primaryHref} onChange={(e) => setForm({ ...form, translations: { ...form.translations, [entryLocale]: { ...form.translations[entryLocale], primaryHref: e.target.value } } })} placeholder={t("primaryHref")} />
            <label className="block space-y-2 md:col-span-2">
              <span className="block text-sm font-medium text-foreground">{t("footerText")}</span>
              <span className="block text-xs leading-5 text-[color:var(--muted)]">{t("footerTextHint")}</span>
              <textarea className={textareaClassName} value={form.translations[entryLocale].footerText} onChange={(e) => setForm({ ...form, translations: { ...form.translations, [entryLocale]: { ...form.translations[entryLocale], footerText: e.target.value } } })} placeholder={t("footerTextPlaceholder")} />
            </label>
          </div>
        </section>
      ))}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      <button className="rounded-2xl bg-cyan-400 px-5 py-3 font-medium text-slate-950" type="submit">{t("saveSite")}</button>
    </form>
  );
}
