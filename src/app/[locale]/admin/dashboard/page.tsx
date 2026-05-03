import { getTranslations } from "next-intl/server";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPageWith2FA } from "@/lib/admin-page";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: "zh" | "en" }>;
}) {
  const { locale } = await params;
  const session = await requireAdminPageWith2FA(locale);
  const t = await getTranslations({ locale, namespace: "admin" });

  return (
    <AdminShell locale={locale}>
      <section className="glass-panel rounded-3xl p-8">
        <h2 className="text-2xl font-semibold">{t("welcomeBack", { name: session.user.name })}</h2>
        <p className="mt-3 max-w-3xl leading-7 text-[color:var(--muted)]">{t("dashboardIntro")}</p>
      </section>
    </AdminShell>
  );
}
