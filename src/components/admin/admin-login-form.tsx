"use client";

import { useState } from "react";
import { AlertCircle, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";

export function AdminLoginForm({ locale }: { locale: string }) {
  const t = useTranslations("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      method="post"
      noValidate
      aria-describedby={error ? "login-error" : undefined}
      className="admin-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL: `/${locale}/admin/dashboard`,
          rememberMe: true,
        });
        setLoading(false);
        if (result.error) {
          setError(result.error.message ?? t("loginFailed"));
        }
      }}
    >
      <header className="admin-auth-head">
        <h1>{t("loginTitle")}</h1>
        <p>{t("loginHint")}</p>
      </header>
      <label className="admin-field">
        <span className="admin-label">{t("email")}</span>
        <input
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          aria-invalid={error ? "true" : undefined}
          className="admin-input"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <label className="admin-field">
        <span className="admin-label">{t("password")}</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={error ? "true" : undefined}
          className="admin-input"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? (
        <p id="login-error" role="alert" className="admin-alert" data-variant="error">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      ) : null}
      <button
        className="admin-btn admin-btn-block"
        data-variant="primary"
        data-size="lg"
        type="submit"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? t("working") : (
          <>
            <LogIn className="h-4 w-4" />
            {t("loginTitle")}
          </>
        )}
      </button>
    </form>
  );
}
