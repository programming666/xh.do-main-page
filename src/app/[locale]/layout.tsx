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
  // Without this guard, Next.js's RSC chain calls generateMetadata for metadata
  // routes (e.g. /apple-icon, /robots.txt) with `locale = undefined`. The
  // resulting SiteSettings query returns translation=undefined, which then
  // crashes any chained read of translation.* in the body below.
  if (!hasLocale(routing.locales, locale)) {
    return {};
  }
  const site = await getSiteSettings(locale);
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const t = site.translation;
  // Chain: translation field -> translation.headline -> siteName
  const tabTitle = t.metaTitle?.trim() ? t.metaTitle : t.headline || site.siteName;
  const description =
    t.metaDescription?.trim() ||
    t.subheadline ||
    site.siteName;
  // Bust favicon cache whenever site settings are saved. Browsers cache
  // favicons aggressively by URL; appending the SiteSettings.updatedAt epoch
  // forces a re-fetch the moment the admin saves a new logo.
  const iconVersion = site.updatedAt.getTime();
  const iconUrl = new URL(`/icon?v=${iconVersion}`, baseUrl).toString();
  const ogImageUrl = new URL(
    `/opengraph-image?locale=${locale}&v=${iconVersion}`,
    baseUrl,
  ).toString();
  const twitterHandle = site.twitterHandle?.trim();
  const twitterCreator = twitterHandle ? `@${twitterHandle.replace(/^@+/, "")}` : undefined;

  return {
    metadataBase: new URL(baseUrl),
    title: tabTitle,
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        zh: "/zh",
        en: "/en",
        "x-default": "/zh",
      },
    },
    icons: {
      icon: [{ url: iconUrl }],
      apple: [{ url: iconUrl }],
    },
    openGraph: {
      type: "website",
      locale: locale === "zh" ? "zh_CN" : "en_US",
      url: new URL(`/${locale}`, baseUrl).toString(),
      siteName: site.siteName,
      title: t.ogTitle?.trim() || tabTitle,
      description: t.ogDescription?.trim() || description,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: t.ogTitle?.trim() || tabTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t.twitterTitle?.trim() || tabTitle,
      description: t.twitterDescription?.trim() || description,
      images: [ogImageUrl],
      ...(twitterCreator ? { creator: twitterCreator } : {}),
      ...(twitterHandle ? { site: twitterCreator } : {}),
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

  const [messages, site, t, tNoScript] = await Promise.all([
    getMessages(),
    getSiteSettings(locale as AppLocale),
    getTranslations({ locale, namespace: "hero" }),
    getTranslations({ locale, namespace: "noscript" }),
  ]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider>
        <noscript>
          <div className="px-4 pb-4 pt-24 sm:px-6 lg:px-10">
            <div
              role="alert"
              className="rounded-2xl border border-amber-300/40 bg-amber-500/15 px-5 py-4 text-amber-50 shadow-lg backdrop-blur-sm"
            >
              <p className="text-sm font-semibold sm:text-base">
                {tNoScript("title")}
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-100/85 sm:text-sm">
                {tNoScript("description")}
              </p>
            </div>
          </div>
        </noscript>
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
