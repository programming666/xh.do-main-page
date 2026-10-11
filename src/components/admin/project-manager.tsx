"use client";

import Image from "next/image";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Pencil, Plus, Save, Star, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { FilePicker } from "@/components/admin/file-picker";

type ProjectPayload = {
  id?: string;
  slug: string;
  coverMode: "url" | "upload";
  coverUrl: string;
  demoUrl: string;
  repoUrl: string;
  status: string;
  sortOrder: number;
  isFeatured: boolean;
  isPublished: boolean;
  translations: {
    zh: { title: string; summary: string; description: string; techStack: string };
    en: { title: string; summary: string; description: string; techStack: string };
  };
};

const emptyProject: ProjectPayload = {
  slug: "",
  coverMode: "url",
  coverUrl: "",
  demoUrl: "",
  repoUrl: "",
  status: "active",
  sortOrder: 0,
  isFeatured: false,
  isPublished: true,
  translations: {
    zh: { title: "", summary: "", description: "", techStack: "" },
    en: { title: "", summary: "", description: "", techStack: "" },
  },
};

const LOCALE_FIELDS = [
  { key: "title", labelKey: "title" },
  { key: "summary", labelKey: "summary" },
  { key: "description", labelKey: "description", textarea: true },
  { key: "techStack", labelKey: "techStack", hintKey: "techStackHint" },
] as const;

