import { ChangePasswordCard } from "@/components/admin/change-password-card";
import { SecuritySettings } from "@/components/admin/security-settings";
import { requireAdminPage } from "@/lib/admin-page";
import { prisma } from "@/lib/prisma";

export default async function SecurityPage({
  params,
}: {
  params: Promise<{ locale: "zh" | "en" }>;
}) {
  const { locale } = await params;
  const session = await requireAdminPage(locale);

  // The light guard lets an admin without TOTP reach this page so they can
  // enable it; the stored row tells the card which action to offer.
  const twoFactor = await prisma.twoFactor.findFirst({ where: { userId: session.user.id } });

  return (
    <div className="admin-stack">
      <SecuritySettings enabled={Boolean(twoFactor?.verified)} />
      <ChangePasswordCard />
    </div>
  );
}
