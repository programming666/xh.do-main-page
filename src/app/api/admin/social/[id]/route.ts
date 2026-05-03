import { NextResponse } from "next/server";
import { z } from "zod";

import { withAdminApi } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim().replace(/^`+|`+$/g, "").trim();
  return trimmed === "" ? undefined : trimmed;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().replace(/^`+|`+$/g, "").trim();
}

const socialSchema = z.object({
  platform: z.preprocess(normalizeString, z.string().min(1)).default("friend"),
  label: z.preprocess(normalizeString, z.string().min(1)),
  url: z.preprocess(normalizeString, z.string().url()),
  imageUrl: z.preprocess(normalizeOptionalString, z.string().optional().nullable()),
  sortOrder: z.coerce.number().min(0),
  isPublished: z.boolean().default(true),
});

export const PATCH = withAdminApi<{ id: string }>(async ({ request, params, session }) => {
  const { id } = params;
  const raw = await request.json();
  const parsed = socialSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const link = await prisma.socialLink.update({
    where: { id },
    data: parsed.data,
  });

  await logAudit({
    action: "social.update",
    target: `social:${id}`,
    session,
    request,
    metadata: { url: link.url, label: link.label },
  });

  return NextResponse.json({ link });
});

export const DELETE = withAdminApi<{ id: string }>(async ({ request, params, session }) => {
  const { id } = params;
  await prisma.socialLink.delete({ where: { id } });

  await logAudit({
    action: "social.delete",
    target: `social:${id}`,
    session,
    request,
  });

  return NextResponse.json({ ok: true });
});
