import { AppearanceSettingsForm } from "@/components/admin/appearance-settings-form";
import { requireAdminPageWith2FA } from "@/lib/admin-page";
import { readAppearance } from "@/lib/appearance";
import { ensureSiteSettings } from "@/lib/site-data";

export default async function AppearancePage({ params }: { params: Promise<{ locale: "zh" | "en" }> }) {
  const { locale } = await params;
  await requireAdminPageWith2FA(locale);
  const site = await ensureSiteSettings();
  return <AppearanceSettingsForm initialData={readAppearance(site.appearance)} />;
}
