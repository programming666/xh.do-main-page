import type { Session, User } from "better-auth/types";

import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/**
 * Action codes used in `AuditLog.action`. Keep this list small and stable;
 * downstream filters / dashboards pivot on these strings.
 */
export type AuditAction =
  | "site.update"
  | "project.create"
  | "project.update"
  | "project.delete"
  | "social.create"
  | "social.update"
  | "social.delete"
  | "upload"
  | "admin.deny.unauthenticated"
  | "admin.deny.not-admin"
  | "admin.deny.needs-2fa"
  | "admin.error"
  // Authentication events emitted by the audited /api/auth/[...all] wrapper.
  | "auth.signin.success"
  | "auth.signin.fail"
  | "auth.signout"
  | "auth.2fa.success"
  | "auth.2fa.fail"
  | "auth.password.change.success"
  | "auth.password.change.fail";

export interface LogAuditInput {
  action: AuditAction;
  target?: string | null;
  metadata?: Record<string, unknown> | string | null;
  session?: { user?: Pick<User, "id" | "email"> | null } | { user?: null } | null;
  /**
   * When the request has no authenticated session yet (failed sign-in,
   * pre-2FA verify, etc.) the route can pass the email it received in the
   * request body so the audit row still has an actor to attribute to.
   * Length-capped to avoid log poisoning.
   */
  actorEmailHint?: string | null;
  request?: Request | null;
}

/**
 * Resolve the client IP from a request.
 *
 * X-Forwarded-For is forgeable by any client unless we know an upstream proxy
 * has stripped it. We require an explicit env opt-in (`TRUST_PROXY=true`)
 * before we attribute the first XFF hop to the caller.
 */
function extractIp(request: Request | null | undefined): string | null {
  if (!request) return null;
  if (env.TRUST_PROXY) {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0]?.trim() || null;
    }
    return request.headers.get("x-real-ip");
  }
  // Without a trusted proxy, do not pretend we know the client IP.
  return null;
}

function serializeMetadata(metadata: LogAuditInput["metadata"]): string | null {
  if (metadata == null) return null;
  if (typeof metadata === "string") return metadata.slice(0, 4000);
  try {
    const json = JSON.stringify(metadata);
    return json.length > 4000 ? `${json.slice(0, 3997)}...` : json;
  } catch {
    return null;
  }
}

function clampEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const trimmed = email.trim();
  if (!trimmed) return null;
  // Defensive cap: emails > 320 chars are spec-violating; longer values in an
  // audit row are almost certainly noise / log-injection probes.
  return trimmed.slice(0, 320);
}

/**
 * Best-effort audit log writer. Never throws — audit failure must not break
 * the user-facing operation. Errors are funneled to console.error.
 */
export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    const session = input.session ?? null;
    const user = session && "user" in session ? session.user ?? null : null;

    await prisma.auditLog.create({
      data: {
        action: input.action,
        target: input.target ?? null,
        metadata: serializeMetadata(input.metadata),
        actorId: user?.id ?? null,
        actorEmail: clampEmail(user?.email ?? input.actorEmailHint ?? null),
        ip: extractIp(input.request ?? null),
        userAgent: input.request?.headers.get("user-agent")?.slice(0, 500) ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write log", error);
  }
}

export type { Session };
