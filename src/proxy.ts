import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Matches /zh/admin/... and /en/admin/... but excludes the auth entry pages
// (login, 2fa) so unauthenticated visitors can actually reach them.
const ADMIN_PROTECTED = /^\/(zh|en)\/admin(?!\/login(?:\/|$)|\/2fa(?:\/|$))/;

/**
 * When Next.js sits behind a reverse proxy / tunnel (Cloudflare Tunnel, nginx,
 * etc.) and the upstream Host header has no explicit port, NextRequest builds
 * absolute redirect URLs by combining the Host header's hostname with the
 * server's *listening* port. That leaks the internal port `:3000` into
 * client-visible Location headers (e.g. `https://xh.do:3000/zh`).
 *
 * This rewrites the Location header so the redirect targets the same host the
 * client actually used, with no port (HTTPS/HTTP defaults are implied). We
 * never touch redirects that point at localhost / 127.0.0.1 so local dev is
 * unaffected.
 */
function stripUpstreamPort(response: Response, request: NextRequest): Response {
  // Only redirects have a Location to fix.
  const status = response.status;
  if (status !== 301 && status !== 302 && status !== 303 && status !== 307 && status !== 308) {
    return response;
  }

  const location = response.headers.get("location");
  if (!location) return response;

  let target: URL;
  try {
    target = new URL(location);
  } catch {
    // Relative Location — let the browser resolve it against the request.
    return response;
  }

  // Distinguish "proxied" (Cloudflare Tunnel / nginx) from "direct" access.
  // Next.js always injects x-forwarded-host (== host when there's no proxy), so
  // we use x-forwarded-proto === "https" as the reliable proxied signal: a real
  // proxy (Cloudflare) marks the upstream as https; a direct http hit leaves it.
  const forwardedProto = request.headers.get("x-forwarded-proto");
  // Cloudflare marks the upstream as https and adds a cf-ray header. Direct
  // origin hits (http) have neither. Being a bit lenient here only risks
  // keeping a port we might otherwise strip, and never the reverse.
  const proxied = forwardedProto === "https" || request.headers.get("cf-ray") !== null;

  let expectedHost: string;
  if (proxied) {
    // Proxied: use the public hostname the client requested (via x-forwarded-host).
    expectedHost = (request.headers.get("x-forwarded-host") ?? "").split(":")[0]?.toLowerCase() ?? "";
  } else {
    // Direct access: use the Host header the client actually sent, keeping the port.
    expectedHost = request.headers.get("host") ?? "";
  }
  expectedHost = expectedHost.toLowerCase();
  if (!expectedHost) return response;

  // Don't rewrite redirects that intentionally point somewhere else.
  // For direct access we also require the port to match so we don't rewrite an
  // unrelated IP:port redirect.
  if (target.hostname.toLowerCase() !== expectedHost.replace(/:\d+$/, "")) return response;

  // Don't rewrite for local dev.
  if (expectedHost.startsWith("localhost") || expectedHost.startsWith("127.0.0.1")) return response;

  let mutated = false;

  // Promote http -> https when the original request was HTTPS (Cloudflare etc.
  // sets x-forwarded-proto). The default URL constructor will preserve
  // whatever scheme was in the Location, which next-intl inherits from the
  // *internal* http request.
  // forwardedProto was already read above; reuse it here.
  if (forwardedProto === "https" && target.protocol === "http:") {
    target.protocol = "https:";
    mutated = true;
  }
  // Port handling differs by access mode.
  if (proxied) {
    // The client only ever sees the public hostname without a port, so drop any
    // leaked internal port (e.g. `:3000`) that might have leaked into Location.
    if (target.port !== "") {
      target.port = "";
      mutated = true;
    }
  } else {
    // Direct access over a non-default port (e.g. `192.229.85.182:3000`): next-intl
    // produces a Location with NO port, so re-attach the port the client used.
    // Otherwise the browser falls back to 80/443 (and HSTS may push it to https).
    const requestedPort = request.headers.get("host")?.match(/:\d+$/)?.[0]?.slice(1);
    if (requestedPort && requestedPort !== "80" && requestedPort !== "443") {
      target.port = requestedPort;
      mutated = true;
    }
  }
  // Also normalize http(s) port removal: 80/443 omitted from toString() automatically.

  // (Port handling for proxied vs direct access lives in the block above, so the
  // original unconditional "drop any port" logic is no longer needed here.)

  if (mutated) {
    response.headers.set("location", target.toString());
  }
  return response;
}

/**
 * Composite middleware:
 *   1. Defense-in-depth check that rejects requests for admin pages without a
 *      Better Auth session cookie. This is a cheap edge-layer check; the real
 *      session validation still happens server-side in
 *      `requireAdminPage(With2FA)`. It exists so a future admin route that
 *      forgets to call the guard does not silently leak.
 *   2. Delegates locale handling to next-intl as before.
 *   3. Rewrites any redirect Location so the upstream port (e.g. `:3000`)
 *      doesn't leak to clients when behind a reverse proxy. See
 *      `stripUpstreamPort` for details.
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
      return stripUpstreamPort(NextResponse.redirect(loginUrl, 307), request);
    }
  }

  return stripUpstreamPort(intlMiddleware(request), request);
}
export const config = {
  // Exclude Next.js metadata file routes (icon/apple-icon/opengraph-image/
  // twitter-image/sitemap/robots/manifest/favicon) from the next-intl locale
  // rewrite - these MUST live at the site root, not under /[locale]/, otherwise
  // browsers see a 307 redirect to a non-existent /zh/icon (404) and iOS
  // home-screen icons / social-share previews silently break.
  // The default `((?!api|_next|.*\..*).*)` already skips static files via the
  // extension filter, but the metadata routes above don't always have an
  // extension, so we list them explicitly in the negative lookahead.
  matcher: [
    "/",
    "/(zh|en)/:path*",
    "/((?!api|_next|.*\..*|icon|apple-icon|opengraph-image|twitter-image|manifest\\.webmanifest|manifest\\.json|sitemap\\.xml|robots\\.txt|favicon\\.ico).*)",
  ],
};
