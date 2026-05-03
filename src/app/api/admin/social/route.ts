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

export const GET = withAdminApi(async () => {
  const links = await prisma.socialLink.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ links });
});

export const POST = withAdminApi(async ({ request, session }) => {
  const raw = await request.json();
  const parsed = socialSchema.safeParse(raw);
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
