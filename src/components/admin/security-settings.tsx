"use client";

import QRCode from "react-qr-code";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Copy, KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";

/**
 * TOTP enrolment + backup codes.
 *
 * `enabled` is resolved on the server (the admin's own TwoFactor row) so the
 * card can state the current status and offer the matching action instead of
 * showing "enable" and "disable" side by side with no indication of which one
 * applies.
 */
export function SecuritySettings({ enabled: initialEnabled }: { enabled: boolean }) {
  const t = useTranslations("admin");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="admin-stack">
      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">{t("twoFactor")}</h2>
            <p className="admin-card-desc">{t("twoFactorDescription")}</p>
          </div>
          <span className="admin-badge" data-tone={enabled ? "success" : "warn"}>
            {enabled ? <ShieldCheck className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
            {enabled ? t("twoFactorOn") : t("twoFactorOff")}
          </span>
        </div>
        <div className="admin-card-body">
          <div className="admin-stack" style={{ gap: 16 }}>
            <p className="admin-hint">{enabled ? t("twoFactorOnHint") : t("twoFactorOffHint")}</p>
            <label className="admin-field" style={{ maxWidth: 340 }}>
              <span className="admin-label">{t("password")}</span>
              <input
                type="password"
                autoComplete="current-password"
                className="admin-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <div className="admin-btn-row">
              {enabled ? (
                <button
                  type="button"
                  className="admin-btn"
                  data-variant="danger"
                  disabled={busy}
                  onClick={async () => {
                    setError(null);
                    setMessage(null);
                    setBusy(true);
                    const result = await authClient.twoFactor.disable({ password });
                    setBusy(false);
                    if (result.error) {
                      setError(result.error.message ?? t("disable2faFailed"));
                      return;
                    }
                    setEnabled(false);
                    setTotpUri(null);
                    setBackupCodes([]);
                    setMessage(t("twoFactorDisabled"));
                  }}
                >
                  <ShieldOff className="h-4 w-4" />
                  {t("disable2fa")}
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-btn"
                  data-variant="primary"
                  disabled={busy}
                  onClick={async () => {
                    setError(null);
                    setMessage(null);
                    setBusy(true);
                    const result = await authClient.twoFactor.enable({ password, method: "totp" });
                    setBusy(false);
                    if (result.error) {
                      setError(result.error.message ?? t("enable2faFailed"));
                      return;
                    }
                    if (result.data?.method !== "totp") {
                      setError(t("enable2faFailed"));
                      return;
                    }
                    setTotpUri(result.data.totpURI);
                    setBackupCodes(result.data.backupCodes);
                    setMessage(t("qrReady"));
                  }}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {t("enable2fa")}
                </button>
              )}
            </div>

            {totpUri ? (
              <div className="admin-setup">
                <div className="admin-setup-qr">
                  <QRCode size={168} value={totpUri} />
                </div>
                <div className="admin-stack" style={{ gap: 12 }}>
                  <p className="admin-hint">{t("scanQrHint")}</p>
                  <label className="admin-field">
                    <span className="admin-label">{t("code")}</span>
                    <input
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      className="admin-input admin-mono"
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                    />
                  </label>
                  <div className="admin-btn-row">
                    <button
                      type="button"
                      className="admin-btn"
                      data-variant="primary"
                      disabled={busy}
                      onClick={async () => {
                        setError(null);
                        setMessage(null);
                        setBusy(true);
                        const result = await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
                        setBusy(false);
                        if (result.error) {
                          setError(result.error.message ?? t("invalidCode"));
                          return;
                        }
                        setEnabled(true);
                        setMessage(t("verifyComplete"));
                      }}
                    >
                      <KeyRound className="h-4 w-4" />
                      {t("verifyAndBind")}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

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
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-card-head">
          <div>
            <h2 className="admin-card-title">{t("backupCodes")}</h2>
            <p className="admin-card-desc">{t("backupCodesHint")}</p>
          </div>
          {backupCodes.length ? (
            <button
              type="button"
              className="admin-btn"
              data-size="sm"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(backupCodes.join("\n"));
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                } catch {
                  setError(t("copyFailed"));
                }
              }}
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? t("copied") : t("copyCodes")}
            </button>
          ) : null}
        </div>
        <div className="admin-card-body">
          {backupCodes.length ? (
            <div className="admin-codes">
              {backupCodes.map((item) => (
                <code key={item} className="admin-code">
                  {item}
                </code>
              ))}
            </div>
          ) : (
            <p className="admin-hint">{t("noneGenerated")}</p>
          )}
        </div>
      </section>
    </div>
  );
}
