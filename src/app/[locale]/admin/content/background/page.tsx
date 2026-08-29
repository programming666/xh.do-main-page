import { AdminShell } from "@/components/admin/admin-shell";
import { BackgroundSettingsForm } from "@/components/admin/background-settings-form";
import { requireAdminPageWith2FA } from "@/lib/admin-page";
import { ensureSiteSettings } from "@/lib/site-data";

export default async function BackgroundSettingsPage({
  params,
}: {
  params: Promise<{ locale: "zh" | "en" }>;
}) {
  const { locale } = await params;
  await requireAdminPageWith2FA(locale);
  const site = await ensureSiteSettings();

  return (
    <AdminShell locale={locale}>
      <BackgroundSettingsForm
        initialData={{
          showFriendLinks: site.showFriendLinks,
          accentColor: site.accentColor,
          gradientEnabled: site.gradientEnabled,
          gradientStart: site.gradientStart,
          gradientEnd: site.gradientEnd,
          gradientAngle: site.gradientAngle,
          heroMediaType: site.heroMediaType as "image" | "video",
          heroMediaMode: site.heroMediaMode as "url" | "upload",
          heroMediaUrl: site.heroMediaUrl ?? "",
          heroMediaPlaylist: site.heroMediaPlaylist ?? "",
          heroLightImageUrl: site.heroLightImageUrl ?? "",
          heroLightPlaylist: site.heroLightPlaylist ?? "",
          heroDarkImageUrl: site.heroDarkImageUrl ?? "",
          heroDarkPlaylist: site.heroDarkPlaylist ?? "",
          heroImageIntervalMs: site.heroImageIntervalMs,
          heroPosterUrl: site.heroPosterUrl ?? "",
          heroOverlayOpacity: site.heroOverlayOpacity,
          heroEffect: site.heroEffect as "none" | "scroll-pan" | "parallax",
          heroBackgroundPosition: site.heroBackgroundPosition ?? "center",
          heroBackgroundRect: site.heroBackgroundRect ?? null,
          heroBackgroundRects: site.heroBackgroundRects ?? null,
        }}
      />
    </AdminShell>
  );
}
