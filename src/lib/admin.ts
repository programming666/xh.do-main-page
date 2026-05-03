import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

export const ADMIN_EMAIL = env.ADMIN_EMAIL;

export function isAdminEmail(email?: string | null) {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}

export async function getSessionOrNull() {
  return auth.api.getSession({ headers: await headers() });
}

type SessionPayload = NonNullable<Awaited<ReturnType<typeof getSessionOrNull>>>;

/**
 * Discriminated result for admin guard checks. Callers should pattern-match
 * on `kind` and respond with 401/403/redirect accordingly. The legacy
 * `requireAdminForApi()` boolean form is retained below for any straggler
 * call sites; new code should prefer `resolveAdminGuard()` (used internally
 * by `withAdminApi` in `src/lib/api-guard.ts`).
 */
export type AdminGuardResult =
  | { kind: "ok"; session: SessionPayload }
  | { kind: "unauthenticated" }
  | { kind: "not-admin"; session: SessionPayload }
  | { kind: "needs-2fa"; session: SessionPayload };

export async function resolveAdminGuard(): Promise<AdminGuardResult> {
  const session = await getSessionOrNull();

  if (!session?.user) {
    return { kind: "unauthenticated" };
  }
  if (!isAdminEmail(session.user.email)) {
    return { kind: "not-admin", session };
  }

  // The Prisma `User.twoFactorEnabled` column is nullable+default(false), so
  // we coerce to a strict boolean here.
  const twoFactorEnabled = Boolean(
    (session.user as { twoFactorEnabled?: boolean | null }).twoFactorEnabled,
  );

  if (env.REQUIRE_ADMIN_2FA && !twoFactorEnabled) {
    return { kind: "needs-2fa", session };
  }

  return { kind: "ok", session };
}

/**
 * @deprecated Prefer `resolveAdminGuard()` + `withAdminApi`. Kept for
 * backward compatibility with any code path that still uses the
 * `null | session` shape.
 */
export async function requireAdminForApi() {
  const result = await resolveAdminGuard();
  return result.kind === "ok" ? result.session : null;
}
