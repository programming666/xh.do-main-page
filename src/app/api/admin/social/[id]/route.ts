import { NextResponse } from "next/server";

import { withAdminApi } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { socialLinkSchema } from "@/lib/validation";

export const PATCH = withAdminApi<{ id: string }>(async ({ request, params, session }) => {
  const { id } = params;
  const raw = await request.json();
  const parsed = socialLinkSchema.safeParse(raw);
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
