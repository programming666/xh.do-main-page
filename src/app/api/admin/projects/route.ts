import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { withAdminApi } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { projectSchema } from "@/lib/validation";

type ProjectWithTranslations = Prisma.ProjectGetPayload<{
  include: { translations: true };
}>;

function normalize(project: ProjectWithTranslations) {
  const translationMap = Object.fromEntries(
    project.translations.map((item) => [item.locale, item]),
  );

  return {
    id: project.id,
    slug: project.slug,
    coverMode: project.coverMode,
    coverUrl: project.coverUrl ?? "",
    demoUrl: project.demoUrl ?? "",
    repoUrl: project.repoUrl ?? "",
    status: project.status,
    sortOrder: project.sortOrder,
    isFeatured: project.isFeatured,
    isPublished: project.isPublished,
    translations: {
      zh: translationMap.zh,
      en: translationMap.en,
    },
  };
}

export const GET = withAdminApi(async () => {
  const projects = await prisma.project.findMany({
    include: { translations: true },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ projects: projects.map(normalize) });
});

export const POST = withAdminApi(async ({ request, session }) => {
  const raw = await request.json();
  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const project = await prisma.project.create({
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
        create: [
          { locale: "zh", ...data.translations.zh },
          { locale: "en", ...data.translations.en },
        ],
      },
    },
    include: { translations: true },
  });

  await logAudit({
    action: "project.create",
    target: `project:${project.id}`,
    session,
    request,
    metadata: { slug: project.slug },
  });

  return NextResponse.json({ project: normalize(project) });
});
