import { AdminShell } from "@/components/admin/admin-shell";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";
import { requireAdminPageWith2FA } from "@/lib/admin-page";
import { ensureSiteSettings } from "@/lib/site-data";

export default async function SiteSettingsPage({
  params,
}: {
  params: Promise<{ locale: "zh" | "en" }>;
}) {
  const { locale } = await params;
  await requireAdminPageWith2FA(locale);
  const site = await ensureSiteSettings();
  const zh = site.translations.find((item) => item.locale === "zh");
  const en = site.translations.find((item) => item.locale === "en");

  return (
    <AdminShell locale={locale}>
      <SiteSettingsForm
        initialData={{
          siteName: site.siteName,
          githubUrl: site.githubUrl ?? "",
          ogImageUrl: site.ogImageUrl ?? "",
          twitterHandle: site.twitterHandle ?? "",
          logoMode: site.logoMode as "url" | "upload",
          logoUrl: site.logoUrl ?? "",
          translations: {
            zh: {
              eyebrow: zh?.eyebrow ?? "",
              headline: zh?.headline ?? "",
              subheadline: zh?.subheadline ?? "",
              aboutTitle: zh?.aboutTitle ?? "",
              aboutBody: zh?.aboutBody ?? "",
              primaryLabel: zh?.primaryLabel ?? "",
              primaryHref: zh?.primaryHref ?? "",
              secondaryLabel: zh?.secondaryLabel ?? "",
              secondaryHref: zh?.secondaryHref ?? "",
              footerText: zh?.footerText ?? "",
              metaTitle: zh?.metaTitle ?? "",
              metaDescription: zh?.metaDescription ?? "",
              ogTitle: zh?.ogTitle ?? "",
              ogDescription: zh?.ogDescription ?? "",
              twitterTitle: zh?.twitterTitle ?? "",
              twitterDescription: zh?.twitterDescription ?? "",
            },
            en: {
              eyebrow: en?.eyebrow ?? "",
              headline: en?.headline ?? "",
              subheadline: en?.subheadline ?? "",
              aboutTitle: en?.aboutTitle ?? "",
              aboutBody: en?.aboutBody ?? "",
              primaryLabel: en?.primaryLabel ?? "",
              primaryHref: en?.primaryHref ?? "",
              secondaryLabel: en?.secondaryLabel ?? "",
              secondaryHref: en?.secondaryHref ?? "",
              footerText: en?.footerText ?? "",
              metaTitle: en?.metaTitle ?? "",
              metaDescription: en?.metaDescription ?? "",
              ogTitle: en?.ogTitle ?? "",
              ogDescription: en?.ogDescription ?? "",
              twitterTitle: en?.twitterTitle ?? "",
              twitterDescription: en?.twitterDescription ?? "",
            },
          },
        }}
      />
    </AdminShell>
  );
}
