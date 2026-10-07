"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";

export function ChangePasswordCard() {
  const t = useTranslations("admin");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2 className="admin-card-title">{t("changePassword")}</h2>
          <p className="admin-card-desc">{t("changePasswordHint")}</p>
        </div>
      </div>
      <div className="admin-card-body">
        <form
          className="admin-stack"
          style={{ gap: 16 }}
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
          <div className="admin-grid" data-cols="3">
            <label className="admin-field">
              <span className="admin-label">{t("currentPassword")}</span>
              <input
                type="password"
                autoComplete="current-password"
                className="admin-input"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </label>
            <label className="admin-field">
              <span className="admin-label">{t("newPassword")}</span>
              <input
                type="password"
                autoComplete="new-password"
                className="admin-input"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                minLength={12}
              />
            </label>
            <label className="admin-field">
              <span className="admin-label">{t("confirmPassword")}</span>
              <input
                type="password"
                autoComplete="new-password"
                className="admin-input"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
                minLength={12}
              />
            </label>
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
            <button
              className="admin-btn"
              data-variant="primary"
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
            >
              <KeyRound className="h-4 w-4" />
              {submitting ? t("working") : t("submitChangePassword")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
