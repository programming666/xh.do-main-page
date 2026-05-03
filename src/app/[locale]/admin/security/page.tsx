import { AdminShell } from "@/components/admin/admin-shell";
import { ChangePasswordCard } from "@/components/admin/change-password-card";
import { SecuritySettings } from "@/components/admin/security-settings";
import { requireAdminPage } from "@/lib/admin-page";

export default async function SecurityPage({
  params,
}: {
  params: Promise<{ locale: "zh" | "en" }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale);

  return (
    <AdminShell locale={locale}>
      <div className="space-y-6">
        <SecuritySettings />
        <ChangePasswordCard />
      </div>
    </AdminShell>
  );
}
