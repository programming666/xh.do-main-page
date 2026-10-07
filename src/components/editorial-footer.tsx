import { getTranslations } from "next-intl/server";

import type { AppLocale } from "@/i18n/routing";

/**
 * Shared editorial footer for the public pages.
 *
 * There is exactly ONE arrow glyph on a page's bottom area: the big wordmark's
 * `↗`, and it is a working control (jump back to the top of the page) rather
 * than decoration. The earlier markup rendered a decorative `↗` in the section
 * heading *and* another one here, which read as a duplicated, dead affordance.
 */
export async function EditorialFooter({ locale, siteName, footerText }: {
  locale: AppLocale;
  siteName: string;
  footerText?: string | null;
}) {
  const t = await getTranslations({ locale, namespace: "hero" });
  const label = t("backToTop");
  return <footer className="editorial-footer">
    <span>{footerText?.trim() || t("footerTagline", { siteName })}</span>
    <span className="editorial-wordmark">
      <span aria-hidden="true">{siteName}</span>
      {/*
        Anchor (not a button) so it works without JS; `html { scroll-behavior:
        smooth }` in globals.css animates it and the reduced-motion block there
        turns the animation back off. The `#top` target lives on the editorial
        shell in site-chrome.tsx.
      */}
      <a className="editorial-to-top" href="#top" aria-label={label} title={label}>↗</a>
    </span>
  </footer>;
}
