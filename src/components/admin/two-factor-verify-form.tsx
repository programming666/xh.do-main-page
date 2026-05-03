"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";

export function TwoFactorVerifyForm({ locale }: { locale: string }) {
  const t = useTranslations("admin");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="glass-panel space-y-4 rounded-3xl p-8"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
        if (result.error) {
          setError(result.error.message ?? "验证码校验失败。");
          return;
        }
        window.location.href = `/${locale}/admin/dashboard`;
      }}
    >
      <h2 className="text-2xl font-semibold">{t("twoFactor")}</h2>
      <p className="text-sm text-[color:var(--muted)]">{t("twoFactorPrompt")}</p>
      <input autoComplete="one-time-code" inputMode="numeric" className="w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3" value={code} onChange={(e) => setCode(e.target.value)} />
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <button className="w-full rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950" type="submit">{t("continue")}</button>
    </form>
  );
}
