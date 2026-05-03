"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

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

const fieldClassName =
  "w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-foreground outline-none placeholder:text-[color:var(--muted)]";
const textareaClassName = `${fieldClassName} min-h-24 resize-y`;

export function ProjectManager({ initialProjects }: { initialProjects: ProjectPayload[] }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [projects, setProjects] = useState(initialProjects);
  const [editing, setEditing] = useState<ProjectPayload>(emptyProject);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file?: File | null) {
    if (!file) return null;
    const body = new FormData();
    body.append("kind", "projects");
    body.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Upload failed");
    return data.url as string;
  }

  async function refresh() {
    const response = await fetch("/api/admin/projects", { cache: "no-store" });
    const data = await response.json();
    setProjects(data.projects);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="glass-panel rounded-3xl p-6">
        <h2 className="text-xl font-semibold">{t("existingProjects")}</h2>
        <div className="mt-4 space-y-3">
          {projects.map((project) => {
            const title = locale === "en" ? project.translations.en.title : project.translations.zh.title;
            return (
              <div key={project.id ?? project.slug} className="rounded-2xl border border-white/10 bg-black/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-sm text-[color:var(--muted)]">{project.slug}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="rounded-full border border-white/10 px-3 py-1.5 text-sm" onClick={() => setEditing(project)}>
                      {t("edit")}
                    </button>
                    {project.id ? (
                      <button
                        type="button"
                        className="rounded-full border border-rose-400/20 px-3 py-1.5 text-sm text-rose-300"
                        onClick={async () => {
                          await fetch(`/api/admin/projects/${project.id}`, { method: "DELETE" });
                          await refresh();
                        }}
                      >
                        {t("delete")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <form
        className="glass-panel space-y-4 rounded-3xl p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          const url = editing.id ? `/api/admin/projects/${editing.id}` : "/api/admin/projects";
          const method = editing.id ? "PATCH" : "POST";
          const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editing),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(typeof data.error === "string" ? data.error : t("saveFailed"));
            return;
          }
          setMessage(t("projectSaved"));
          setEditing(emptyProject);
          await refresh();
        }}
      >
        <h2 className="text-xl font-semibold">{t("newOrEditProject")}</h2>
        <input className={fieldClassName} placeholder="slug" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
        <input className={fieldClassName} placeholder={t("coverUrl")} value={editing.coverUrl} onChange={(e) => setEditing({ ...editing, coverUrl: e.target.value })} />
        <FilePicker accept="image/*,.svg" onSelect={async (file) => {
          const url = await upload(file);
          if (url) setEditing((prev) => ({ ...prev, coverMode: "upload", coverUrl: url }));
        }} />
        <input className={fieldClassName} placeholder={t("demoUrl")} value={editing.demoUrl} onChange={(e) => setEditing({ ...editing, demoUrl: e.target.value })} />
        <input className={fieldClassName} placeholder={t("repoUrl")} value={editing.repoUrl} onChange={(e) => setEditing({ ...editing, repoUrl: e.target.value })} />
        {(["zh", "en"] as const).map((entryLocale) => (
          <div key={entryLocale} className="space-y-3 rounded-2xl border border-white/10 p-4">
            <h3 className="font-medium">{t("contentForLocale", { locale: entryLocale.toUpperCase() })}</h3>
            <input className={fieldClassName} placeholder={t("title")} value={editing.translations[entryLocale].title} onChange={(e) => setEditing({ ...editing, translations: { ...editing.translations, [entryLocale]: { ...editing.translations[entryLocale], title: e.target.value } } })} />
            <input className={fieldClassName} placeholder={t("summary")} value={editing.translations[entryLocale].summary} onChange={(e) => setEditing({ ...editing, translations: { ...editing.translations, [entryLocale]: { ...editing.translations[entryLocale], summary: e.target.value } } })} />
            <textarea className={textareaClassName} placeholder={t("description")} value={editing.translations[entryLocale].description} onChange={(e) => setEditing({ ...editing, translations: { ...editing.translations, [entryLocale]: { ...editing.translations[entryLocale], description: e.target.value } } })} />
            <input className={fieldClassName} placeholder={t("techStack")} value={editing.translations[entryLocale].techStack} onChange={(e) => setEditing({ ...editing, translations: { ...editing.translations, [entryLocale]: { ...editing.translations[entryLocale], techStack: e.target.value } } })} />
          </div>
        ))}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        <button className="rounded-2xl bg-cyan-400 px-5 py-3 font-medium text-slate-950" type="submit">{t("saveProject")}</button>
      </form>
    </div>
  );
}
