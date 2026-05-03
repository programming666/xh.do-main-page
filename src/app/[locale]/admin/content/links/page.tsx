import { AdminShell } from "@/components/admin/admin-shell";
import { FriendLinksManager } from "@/components/admin/friend-links-manager";
import { requireAdminPageWith2FA } from "@/lib/admin-page";
import { prisma } from "@/lib/prisma";

export default async function FriendLinksPage({
  params,
}: {
  params: Promise<{ locale: "zh" | "en" }>;
}) {
  const { locale } = await params;
  await requireAdminPageWith2FA(locale);
  const links = await prisma.socialLink.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return (
    <AdminShell locale={locale}>
      <FriendLinksManager initialLinks={links} />
    </AdminShell>
  );
}
