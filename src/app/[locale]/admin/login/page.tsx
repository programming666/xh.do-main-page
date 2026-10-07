import { redirect } from "next/navigation";

import { AdminAuthShell } from "@/components/admin/admin-auth-shell";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getSessionOrNull, isAdminEmail } from "@/lib/admin";

// Admin auth surfaces always render per request: the brand comes from the DB
// and the session decides whether the form is even shown.
export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: "zh" | "en" }>;
}) {
  const { locale } = await params;
  const session = await getSessionOrNull();

  if (session?.user && isAdminEmail(session.user.email)) {
    redirect(`/${locale}/admin/dashboard`);
  }

  return (
    <AdminAuthShell locale={locale}>
      <AdminLoginForm locale={locale} />
    </AdminAuthShell>
  );
}
