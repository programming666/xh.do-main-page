"use client";

import QRCode from "react-qr-code";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";

const fieldClassName =
  "w-full rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-foreground outline-none placeholder:text-[color:var(--muted)]";

export function SecuritySettings() {
  const t = useTranslations("admin");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="glass-panel space-y-4 rounded-3xl p-6">
        <h2 className="text-xl font-semibold">{t("twoFactor")}</h2>
        <p className="text-sm text-[color:var(--muted)]">{t("twoFactorDescription")}</p>
        <input type="password" autoComplete="current-password" placeholder={t("password")} className={fieldClassName} value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950"
            onClick={async () => {
              setError(null);
              setMessage(null);
              const result = await authClient.twoFactor.enable({ password });
              if (result.error) {
                setError(result.error.message ?? t("enable2faFailed"));
                return;
              }
              setTotpUri(result.data?.totpURI ?? null);
              setBackupCodes(result.data?.backupCodes ?? []);
              setMessage(t("qrReady"));
            }}
          >
            {t("enable2fa")}
          </button>
          <button
            type="button"
            className="rounded-2xl border border-rose-400/20 px-4 py-3 text-rose-300"
            onClick={async () => {
              const result = await authClient.twoFactor.disable({ password });
              if (result.error) {
                setError(result.error.message ?? t("disable2faFailed"));
                return;
              }
              setTotpUri(null);
              setBackupCodes([]);
              setMessage(t("twoFactorDisabled"));
            }}
          >
            {t("disable2fa")}
          </button>
        </div>
        {totpUri ? (
          <div className="space-y-4 rounded-3xl border border-white/10 bg-black/10 p-5">
            <div className="inline-block rounded-2xl bg-white p-4">
              <QRCode size={180} value={totpUri} />
            </div>
            <input autoComplete="one-time-code" inputMode="numeric" className={fieldClassName} placeholder={t("code")} value={code} onChange={(e) => setCode(e.target.value)} />
            <button
              type="button"
              className="rounded-2xl bg-white/90 px-4 py-3 text-slate-950"
              onClick={async () => {
                const result = await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
                if (result.error) {
                  setError(result.error.message ?? t("invalidCode"));
                  return;
                }
                setMessage(t("verifyComplete"));
              }}
            >
              {t("verifyAndBind")}
            </button>
          </div>
        ) : null}
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      </section>
      <section className="glass-panel rounded-3xl p-6">
        <h3 className="text-lg font-semibold">{t("backupCodes")}</h3>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{t("backupCodesHint")}</p>
        <div className="mt-4 grid gap-2 text-sm">
          {backupCodes.length ? backupCodes.map((item) => (
            <code key={item} className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">{item}</code>
          )) : <span className="text-[color:var(--muted)]">{t("noneGenerated")}</span>}
        </div>
      </section>
    </div>
  );
}
