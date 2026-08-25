"use client";

import { useState } from "react";
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
      className="glass-panel space-y-4 rounded-3xl p-8"
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
          setError(result.error.message ?? "登录失败，请检查账号或密码。");
        }
      }}
    >
      <header>
        <h1 className="text-2xl font-semibold">{t("loginTitle")}</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{t("loginHint")}</p>
      </header>
      <label className="block space-y-2">
        <span className="text-sm">{t("email")}</span>
        <input
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          aria-invalid={error ? "true" : undefined}
          aria-label={t("email")}
          placeholder={t("email")}
          className="w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm">{t("password")}</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={error ? "true" : undefined}
          aria-label={t("password")}
          placeholder={t("password")}
          className="w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error ? (
        <p id="login-error" role="alert" className="text-sm text-rose-300">
          {error}
        </p>
      ) : null}
      <button
        className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 disabled:opacity-60"
        type="submit"
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "..." : t("loginTitle")}
      </button>
    </form>
  );
}