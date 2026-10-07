"use client";

import Image from "next/image";
import { useState, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { TechBackground, type TechBackgroundProps, type MediaPalette } from "@/components/home/tech-background";
import { getBackgroundImage, type Appearance } from "@/lib/appearance";

type HeroMedia = Omit<TechBackgroundProps, "onPaletteChange" | "presentation" | "adaptiveColors">;

export function SiteChrome({ children, appearance, heroMedia, siteName, logoUrl, showFriendLinks }: {
  children: ReactNode;
  appearance: Appearance;
  heroMedia: HeroMedia;
  siteName: string;
  logoUrl: string | null;
  showFriendLinks: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("hero");
  const { resolvedTheme } = useTheme();
  const [palette, setPalette] = useState<MediaPalette | null>(null);
  if (pathname.startsWith("/admin")) {
    return <><div className="admin-utilities"><Link href="/">{t("backHome")}</Link><LocaleSwitcher /><ThemeToggle /></div>{children}</>;
  }
  const useHero = appearance.backgroundSource === "hero" && appearance.mediaVisible;
  const adaptive = useHero && appearance.autoColors && palette?.theme === resolvedTheme ? palette : null;
  const style = Object.fromEntries((["light", "dark"] as const).flatMap((mode) => {
    const theme = appearance[mode];
    const colors = adaptive?.theme === mode ? adaptive : theme;
    return [
      [`--ed-${mode}-bg`, colors.background],
      [`--ed-${mode}-fg`, colors.foreground],
      [`--ed-${mode}-accent`, colors.accent],
      [`--ed-${mode}-image`, getBackgroundImage(theme)],
      [`--ed-${mode}-overlay`, theme.mode === "image" ? theme.overlay / 100 : 0],
    ];
  })) as CSSProperties;
  return <div id="top" className="editorial" style={style} data-width={appearance.width} data-density={appearance.density}
    data-backdrop={useHero ? "hero" : "custom"} data-palette={adaptive ? "sampled" : "manual"}>
    {useHero ? <div className="editorial-hero-backdrop" aria-hidden="true">
      <TechBackground {...heroMedia} presentation="page" adaptiveColors={appearance.autoColors} onPaletteChange={setPalette} />
      <div className="editorial-hero-wash" style={{ opacity: heroMedia.overlayOpacity / 100 }} />
    </div> : <div className="editorial-backdrop" aria-hidden="true" />}
    <div className="editorial-shell">
      <header className="editorial-nav">
        <Link className="editorial-brand" href="/" aria-label={siteName}>
          {logoUrl ? <Image src={logoUrl} alt="" width={38} height={38} unoptimized /> : null}
          <span>{siteName}</span>
        </Link>
        <nav aria-label={t("navigation")}>
          {appearance.sections.projects ? <Link href="/#projects">{t("work")}</Link> : null}
          {appearance.sections.about ? <Link href="/#about">{t("aboutSection")}</Link> : null}
          {showFriendLinks ? <Link href="/friends" aria-current={pathname === "/friends" ? "page" : undefined}>{t("friendLinks")}</Link> : null}
        </nav>
        <div className="editorial-tools"><LocaleSwitcher /><ThemeToggle /></div>
      </header>
      {children}
    </div>
  </div>;
}
