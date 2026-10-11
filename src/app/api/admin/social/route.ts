import { NextResponse } from "next/server";

import { withAdminApi } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { socialLinkSchema } from "@/lib/validation";

export const GET = withAdminApi(async () => {
  const links = await prisma.socialLink.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ links });
});

export const POST = withAdminApi(async ({ request, session }) => {
  const raw = await request.json();
  const parsed = socialLinkSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const link = await prisma.socialLink.create({
    data: parsed.data,
  });

  await logAudit({
    action: "social.create",
    target: `social:${link.id}`,
    session,
    request,
    metadata: { url: link.url, label: link.label },
  });

  return NextResponse.json({ link });
});
