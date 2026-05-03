"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { FilePicker } from "@/components/admin/file-picker";

type FriendLink = {
  id?: string;
  platform: string;
  label: string;
  url: string;
  imageUrl?: string | null;
  sortOrder: number;
  isPublished: boolean;
};

const emptyLink: FriendLink = {
  platform: "friend",
  label: "",
  url: "",
  imageUrl: "",
  sortOrder: 0,
  isPublished: true,
};

const fieldClassName =
  "w-full rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-500 transition-colors dark:bg-slate-950/35 dark:text-slate-100 dark:placeholder:text-slate-400";

export function FriendLinksManager({ initialLinks }: { initialLinks: FriendLink[] }) {
  const t = useTranslations("admin");
  const [links, setLinks] = useState(initialLinks);
  const [editing, setEditing] = useState<FriendLink>(emptyLink);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/admin/social", { cache: "no-store" });
    const data = await response.json();
    setLinks(data.links);
  }

  async function upload(file?: File | null) {
    if (!file) return null;
    const body = new FormData();
    body.append("kind", "logos");
    body.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Upload failed");
    return data.url as string;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="glass-panel rounded-[1.75rem] p-6">
        <h2 className="text-xl font-semibold">{t("friendLinks")}</h2>
        <div className="mt-4 space-y-3">
          {links.map((link) => (
            <div key={link.id ?? link.url} className="rounded-2xl border border-white/10 bg-black/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {link.imageUrl ? (
                    <Image
                      src={link.imageUrl}
                      alt={link.label}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-2xl border border-white/10 object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-white/10 text-xs text-[color:var(--muted)]">
                      IMG
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{link.label}</h3>
                    <p className="text-sm text-[color:var(--muted)]">{link.url}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="rounded-full border border-white/10 px-3 py-1.5 text-sm" onClick={() => setEditing(link)}>{t("edit")}</button>
                  {link.id ? (
                    <button
                      type="button"
                      className="rounded-full border border-rose-400/20 px-3 py-1.5 text-sm text-rose-300"
                      onClick={async () => {
                        await fetch(`/api/admin/social/${link.id}`, { method: "DELETE" });
                        await refresh();
                      }}
                    >
                      {t("delete")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <form
        className="glass-panel space-y-4 rounded-[1.75rem] p-6"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);
          const url = editing.id ? `/api/admin/social/${editing.id}` : "/api/admin/social";
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
          setMessage(t("friendLinkSaved"));
          setEditing(emptyLink);
          await refresh();
        }}
      >
        <h2 className="text-xl font-semibold">{t("friendLinksEditor")}</h2>
        <input className={fieldClassName} placeholder={t("friendLinkName")} value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
        <input className={fieldClassName} placeholder={t("friendLinkUrl")} value={editing.url} onChange={(e) => setEditing({ ...editing, url: e.target.value })} />
        <input className={fieldClassName} placeholder={t("friendLinkImageUrl")} value={editing.imageUrl ?? ""} onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })} />
        <FilePicker accept="image/*" onSelect={async (file) => {
          const url = await upload(file);
          if (url) {
            setEditing((prev) => ({ ...prev, imageUrl: url }));
          }
        }} />
        <label className="block space-y-2">
          <span className="block text-sm font-medium text-foreground">{t("sortOrder")}</span>
          <span className="block text-xs leading-5 text-[color:var(--muted)]">{t("sortOrderHint")}</span>
          <input className={fieldClassName} type="number" placeholder={t("sortOrder")} value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })} />
        </label>
        <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm">
          <span>{t("isPublished")}</span>
          <input type="checkbox" checked={editing.isPublished} onChange={(e) => setEditing({ ...editing, isPublished: e.target.checked })} className="h-5 w-5 accent-cyan-400" />
        </label>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        <button className="rounded-2xl bg-cyan-400 px-5 py-3 font-medium text-slate-950" type="submit">{t("saveFriendLink")}</button>
      </form>
    </div>
  );
}
