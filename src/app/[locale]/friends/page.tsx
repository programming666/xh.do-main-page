import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import NextLink from "next/link";

import { routing, type AppLocale } from "@/i18n/routing";
import { getHomePageData } from "@/lib/site-data";
// ISR: keep the friends page CDN-cacheable while still picking up link
// changes within a minute.
export const revalidate = 60;

export default async function FriendsPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  // Guard invalid locales (e.g. /xxx routing into [locale]) before reading
  // site.translation below, which would otherwise crash on undefined.
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Cache the locale so getTranslations below resolves it without reading the
  // x-next-intl-locale header, letting this public page be statically cached.
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "hero" });
  const { site, friendLinks } = await getHomePageData(locale);

  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-20 pt-24 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-4xl space-y-10">
        <div className="glass-panel rounded-[2rem] px-6 py-10 sm:px-10 sm:py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-accent">xh.do</p>
              <h1 className="mt-3 text-3xl font-semibold">{t("friendLinks")}</h1>
            </div>
            <NextLink
              href={`/${locale}`}
              className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium transition-colors duration-200 ease-out hover:bg-white/5"
            >
              {t("backHome")}
            </NextLink>
          </div>
          
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {friendLinks.length ? friendLinks.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="group flex gap-4 rounded-2xl border border-white/10 bg-black/10 p-5 transition-all duration-200 ease-out hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:shadow-[0_0_24px_rgba(76,201,255,0.12)]"
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.label}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-2xl border border-white/10 object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/10 text-xs text-[color:var(--muted)]">
                    LINK
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  <span className="text-lg font-medium transition-colors duration-200 ease-out group-hover:text-cyan-300">
                    {item.label}
                  </span>
                  <span className="truncate text-sm text-[color:var(--muted)]">
                    {item.url.replace(/^https?:\/\//, "")}
                  </span>
                </div>
              </a>
            )) : (
              <div className="col-span-full rounded-2xl border border-white/10 p-8 text-center text-[color:var(--muted)]">
                {t("emptyFriendLinks")}
              </div>
            )}
          </div>
        </div>

        <footer className="px-2 py-4 text-sm text-[color:var(--muted)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
            <span>
              {site.translation.footerText?.trim()
                ? site.translation.footerText
                : t("footerTagline", { siteName: site.siteName })}
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
