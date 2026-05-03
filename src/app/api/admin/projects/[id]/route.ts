import { NextResponse } from "next/server";

import { withAdminApi } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validation";

export const PATCH = withAdminApi<{ id: string }>(async ({ request, params, session }) => {
  const { id } = params;
  const raw = await request.json();
  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const project = await prisma.project.update({
    where: { id },
    data: {
      slug: data.slug,
      coverMode: data.coverMode,
      coverUrl: data.coverUrl,
      demoUrl: data.demoUrl,
      repoUrl: data.repoUrl,
      status: data.status,
      sortOrder: data.sortOrder,
      isFeatured: data.isFeatured,
      isPublished: data.isPublished,
      translations: {
        deleteMany: {},
        create: [
          { locale: "zh", ...data.translations.zh },
          { locale: "en", ...data.translations.en },
        ],
      },
    },
    include: { translations: true },
  });

  await logAudit({
    action: "project.update",
    target: `project:${id}`,
    session,
    request,
    metadata: { slug: project.slug },
  });

  return NextResponse.json({ project });
});

export const DELETE = withAdminApi<{ id: string }>(async ({ request, params, session }) => {
  const { id } = params;
  await prisma.project.delete({ where: { id } });

  await logAudit({
    action: "project.delete",
    target: `project:${id}`,
    session,
    request,
  });

  return NextResponse.json({ ok: true });
});
