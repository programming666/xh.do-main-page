/**
 * Centralized environment variable validation.
 *
 * Imported eagerly by `src/lib/auth.ts` so that the application fails fast
 * on misconfiguration instead of silently running with insecure defaults.
 *
 * The auth system in this project relies on these variables being correctly
 * set; missing them previously caused issues like `BETTER_AUTH_SECRET=undefined`
 * (forgeable session cookies) or the default admin email allowing trivial
 * privilege escalation. Treat any failure here as a deployment blocker.
 */

const PRODUCTION = process.env.NODE_ENV === "production";

function fail(message: string): never {
  // Use console.error so the message is visible during `next build` / `next dev`
  // even if a downstream catch swallows the exception.
  console.error(`\n[env] ${message}\n`);
  throw new Error(`[env] ${message}`);
}

function readRequired(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    fail(`Missing required environment variable ${name}.`);
  }
  return value;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  fail(`Environment variable ${name} must be a boolean (true/false), got "${raw}".`);
}

const DATABASE_URL = readRequired("DATABASE_URL");
const BETTER_AUTH_URL = readRequired("BETTER_AUTH_URL");
const BETTER_AUTH_SECRET = readRequired("BETTER_AUTH_SECRET");
const ADMIN_EMAIL = readRequired("ADMIN_EMAIL").trim().toLowerCase();
const REQUIRE_ADMIN_2FA = readBoolean("REQUIRE_ADMIN_2FA", true);
// Whether to trust X-Forwarded-For as the real client IP. Should only be true
// behind a reverse proxy that strips client-supplied XFF headers; otherwise a
// caller can spoof their logged IP and rate-limit bucket.
const TRUST_PROXY = readBoolean("TRUST_PROXY", false);

if (BETTER_AUTH_SECRET.length < 32) {
  fail(
    `BETTER_AUTH_SECRET must be at least 32 characters long ` +
      `(current length: ${BETTER_AUTH_SECRET.length}). ` +
      `Generate one with: openssl rand -base64 48`,
  );
}

if (ADMIN_EMAIL === "admin@xh.do" && PRODUCTION && process.env.NEXT_PHASE !== "phase-production-build") {
  fail(
    `ADMIN_EMAIL is still set to the default placeholder "admin@xh.do" in production. ` +
      `Set it to a real, controlled mailbox before deploying.`,
  );
}

try {
  // Cheap structural sanity check; we do not require a fully-resolvable URL.
  new URL(BETTER_AUTH_URL);
} catch {
  fail(`BETTER_AUTH_URL is not a valid URL: ${BETTER_AUTH_URL}`);
}

export const env = {
  DATABASE_URL,
  BETTER_AUTH_URL,
  BETTER_AUTH_SECRET,
  ADMIN_EMAIL,
  REQUIRE_ADMIN_2FA,
  TRUST_PROXY,
  IS_PRODUCTION: PRODUCTION,
} as const;

export type AppEnv = typeof env;
