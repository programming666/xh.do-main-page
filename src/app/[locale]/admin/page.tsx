import { redirect } from "next/navigation";

import { routing } from "@/i18n/routing";

/**
 * /[locale]/admin has no real page — every admin surface lives under
 * /admin/{login,2fa,security,dashboard,content/*}. Hitting /admin directly
 * 404s. We redirect to /admin/dashboard so anything that bookmarked or
 * linked the bare path lands somewhere real (the admin guard in proxy.ts
 * ensures unauthenticated visitors are 307-ed to /admin/login first).
 */
export default async function AdminIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== routing.locales[0] && locale !== routing.locales[1]) {
    redirect(`/${routing.locales[0]}/admin/dashboard`);
  }
  redirect(`/${locale}/admin/dashboard`);
}