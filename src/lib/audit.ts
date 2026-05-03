import type { Session, User } from "better-auth/types";

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
  | "admin.error";

export interface LogAuditInput {
  action: AuditAction;
  target?: string | null;
  metadata?: Record<string, unknown> | string | null;
  session?: { user?: Pick<User, "id" | "email"> | null } | { user?: null } | null;
  request?: Request | null;
}

function extractIp(request: Request | null | undefined): string | null {
  if (!request) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be "client, proxy1, proxy2" — take the first hop.
    return forwarded.split(",")[0]?.trim() || null;
  }
  return request.headers.get("x-real-ip");
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
        actorEmail: user?.email ?? null,
        ip: extractIp(input.request ?? null),
        userAgent: input.request?.headers.get("user-agent") ?? null,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write log", error);
  }
}

export type { Session };
