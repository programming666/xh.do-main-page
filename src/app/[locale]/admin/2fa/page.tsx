import { AdminAuthShell } from "@/components/admin/admin-auth-shell";
import { TwoFactorVerifyForm } from "@/components/admin/two-factor-verify-form";

// Admin auth surfaces always render per request: the brand comes from the DB
// and the session decides whether the form is even shown.
export const dynamic = "force-dynamic";

export default async function TwoFactorPage({
  params,
}: {
  params: Promise<{ locale: "zh" | "en" }>;
}) {
  const { locale } = await params;

  return (
    <AdminAuthShell locale={locale}>
      <TwoFactorVerifyForm locale={locale} />
    </AdminAuthShell>
  );
}
