import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";

import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { TopNavLink } from "@/components/top-nav-link";
import { routing, type AppLocale } from "@/i18n/routing";
import { getSiteSettings } from "@/lib/site-data";
import { getCompactedUrl, firstFrameUrl } from "@/lib/media-compacted";
import { HERO_INLINE_AVIF } from "@/lib/generated-hero-inline";

import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

  // Populate next-intl's request-scoped locale cache so getMessages() /
  // getTranslations() below resolve the locale without reading the
  // x-next-intl-locale request header (which would force every route into
  // dynamic rendering and kill ISR caching on the public pages).
  setRequestLocale(locale);

  const [messages, site, t, tNoScript] = await Promise.all([
    getMessages(),
    getSiteSettings(locale as AppLocale),
    getTranslations({ locale, namespace: "hero" }),
    getTranslations({ locale, namespace: "noscript" }),
  ]);

  // The hero slide painted on the first render: TechBackground shows the dark
  // stack while the theme is unresolved, so that is the image the browser
  // should start fetching (mirrors its pickStack fallback chain).
  const heroFirstPaint =
    site.heroDarkItems[0] ?? site.heroMediaItems[0] ?? site.heroMediaUrl;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full dark`}
    >
      <head>
        {/*
          Apply the correct theme class before first paint. SSR always renders
          class="dark" (matching the provider's initial state), so without this
          script a light-mode / light-OS visitor would see a dark flash until
          hydration. Reads the stored preference and falls back to the OS
          scheme (adaptive mode) when nothing is stored yet.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("xhdo-theme");var dark=true;if(s==="light"){dark=false}else if(s==="dark"){dark=true}else{dark=window.matchMedia("(prefers-color-scheme: dark)").matches}var d=document.documentElement;d.classList.toggle("dark",dark);d.style.colorScheme=dark?"dark":"light"}catch(e){}})();`,
          }}
        />
        {/* This is supposed to be in the head. ES module boundary. */}
        {heroFirstPaint && !HERO_INLINE_AVIF ? (
          /*
            Preload the twin of the image that is actually painted first — the
            dark stack's first slide (that is the layer visible on the initial
            render, see TechBackground's pickStack), falling back to the
            generic media URL. The old version always preloaded
            `heroMediaUrl`, which is a different (often unused) image once the
            admin configures light/dark stacks, so the high-priority fetch was
            spent on bytes nobody rendered.

            Prefer the thin `-first.avif` twin: it is the layer painted first,
            it is a fraction of the HD bytes, and the HD source still fades in
            afterwards via the progressive hook. When the deploy pipeline
            inlines that slide as a data: URI (HERO_INLINE_AVIF), there is
            nothing to preload — the image is already inside the HTML.
          */
          <link
            rel="preload"
            as="image"
            href={firstFrameUrl(getCompactedUrl(heroFirstPaint) ?? heroFirstPaint)}
            fetchPriority="high"
          />
        ) : null}
      </head>
      <body className="min-h-full bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {/*
            LCP fix: the hero is a CSS background-image set inside a client
            component, so it's not in the initial HTML and is only discovered
            after hydration — starving LCP. Hoisted into <head> by Next.js, this
            preload lets the browser fetch the hero image immediately.
          */}
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
              <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 py-4 sm:px-6 lg:px-10">
                <div className="pointer-events-auto content-shell flex items-center justify-end gap-3">
                  <TopNavLink
                    locale={locale}
                    friendsLabel={t("friendLinks")}
                    backHomeLabel={t("backHome")}
                    showFriendLinks={site.showFriendLinks}
                  />
                  <LocaleSwitcher />
                  <ThemeToggle />
                </div>
              </header>
              {children}
            </div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
