import { TwoFactorVerifyForm } from "@/components/admin/two-factor-verify-form";

export default async function TwoFactorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-24">
      <div className="w-full max-w-md">
        <TwoFactorVerifyForm locale={locale} />
      </div>
    </main>
  );
}
