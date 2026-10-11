import Image from "next/image";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { EditorialFooter } from "@/components/editorial-footer";
import { Link } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { getHomePageData } from "@/lib/site-data";

export const revalidate = 60;

export default async function FriendsPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "hero" });
  const { site, friendLinks } = await getHomePageData(locale);
  return <main>
    <section className="friends-intro">
      <span className="editorial-kicker">{t("goodCompany")}</span>
      <h1>{t("friendLinks")}</h1>
      <Link className="editorial-text-link" href="/">← {t("backHome")}</Link>
    </section>
    <section className="editorial-friends" aria-label={t("friendLinks")}>
      {friendLinks.length ? friendLinks.map((item, index) => <a className="editorial-friend" key={item.id} href={item.url} target="_blank" rel="noreferrer">
        <span className="editorial-kicker">{String(index + 1).padStart(2, "0")}</span>
        {item.imageUrl ? <Image src={item.imageUrl} alt="" width={64} height={64} unoptimized /> : <span className="friend-monogram" aria-hidden="true">{item.label.slice(0, 1)}</span>}
        <div><h2>{item.label}</h2><p>{item.url.replace(/^https?:\/\//, "")}</p></div><span className="friend-arrow" aria-hidden="true">↗</span>
      </a>) : <p className="editorial-empty">{t("emptyFriendLinks")}</p>}
    </section>
    <EditorialFooter locale={locale} siteName={site.siteName} footerText={site.translation.footerText} />
  </main>;
}
