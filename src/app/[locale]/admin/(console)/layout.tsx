import { AdminShell } from "@/components/admin/admin-shell";
import type { AppLocale } from "@/i18n/routing";
import { requireAdminPage } from "@/lib/admin-page";
import { ensureSiteSettings } from "@/lib/site-data";

/**
 * Chrome for every console page (dashboard, content/*, security).
 *
 * The route group keeps `/admin/login` and `/admin/2fa` out of this layout —
 * they render their own standalone auth shell.
 *
 * This is the *light* guard: it only enforces "must be an admin". Each page
 * still calls `requireAdminPageWith2FA`, so `/admin/security` (which must stay
 * reachable so 2FA can be enabled) can opt out of the redirect loop. Having the
 * check here too means a future page that forgets its own guard is still
 * protected and still gets a console to render into.
 */
export default async function AdminConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdminPage(locale as AppLocale);
  const site = await ensureSiteSettings();

  return (
    <AdminShell locale={locale} siteName={site.siteName} logoUrl={site.logoUrl}>
      {children}
    </AdminShell>
  );
}
