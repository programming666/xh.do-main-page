"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";
import { useTranslations } from "next-intl";

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
  // Per-locale metadata & social card overrides. Empty values fall back
  // through the chain (translation -> headline -> siteName) at render time.
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
};

type SiteFormData = {
  siteName: string;
  githubUrl: string;
  ogImageUrl: string;
  twitterHandle: string;
  logoMode: "url" | "upload";
  logoUrl: string;
  translations: {
    zh: LocaleContent;
    en: LocaleContent;
  };
};

type LocaleField = {
  key: keyof LocaleContent;
  labelKey: string;
  hintKey?: string;
  textarea?: boolean;
  span?: boolean;
};

type LocaleSection = {
  sectionKey: string;
  descKey?: string;
  fields: LocaleField[];
};

/**
 * Per-locale copy, grouped so the page reads as three short sections instead of
 * one 4500px column. Every control now carries a real <label> — the previous
 * version leaned on placeholders, which vanish the moment a field is filled in.
 */
const LOCALE_SECTIONS: LocaleSection[] = [
  {
    sectionKey: "homeCopySection",
    fields: [
      { key: "eyebrow", labelKey: "eyebrow" },
      { key: "headline", labelKey: "headline" },
      { key: "subheadline", labelKey: "subheadline", textarea: true, span: true },
      { key: "aboutTitle", labelKey: "aboutTitle" },
      { key: "aboutBody", labelKey: "aboutBody", textarea: true, span: true },
    ],
  },
  {
    sectionKey: "homeActionsSection",
    fields: [
      { key: "primaryLabel", labelKey: "primaryLabel" },
      { key: "primaryHref", labelKey: "primaryHref" },
      { key: "footerText", labelKey: "footerText", hintKey: "footerTextHint", textarea: true, span: true },
    ],
  },
  {
    sectionKey: "seoTitle",
    descKey: "seoHint",
    fields: [
      { key: "metaTitle", labelKey: "metaTitle", hintKey: "metaTitleHint", span: true },
      { key: "metaDescription", labelKey: "metaDescription", hintKey: "metaDescriptionHint", textarea: true, span: true },
      { key: "ogTitle", labelKey: "ogTitle", span: true },
      { key: "ogDescription", labelKey: "ogDescription", textarea: true, span: true },
      { key: "twitterTitle", labelKey: "twitterTitle", span: true },
      { key: "twitterDescription", labelKey: "twitterDescription", textarea: true, span: true },
    ],
  },
];

