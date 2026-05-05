import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";
import { logAudit, type AuditAction } from "@/lib/audit";

const inner = toNextJsHandler(auth);

/**
 * Map a Better Auth API path to the audit category we want to record.
 * Returns null when the path is not interesting from a security audit view
 * (e.g. /get-session, /list-sessions — those are read-only and noisy).
 */
function categorize(pathname: string): {
  success: AuditAction;
  fail: AuditAction;
} | null {
  if (pathname.includes("/sign-in/")) {
    return { success: "auth.signin.success", fail: "auth.signin.fail" };
  }
  if (pathname.endsWith("/sign-out") || pathname.includes("/sign-out/")) {
    // Sign-out either succeeds or no-ops; we always treat it as one action.
    return { success: "auth.signout", fail: "auth.signout" };
  }
  if (pathname.includes("/two-factor/verify")) {
    return { success: "auth.2fa.success", fail: "auth.2fa.fail" };
  }
  if (pathname.endsWith("/change-password") || pathname.includes("/change-password/")) {
    return {
      success: "auth.password.change.success",
      fail: "auth.password.change.fail",
    };
  }
  return null;
}

async function readEmailHint(request: Request): Promise<string | null> {
  try {
    const clone = request.clone();
    const ct = clone.headers.get("content-type") ?? "";
    if (!ct.includes("application/json")) return null;
    const body = (await clone.json()) as Record<string, unknown> | null;
    const email = body?.email;
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}

async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const category = categorize(url.pathname);

  if (!category) {
    return inner.POST(request);
  }

  const emailHint = await readEmailHint(request);
  let response: Response;
  try {
    response = await inner.POST(request);
  } catch (error) {
    // If Better Auth itself blew up, log it before re-throwing so the failure
    // is observable.
    await logAudit({
      action: category.fail,
      target: url.pathname,
      request,
      actorEmailHint: emailHint,
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }

  await logAudit({
    action: response.ok ? category.success : category.fail,
    target: url.pathname,
    request,
    actorEmailHint: emailHint,
    metadata: { status: response.status },
  });

  return response;
}

export { POST };
export const GET = inner.GET;
