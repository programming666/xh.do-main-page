import { AdminShell } from "@/components/admin/admin-shell";
import { ProjectManager } from "@/components/admin/project-manager";
import { requireAdminPageWith2FA } from "@/lib/admin-page";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: "zh" | "en" }>;
}) {
  const { locale } = await params;
  await requireAdminPageWith2FA(locale);
  const projects = await prisma.project.findMany({
    include: { translations: true },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const formatted = projects.map((project) => ({
    id: project.id,
    slug: project.slug,
    coverMode: project.coverMode as "url" | "upload",
    coverUrl: project.coverUrl ?? "",
    demoUrl: project.demoUrl ?? "",
    repoUrl: project.repoUrl ?? "",
    status: project.status,
    sortOrder: project.sortOrder,
    isFeatured: project.isFeatured,
    isPublished: project.isPublished,
    translations: {
      zh: project.translations.find((item) => item.locale === "zh")!,
      en: project.translations.find((item) => item.locale === "en")!,
    },
  }));

  return (
    <AdminShell locale={locale}>
      <ProjectManager initialProjects={formatted} />
    </AdminShell>
  );
}
