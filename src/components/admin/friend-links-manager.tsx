"use client";

import Image from "next/image";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { FilePicker } from "@/components/admin/file-picker";

type FriendLink = {
  id?: string;
  platform: string;
  category?: string;
  label: string;
  url: string;
  imageUrl?: string | null;
  sortOrder: number;
  isPublished: boolean;
};

const emptyLink: FriendLink = {
  platform: "friend",
  category: "friend",
  label: "",
  url: "",
  imageUrl: "",
  sortOrder: 0,
  isPublished: true,
};

/**
 * Friend links and contact links share one table (`SocialLink`), split by
 * `category`, so the page shows one list + one editor at a time with a tab
 * switch — and every field carries a real label instead of a placeholder.
 */
export function FriendLinksManager({ initialLinks }: { initialLinks: FriendLink[] }) {
  const t = useTranslations("admin");
  const [category, setCategory] = useState<"friend" | "contact">("friend");
  const [links, setLinks] = useState(initialLinks);
  const [editing, setEditing] = useState<FriendLink>({ ...emptyLink, category });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const visibleLinks = links.filter((link) => (link.category ?? "friend") === category);
  const isEditingExisting = Boolean(editing.id);

  function startNew(nextCategory: "friend" | "contact" = category) {
    setEditing({ ...emptyLink, category: nextCategory });
    setMessage(null);
    setError(null);
  }

  function switchCategory(next: "friend" | "contact") {
    setCategory(next);
    startNew(next);
  }

  async function refresh() {
    const response = await fetch("/api/admin/social", { cache: "no-store" });
    const data = await response.json();
    setLinks(data.links);
  }

  async function remove(link: FriendLink) {
    if (!link.id) return;
    if (!window.confirm(t("confirmDelete", { name: link.label || link.url }))) return;
    await fetch(`/api/admin/social/${link.id}`, { method: "DELETE" });
    if (editing.id === link.id) startNew();
    await refresh();
  }

  async function upload(file?: File | null) {
    if (!file) return null;
    const body = new FormData();
    body.append("kind", "logos");
    body.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? t("uploadFailed"));
    return data.url as string;
  }

  return (
    <div className="admin-grid" style={{ gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 0.95fr)", alignItems: "start" }}>
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">{t(category === "friend" ? "friendLinks" : "contactLinks")}</h2>
            <p className="admin-card-desc">
              {t(category === "friend" ? "friendLinksListHint" : "contactLinksListHint")}
            </p>
          </div>
          <div className="admin-tabs" role="tablist" aria-label={t("linkCategories")}>
            {(["friend", "contact"] as const).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={category === item}
                className="admin-tab"
                onClick={() => switchCategory(item)}
              >
                {t(item === "friend" ? "friendLinks" : "contactLinks")}
              </button>
            ))}
          </div>
        </div>
        <div className="admin-card-body" data-flush="true">
          {visibleLinks.length === 0 ? (
            <div className="admin-empty">
              <Plus className="h-5 w-5" />
              <strong>{category === "contact" ? t("emptyContactLinks") : t("emptyFriendLinks")}</strong>
              <p>{t(category === "contact" ? "emptyContactLinksHint" : "emptyFriendLinksHint")}</p>
            </div>
          ) : (
            <div className="admin-list">
              {visibleLinks.map((link) => (
                <div
                  key={link.id ?? link.url}
                  className="admin-list-row"
                  data-selected={editing.id === link.id}
                >
                  {link.imageUrl ? (
                    <Image
                      className="admin-list-thumb"
                      src={link.imageUrl}
                      alt=""
                      width={46}
                      height={46}
                      unoptimized
                    />
                  ) : (
                    <span className="admin-list-thumb" data-fallback="true">
                      {(link.label || "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="admin-list-main">
                    <span className="admin-list-title">{link.label}</span>
                    <span className="admin-list-meta">{link.url.replace(/^https?:\/\//, "")}</span>
                  </div>
                  <span className="admin-list-actions">
                    {link.isPublished ? null : (
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
                        setEditing(link);
                        setMessage(null);
                        setError(null);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {link.id ? (
                      <button
                        type="button"
                        className="admin-btn"
                        data-variant="danger"
                        data-size="sm"
                        data-icon="true"
                        aria-label={t("delete")}
                        title={t("delete")}
                        onClick={() => remove(link)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </span>
                </div>
              ))}
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
          const url = editing.id ? `/api/admin/social/${editing.id}` : "/api/admin/social";
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
          setMessage(t("friendLinkSaved"));
          startNew();
          await refresh();
        }}
      >
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">
              {isEditingExisting
                ? t("editLinkTitle")
                : category === "friend"
                  ? t("friendLinksEditor")
                  : t("contactLinksEditor")}
            </h2>
            <p className="admin-card-desc">{t("linkFormHint")}</p>
          </div>
          {isEditingExisting ? (
            <button type="button" className="admin-btn" data-size="sm" data-variant="ghost" onClick={() => startNew()}>
              <X className="h-3.5 w-3.5" />
              {t("cancelEdit")}
            </button>
          ) : null}
        </div>
        <div className="admin-card-body">
          <div className="admin-stack" style={{ gap: 16 }}>
            <label className="admin-field">
              <span className="admin-label">{category === "friend" ? t("friendLinkName") : t("contactLinkName")}</span>
              <input
                className="admin-input"
                value={editing.label}
                onChange={(event) => setEditing({ ...editing, label: event.target.value })}
              />
            </label>

            <label className="admin-field">
              <span className="admin-label">{t("friendLinkUrl")}</span>
              <input
                className="admin-input admin-mono"
                value={editing.url}
                placeholder="https://"
                onChange={(event) => setEditing({ ...editing, url: event.target.value })}
              />
            </label>

            <label className="admin-field">
              <span className="admin-label">
                {category === "friend" ? t("friendLinkImageUrl") : t("contactLinkImageUrl")}
              </span>
              <input
                className="admin-input admin-mono"
                value={editing.imageUrl ?? ""}
                onChange={(event) => setEditing({ ...editing, imageUrl: event.target.value })}
              />
            </label>
            <FilePicker
              accept="image/*"
              onSelect={async (file) => {
                const url = await upload(file);
                if (url) setEditing((prev) => ({ ...prev, imageUrl: url }));
              }}
            />

            <div className="admin-grid">
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
              </div>
            </div>

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
                {saving ? t("working") : t("saveFriendLink")}
              </button>
              {isEditingExisting ? (
                <button type="button" className="admin-btn" data-variant="ghost" onClick={() => startNew()}>
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
