import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { TopNavLink } from "@/components/top-nav-link";
import { routing, type AppLocale } from "@/i18n/routing";
import { getSiteSettings } from "@/lib/site-data";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const site = await getSiteSettings(locale);
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const tabTitle = site.metaTitle?.trim() ? site.metaTitle : site.siteName;
  // Bust favicon cache whenever site settings are saved. Browsers cache
  // favicons aggressively by URL; appending the SiteSettings.updatedAt epoch
  // forces a re-fetch the moment the admin saves a new logo.
  const iconVersion = site.updatedAt.getTime();
  const iconUrl = new URL(`/icon?v=${iconVersion}`, baseUrl).toString();

  return {
    metadataBase: new URL(baseUrl),
    title: tabTitle,
    description: site.translation.subheadline,
    icons: {
      icon: [{ url: iconUrl }],
      apple: [{ url: iconUrl }],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const [messages, site, t] = await Promise.all([
    getMessages(),
    getSiteSettings(locale as AppLocale),
    getTranslations({ locale, namespace: "hero" }),
  ]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider>
        <div className="min-h-screen">
          <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-end px-4 py-4 sm:px-6 lg:px-10">
            <div className="pointer-events-auto flex items-center gap-3">
              <TopNavLink
                locale={locale}
                friendsLabel={t("friendLinks")}
                backHomeLabel={t("backHome")}
                showFriendLinks={site.showFriendLinks}
              />
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </div>
          {children}
        </div>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
