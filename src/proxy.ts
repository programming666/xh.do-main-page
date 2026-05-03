import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Matches /zh/admin/... and /en/admin/... but excludes the auth entry pages
// (login, 2fa) so unauthenticated visitors can actually reach them.
const ADMIN_PROTECTED = /^\/(zh|en)\/admin(?!\/login(?:\/|$)|\/2fa(?:\/|$))/;

/**
 * Composite middleware:
 *   1. Defense-in-depth check that rejects requests for admin pages without a
 *      Better Auth session cookie. This is a cheap edge-layer check; the real
 *      session validation still happens server-side in
 *      `requireAdminPage(With2FA)`. It exists so a future admin route that
 *      forgets to call the guard does not silently leak.
 *   2. Delegates locale handling to next-intl as before.
 */
export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (ADMIN_PROTECTED.test(pathname)) {
    const cookie = getSessionCookie(request);
    if (!cookie) {
      const locale = pathname.split("/")[1] === "en" ? "en" : "zh";
      const loginUrl = new URL(`/${locale}/admin/login`, request.url);
      // Round-trip the original target so we can restore it after login if
      // we ever wire that up; harmless until then.
      if (pathname && pathname !== "/") {
        loginUrl.searchParams.set("next", `${pathname}${search}`);
      }
      return NextResponse.redirect(loginUrl, 307);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/(zh|en)/:path*", "/((?!api|_next|.*\\..*).*)"],
};
