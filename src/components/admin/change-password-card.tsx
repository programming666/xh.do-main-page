"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";

const fieldClassName =
  "w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-foreground outline-none placeholder:text-[color:var(--muted)]";

export function ChangePasswordCard() {
  const t = useTranslations("admin");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="glass-panel space-y-4 rounded-3xl p-6">
      <div>
        <h2 className="text-xl font-semibold">{t("changePassword")}</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          {t("changePasswordHint")}
        </p>
      </div>
      <form
        className="grid gap-3 md:grid-cols-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);

          if (newPassword.length < 12) {
            setError(t("passwordTooShort"));
            return;
          }
          if (newPassword !== confirm) {
            setError(t("passwordMismatch"));
            return;
          }
          if (newPassword === currentPassword) {
            setError(t("passwordSameAsCurrent"));
            return;
          }

          setSubmitting(true);
          const result = await authClient.changePassword({
            currentPassword,
            newPassword,
            revokeOtherSessions: true,
          });
          setSubmitting(false);

          if (result.error) {
            setError(result.error.message ?? t("changePasswordFailed"));
            return;
          }

          setMessage(t("passwordChanged"));
          setCurrentPassword("");
          setNewPassword("");
          setConfirm("");
        }}
      >
        <input
          type="password"
          autoComplete="current-password"
          placeholder={t("currentPassword")}
          className={fieldClassName}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder={t("newPassword")}
          className={fieldClassName}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={12}
        />
        <input
          type="password"
          autoComplete="new-password"
          placeholder={t("confirmPassword")}
          className={fieldClassName}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={12}
        />
        <div className="md:col-span-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 disabled:opacity-60"
          >
            {submitting ? "..." : t("submitChangePassword")}
          </button>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
        </div>
      </form>
    </section>
  );
}