export function SiteSettingsForm({ initialData }: { initialData: SiteFormData }) {
  const t = useTranslations("admin");
  const [form, setForm] = useState(initialData);
  const [tab, setTab] = useState<"zh" | "en">("zh");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialData),
    [form, initialData],
  );

  function setLocaleField(target: "zh" | "en", key: keyof LocaleContent, value: string) {
    setForm((prev) => ({
      ...prev,
      translations: { ...prev.translations, [target]: { ...prev.translations[target], [key]: value } },
    }));
    setMessage(null);
  }

  async function upload(kind: "backgrounds" | "logos" | "og", file?: File | null) {
    if (!file) return null;
    const body = new FormData();
    body.append("kind", kind);
    body.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? t("uploadFailed"));
    return data.url as string;
  }

  const content = form.translations[tab];

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
        setMessage(t("siteSaved"));
      }}
    >
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">{t("brandSection")}</h2>
            <p className="admin-card-desc">{t("brandSectionHint")}</p>
          </div>
        </div>
        <div className="admin-card-body">
          <div className="admin-grid">
            <label className="admin-field admin-span-2">
              <span className="admin-label">{t("siteName")}</span>
              <input
                className="admin-input"
                value={form.siteName}
                onChange={(event) => {
                  setForm({ ...form, siteName: event.target.value });
                  setMessage(null);
                }}
              />
            </label>
            <label className="admin-field admin-span-2">
              <span className="admin-label">{t("githubUrl")}</span>
              <input
                className="admin-input admin-mono"
                value={form.githubUrl}
                placeholder="https://github.com/…"
                onChange={(event) => {
                  setForm({ ...form, githubUrl: event.target.value });
                  setMessage(null);
                }}
              />
            </label>
            <label className="admin-field">
              <span className="admin-label">{t("logoModeLabel")}</span>
              <select
                className="admin-select"
                value={form.logoMode}
                onChange={(event) => {
                  setForm({ ...form, logoMode: event.target.value as "url" | "upload" });
                  setMessage(null);
                }}
              >
                <option value="url">{t("logoFromUrl")}</option>
                <option value="upload">{t("logoFromUpload")}</option>
              </select>
              <span className="admin-hint">{t("logoModeHint")}</span>
            </label>
            <label className="admin-field">
              <span className="admin-label">{t("logoUrl")}</span>
              <input
                className="admin-input admin-mono"
                value={form.logoUrl}
                onChange={(event) => {
                  setForm({ ...form, logoUrl: event.target.value });
                  setMessage(null);
                }}
              />
            </label>
            <div className="admin-field admin-span-2">
              <span className="admin-label">{t("logoUpload")}</span>
              <FilePicker
                accept="image/*,.svg"
                onSelect={async (file) => {
                  const url = await upload("logos", file);
                  if (url) {
                    setForm((prev) => ({ ...prev, logoMode: "upload", logoUrl: url }));
                    setMessage(null);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">{t("sharePreview")}</h2>
            <p className="admin-card-desc">{t("ogImageUrlHint")}</p>
          </div>
        </div>
        <div className="admin-card-body">
          <div className="admin-grid">
            <label className="admin-field admin-span-2">
              <span className="admin-label">{t("ogImageUrl")}</span>
              <input
                className="admin-input admin-mono"
                value={form.ogImageUrl}
                placeholder={t("ogImageUrlPlaceholder")}
                onChange={(event) => {
                  setForm({ ...form, ogImageUrl: event.target.value });
                  setMessage(null);
                }}
              />
            </label>
            <div className="admin-field admin-span-2">
              <span className="admin-label">{t("upload")}</span>
              <FilePicker
                accept="image/*"
                onSelect={async (file) => {
                  const url = await upload("og", file);
                  if (url) {
                    setForm((prev) => ({ ...prev, ogImageUrl: url }));
                    setMessage(null);
                  }
                }}
              />
            </div>
            <label className="admin-field admin-span-2">
              <span className="admin-label">{t("twitterHandle")}</span>
              <span className="admin-hint">{t("twitterHandleHint")}</span>
              <input
                className="admin-input"
                value={form.twitterHandle}
                placeholder={t("twitterHandlePlaceholder")}
                onChange={(event) => {
                  setForm({ ...form, twitterHandle: event.target.value });
                  setMessage(null);
                }}
              />
            </label>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">{t("contentSection")}</h2>
            <p className="admin-card-desc">{t("contentSectionHint")}</p>
          </div>
          <div className="admin-tabs" role="tablist" aria-label={t("contentSection")}>
            {(["zh", "en"] as const).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                id={`content-tab-${item}`}
                aria-selected={tab === item}
                aria-controls={`content-panel-${item}`}
                className="admin-tab"
                onClick={() => setTab(item)}
              >
                {item === "zh" ? t("tabZh") : t("tabEn")}
              </button>
            ))}
          </div>
        </div>
        <div
          className="admin-card-body"
          role="tabpanel"
          id={`content-panel-${tab}`}
          aria-labelledby={`content-tab-${tab}`}
        >
          <div className="admin-stack" style={{ gap: 18 }}>
            {LOCALE_SECTIONS.map((section) => (
              <fieldset
                key={section.sectionKey}
                className="admin-fieldset"
                // The first group needs no divider: it follows the card head.
                data-first={section.sectionKey === LOCALE_SECTIONS[0].sectionKey}
              >
                <legend className="admin-legend">{t(section.sectionKey)}</legend>
                {section.descKey ? <p className="admin-hint">{t(section.descKey)}</p> : null}
                <div className="admin-grid" style={{ marginTop: 12 }}>
                  {section.fields.map((field) => (
                    <label
                      key={field.key}
                      className={`admin-field${field.span || section.fields.length === 1 ? " admin-span-2" : ""}`}
                    >
                      <span className="admin-label">{t(field.labelKey)}</span>
                      {field.hintKey ? <span className="admin-hint">{t(field.hintKey)}</span> : null}
                      {field.textarea ? (
                        <textarea
                          className="admin-textarea"
                          value={content[field.key]}
                          onChange={(event) => setLocaleField(tab, field.key, event.target.value)}
                        />
                      ) : (
                        <input
                          className="admin-input"
                          value={content[field.key]}
                          onChange={(event) => setLocaleField(tab, field.key, event.target.value)}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
      </section>

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
            t(dirty ? "unsavedHint" : "savedHint")
          )}
        </span>
        <button className="admin-btn" data-variant="primary" data-size="lg" type="submit" disabled={saving} aria-busy={saving}>
          <Save className="h-4 w-4" />
          {saving ? t("working") : t("saveSite")}
        </button>
      </div>
    </form>
  );
}
