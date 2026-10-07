import { AdminShell } from "@/components/admin/admin-shell";
import { AppearanceSettingsForm } from "@/components/admin/appearance-settings-form";
import { requireAdminPageWith2FA } from "@/lib/admin-page";
import { ensureSiteSettings } from "@/lib/site-data";
import { readAppearance } from "@/lib/appearance";

export default async function AppearancePage({ params }: { params: Promise<{ locale: "zh" | "en" }> }) {
  const { locale } = await params;
  await requireAdminPageWith2FA(locale);
  const site = await ensureSiteSettings();
  return <AdminShell locale={locale}><AppearanceSettingsForm initialData={readAppearance(site.appearance)} /></AdminShell>;
}
