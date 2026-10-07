"use client";

import { useState } from "react";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";

export function TwoFactorVerifyForm({ locale }: { locale: string }) {
  const t = useTranslations("admin");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="admin-form"
      aria-describedby={error ? "twofactor-error" : undefined}
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        const result = await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
        if (result.error) {
          setError(result.error.message ?? t("invalidCode"));
          setLoading(false);
          return;
        }
        window.location.href = `/${locale}/admin/dashboard`;
      }}
    >
      <header className="admin-auth-head">
        <h1>{t("twoFactor")}</h1>
        <p>{t("twoFactorPrompt")}</p>
      </header>
      <label className="admin-field">
        <span className="admin-label">{t("code")}</span>
        <input
          autoComplete="one-time-code"
          inputMode="numeric"
          required
          aria-invalid={error ? "true" : undefined}
          className="admin-input admin-mono"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      {error ? (
        <p id="twofactor-error" role="alert" className="admin-alert" data-variant="error">
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
        <ShieldCheck className="h-4 w-4" />
        {loading ? t("working") : t("continue")}
      </button>
    </form>
  );
}
