import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { getSessionOrNull, isAdminEmail } from "@/lib/admin";

export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSessionOrNull();

  if (session?.user && isAdminEmail(session.user.email)) {
    redirect(`/${locale}/admin/dashboard`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-24">
      <div className="w-full max-w-md">
        <AdminLoginForm locale={locale} />
      </div>
    </main>
  );
}