export function ProjectManager({ initialProjects }: { initialProjects: ProjectPayload[] }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [projects, setProjects] = useState(initialProjects);
  const [editing, setEditing] = useState<ProjectPayload>(emptyProject);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditingExisting = Boolean(editing.id);

  function startNew() {
    setEditing(emptyProject);
    setMessage(null);
    setError(null);
  }

  async function upload(file?: File | null) {
    if (!file) return null;
    const body = new FormData();
    body.append("kind", "projects");
    body.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? t("uploadFailed"));
    return data.url as string;
  }

  async function refresh() {
    const response = await fetch("/api/admin/projects", { cache: "no-store" });
    const data = await response.json();
    setProjects(data.projects);
  }

  async function remove(project: ProjectPayload) {
    if (!project.id) return;
    const title = locale === "en" ? project.translations.en.title : project.translations.zh.title;
    if (!window.confirm(t("confirmDelete", { name: title || project.slug }))) return;
    await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE" });
    if (editing.id === project.id) startNew();
    await refresh();
  }

  return (
    <div className="admin-grid" style={{ gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)", alignItems: "start" }}>
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">{t("existingProjects")}</h2>
            <p className="admin-card-desc">{t("projectsListHint")}</p>
          </div>
          <button type="button" className="admin-btn" data-size="sm" onClick={startNew}>
            <Plus className="h-3.5 w-3.5" />
            {t("newProject")}
          </button>
        </div>
        <div className="admin-card-body" data-flush="true">
          {projects.length === 0 ? (
            <div className="admin-empty">
              <Plus className="h-5 w-5" />
              <strong>{t("emptyProjects")}</strong>
              <p>{t("emptyProjectsHint")}</p>
            </div>
          ) : (
            <div className="admin-list">
              {projects.map((project) => {
                const title = locale === "en" ? project.translations.en.title : project.translations.zh.title;
                const selected = editing.id === project.id;
                return (
                  <div
                    key={project.id ?? project.slug}
                    className="admin-list-row"
                    data-selected={selected}
                  >
                    {project.coverUrl ? (
                      <Image
                        className="admin-list-thumb"
                        src={project.coverUrl}
                        alt=""
                        width={46}
                        height={46}
                        unoptimized
                      />
                    ) : (
                      <span className="admin-list-thumb" data-fallback="true">
                        {(project.slug || "?").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="admin-list-main">
                      <span className="admin-list-title">{title || project.slug}</span>
                      <span className="admin-list-meta">{project.slug}</span>
                    </div>
                    <span className="admin-list-actions">
                      {project.isFeatured ? (
                        <span className="admin-badge" data-tone="primary" title={t("isFeatured")}>
                          <Star className="h-3 w-3" />
                          {t("isFeaturedShort")}
                        </span>
                      ) : null}
                      {project.isPublished ? null : (
                        <span className="admin-badge" data-tone="warn">
                          {t("draft")}
                        </span>
                      )}
                      <button
                        type="button"
                        className="admin-btn"
                        data-size="sm"
                        data-icon="true"
                        aria-label={t("edit")}
                        title={t("edit")}
                        onClick={() => {
                          setEditing(project);
                          setMessage(null);
                          setError(null);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {project.id ? (
                        <button
                          type="button"
                          className="admin-btn"
                          data-variant="danger"
                          data-size="sm"
                          data-icon="true"
                          aria-label={t("delete")}
                          title={t("delete")}
                          onClick={() => remove(project)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <form
        className="admin-card"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          setSaving(true);
          const url = editing.id ? `/api/admin/projects/${editing.id}` : "/api/admin/projects";
          const method = editing.id ? "PATCH" : "POST";
          const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editing),
          });
          const data = await response.json();
          setSaving(false);
          if (!response.ok) {
            setError(typeof data.error === "string" ? data.error : t("saveFailed"));
            return;
          }
          setMessage(t("projectSaved"));
          setEditing(emptyProject);
          await refresh();
        }}
      >
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">
              {isEditingExisting ? t("editProjectTitle") : t("newProjectTitle")}
            </h2>
            <p className="admin-card-desc">{t("projectFormHint")}</p>
          </div>
          {isEditingExisting ? (
            <button type="button" className="admin-btn" data-size="sm" data-variant="ghost" onClick={startNew}>
              <X className="h-3.5 w-3.5" />
              {t("cancelEdit")}
            </button>
          ) : null}
        </div>
        <div className="admin-card-body">
          <div className="admin-stack" style={{ gap: 16 }}>
            <label className="admin-field">
              <span className="admin-label">{t("slug")}</span>
              <span className="admin-hint">{t("slugHint")}</span>
              <input
                className="admin-input admin-mono"
                value={editing.slug}
                onChange={(event) => setEditing({ ...editing, slug: event.target.value })}
              />
            </label>

            <label className="admin-field">
              <span className="admin-label">{t("coverUrl")}</span>
              <input
                className="admin-input admin-mono"
                value={editing.coverUrl}
                onChange={(event) => setEditing({ ...editing, coverUrl: event.target.value })}
              />
            </label>
            <FilePicker
              accept="image/*,.svg"
              onSelect={async (file) => {
                const url = await upload(file);
                if (url) setEditing((prev) => ({ ...prev, coverMode: "upload", coverUrl: url }));
              }}
            />

            <div className="admin-grid">
              <label className="admin-field">
                <span className="admin-label">{t("demoUrl")}</span>
                <input
                  className="admin-input admin-mono"
                  value={editing.demoUrl}
                  onChange={(event) => setEditing({ ...editing, demoUrl: event.target.value })}
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">{t("repoUrl")}</span>
                <input
                  className="admin-input admin-mono"
                  value={editing.repoUrl}
                  onChange={(event) => setEditing({ ...editing, repoUrl: event.target.value })}
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">{t("sortOrder")}</span>
                <span className="admin-hint">{t("sortOrderHint")}</span>
                <input
                  className="admin-input"
                  type="number"
                  value={editing.sortOrder}
                  onChange={(event) => setEditing({ ...editing, sortOrder: Number(event.target.value) || 0 })}
                />
              </label>
              <div className="admin-field" style={{ justifyContent: "flex-end" }}>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={editing.isPublished}
                    onChange={(event) => setEditing({ ...editing, isPublished: event.target.checked })}
                  />
                  <span className="admin-check-body">
                    <span className="admin-check-title">{t("isPublished")}</span>
                    <span className="admin-hint">{t("isPublishedHint")}</span>
                  </span>
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={editing.isFeatured}
                    onChange={(event) => setEditing({ ...editing, isFeatured: event.target.checked })}
                  />
                  <span className="admin-check-body">
                    <span className="admin-check-title">{t("isFeatured")}</span>
                    <span className="admin-hint">{t("isFeaturedHint")}</span>
                  </span>
                </label>
              </div>
            </div>

            {(["zh", "en"] as const).map((entryLocale) => (
              <fieldset key={entryLocale} className="admin-fieldset">
                <legend className="admin-legend">
                  {t("contentForLocale", { locale: entryLocale.toUpperCase() })}
                </legend>
                <div className="admin-grid" style={{ marginTop: 12 }}>
                  {LOCALE_FIELDS.map((field) => {
                    const fieldKey = field.key as keyof ProjectPayload["translations"]["zh"];
                    const value = editing.translations[entryLocale][fieldKey];
                    const isTextarea = "textarea" in field && field.textarea;
                    return (
                      <label
                        key={field.key}
                        className={`admin-field${isTextarea ? " admin-span-2" : ""}`}
                      >
                        <span className="admin-label">{t(field.labelKey)}</span>
                        {"hintKey" in field && field.hintKey ? (
                          <span className="admin-hint">{t(field.hintKey)}</span>
                        ) : null}
                        {isTextarea ? (
                          <textarea
                            className="admin-textarea"
                            value={value}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                translations: {
                                  ...editing.translations,
                                  [entryLocale]: {
                                    ...editing.translations[entryLocale],
                                    [fieldKey]: event.target.value,
                                  },
                                },
                              })
                            }
                          />
                        ) : (
                          <input
                            className="admin-input"
                            value={value}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                translations: {
                                  ...editing.translations,
                                  [entryLocale]: {
                                    ...editing.translations[entryLocale],
                                    [fieldKey]: event.target.value,
                                  },
                                },
                              })
                            }
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            {error ? (
              <p className="admin-alert" data-variant="error">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="admin-alert" data-variant="success">
                <CheckCircle2 className="h-4 w-4" />
                {message}
              </p>
            ) : null}

            <div className="admin-btn-row">
              <button className="admin-btn" data-variant="primary" type="submit" disabled={saving} aria-busy={saving}>
                <Save className="h-4 w-4" />
                {saving ? t("working") : t("saveProject")}
              </button>
              {isEditingExisting ? (
                <button type="button" className="admin-btn" data-variant="ghost" onClick={startNew}>
                  {t("cancelEdit")}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
