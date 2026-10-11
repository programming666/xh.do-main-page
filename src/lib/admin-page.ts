import { redirect } from "next/navigation";

import type { AppLocale } from "@/i18n/routing";
import { ADMIN_EMAIL, resolveAdminGuard } from "@/lib/admin";

/**
 * Server-component guard for admin pages.
 *
 * - Unauthenticated / non-admin sessions are redirected to /admin/login.
 * - Admin sessions without 2FA enabled are redirected to /admin/security with
 *   a `reason=enable-2fa` flag the page can use to show a banner.
 *
 * Use `requireAdminPage` (not the *With2FA variant) on the security page itself
 * so the admin can actually enable 2FA without being bounced into a redirect
 * loop.
 */
export async function requireAdminPageWith2FA(locale: AppLocale) {
  const result = await resolveAdminGuard();

  if (result.kind === "unauthenticated" || result.kind === "not-admin") {
    redirect(`/${locale}/admin/login`);
  }
  if (result.kind === "needs-2fa") {
    redirect(`/${locale}/admin/security?reason=enable-2fa`);
  }

  return result.session;
}

/**
 * Lighter guard that only enforces "must be admin", letting the caller decide
 * how to handle missing 2FA. Used by `/admin/security` so the admin can
 * bootstrap their TOTP without being redirected to the same page.
 */
export async function requireAdminPage(locale: AppLocale) {
  const result = await resolveAdminGuard();

  if (result.kind === "unauthenticated" || result.kind === "not-admin") {
    redirect(`/${locale}/admin/login`);
  }

  // Both "ok" and "needs-2fa" carry a session; return it so the page can
  // surface a "please enable 2FA" hint if it wishes.
  return result.session;
}

export function getAdminEmail() {
  return ADMIN_EMAIL;
}
