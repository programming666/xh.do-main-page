import { NextResponse } from "next/server";

import { logAudit } from "@/lib/audit";
import { resolveAdminGuard, type AdminGuardResult } from "@/lib/admin";

type RouteContext<TParams> = { params: Promise<TParams> };

interface AdminHandlerArgs<TParams> {
  request: Request;
  params: TParams;
  session: Extract<AdminGuardResult, { kind: "ok" }>["session"];
}

interface WithAdminApiOptions {
  /**
   * If true, bypass the REQUIRE_ADMIN_2FA enforcement for this route. Use
   * sparingly — only for routes that legitimately need to function before
   * 2FA is enabled (currently: none in this project).
   */
  allowWithout2FA?: boolean;
  /**
   * Tag attached to audit-log denial entries so dashboards can attribute the
   * deny event to a specific surface. Defaults to the URL pathname.
   */
  routeTag?: string;
}

/**
 * Wraps an admin API handler with:
 *   1. Discriminated admin guard (401 / 403 / 403 needs-2fa).
 *   2. Audit logging of denials.
 *   3. Try/catch fallback that converts unexpected errors into JSON 500s
 *      (without leaking stack traces) and writes an `admin.error` entry.
 *
 * Usage:
 *
 *     export const PATCH = withAdminApi<{ id: string }>(async ({ session, request, params }) => {
 *       // ... business logic; admin + 2FA already enforced ...
 *       return NextResponse.json({ ok: true });
 *     });
 */
export function withAdminApi<TParams = Record<string, never>>(
  handler: (args: AdminHandlerArgs<TParams>) => Promise<Response> | Response,
  options: WithAdminApiOptions = {},
) {
  return async function adminRoute(
    request: Request,
    context: RouteContext<TParams>,
  ): Promise<Response> {
    const params = ((await context?.params) ?? ({} as TParams)) as TParams;
    const result = await resolveAdminGuard();
    const target =
      options.routeTag ?? new URL(request.url).pathname + ` ${request.method}`;

    if (result.kind === "unauthenticated") {
      await logAudit({
        action: "admin.deny.unauthenticated",
        target,
        request,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (result.kind === "not-admin") {
      await logAudit({
        action: "admin.deny.not-admin",
        target,
        session: result.session,
        request,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (result.kind === "needs-2fa" && !options.allowWithout2FA) {
      await logAudit({
        action: "admin.deny.needs-2fa",
        target,
        session: result.session,
        request,
      });
      return NextResponse.json(
        {
          error: "two_factor_required",
          message:
            "Two-factor authentication must be enabled before performing admin actions.",
        },
        { status: 403 },
      );
    }

    // For allowWithout2FA routes, the session in `result` may still be the
    // needs-2fa variant; treat it as ok here since the caller opted in.
    const session =
      result.kind === "ok" ? result.session : (result as { session: AdminHandlerArgs<TParams>["session"] }).session;

    try {
      return await handler({ request, params, session });
    } catch (error) {
      console.error(`[admin-api] handler threw for ${target}`, error);
      await logAudit({
        action: "admin.error",
        target,
        session,
        request,
        metadata: {
          message: error instanceof Error ? error.message : String(error),
        },
      });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
