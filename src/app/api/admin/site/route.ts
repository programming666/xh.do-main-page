import { NextResponse } from "next/server";

import { withAdminApi } from "@/lib/api-guard";
import { logAudit } from "@/lib/audit";
import { ensureSiteSettings } from "@/lib/site-data";
import { prisma } from "@/lib/prisma";
import { siteSettingsPatchSchema, siteSettingsSchema } from "@/lib/validation";

export const GET = withAdminApi(async () => {
  const site = await ensureSiteSettings();
  return NextResponse.json({ site });
});

export const PATCH = withAdminApi(async ({ request, session }) => {
  const raw = await request.json();
  const parsed = siteSettingsPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await ensureSiteSettings();
  const existingTranslations = {
    zh: existing.translations.find((item) => item.locale === "zh"),
    en: existing.translations.find((item) => item.locale === "en"),
  };

  const mergedCandidate = {
    siteName: parsed.data.siteName ?? existing.siteName,
    githubUrl: parsed.data.githubUrl ?? existing.githubUrl,
    ogImageUrl: parsed.data.ogImageUrl ?? existing.ogImageUrl,
    twitterHandle: parsed.data.twitterHandle ?? existing.twitterHandle,
    logoMode: parsed.data.logoMode ?? existing.logoMode,
    logoUrl: parsed.data.logoUrl ?? existing.logoUrl,
    showFriendLinks: parsed.data.showFriendLinks ?? existing.showFriendLinks,
    heroMediaType: parsed.data.heroMediaType ?? existing.heroMediaType,
    heroMediaMode: parsed.data.heroMediaMode ?? existing.heroMediaMode,
    heroMediaUrl: parsed.data.heroMediaUrl ?? existing.heroMediaUrl,
    heroMediaPlaylist: parsed.data.heroMediaPlaylist ?? existing.heroMediaPlaylist,
    heroLightImageUrl: parsed.data.heroLightImageUrl ?? existing.heroLightImageUrl,
    heroLightPlaylist: parsed.data.heroLightPlaylist ?? existing.heroLightPlaylist,
    heroDarkImageUrl: parsed.data.heroDarkImageUrl ?? existing.heroDarkImageUrl,
    heroDarkPlaylist: parsed.data.heroDarkPlaylist ?? existing.heroDarkPlaylist,
    heroImageIntervalMs:
      parsed.data.heroImageIntervalMs ?? existing.heroImageIntervalMs,
    heroPosterUrl: parsed.data.heroPosterUrl ?? existing.heroPosterUrl,
    heroOverlayOpacity:
      parsed.data.heroOverlayOpacity ?? existing.heroOverlayOpacity,
    heroEffect: parsed.data.heroEffect ?? existing.heroEffect,
    heroBackgroundPosition:
      parsed.data.heroBackgroundPosition ?? existing.heroBackgroundPosition,
    heroBackgroundRect:
      parsed.data.heroBackgroundRect ?? existing.heroBackgroundRect,
    accentColor: parsed.data.accentColor ?? existing.accentColor,
    gradientEnabled: parsed.data.gradientEnabled ?? existing.gradientEnabled,
    gradientStart: parsed.data.gradientStart ?? existing.gradientStart,
    gradientEnd: parsed.data.gradientEnd ?? existing.gradientEnd,
    gradientAngle: parsed.data.gradientAngle ?? existing.gradientAngle,
    translations: {
      zh: {
        eyebrow:
          parsed.data.translations?.zh?.eyebrow ??
          existingTranslations.zh?.eyebrow ??
          "",
        headline:
          parsed.data.translations?.zh?.headline ??
          existingTranslations.zh?.headline ??
          "",
        subheadline:
          parsed.data.translations?.zh?.subheadline ??
          existingTranslations.zh?.subheadline ??
          "",
        aboutTitle:
          parsed.data.translations?.zh?.aboutTitle ??
          existingTranslations.zh?.aboutTitle ??
          "",
        aboutBody:
          parsed.data.translations?.zh?.aboutBody ??
          existingTranslations.zh?.aboutBody ??
          "",
        primaryLabel:
          parsed.data.translations?.zh?.primaryLabel ??
          existingTranslations.zh?.primaryLabel ??
          "",
        primaryHref:
          parsed.data.translations?.zh?.primaryHref ??
          existingTranslations.zh?.primaryHref ??
          "",
        secondaryLabel:
          parsed.data.translations?.zh?.secondaryLabel ??
          existingTranslations.zh?.secondaryLabel ??
          "",
        secondaryHref:
          parsed.data.translations?.zh?.secondaryHref ??
          existingTranslations.zh?.secondaryHref ??
          "",
        footerText:
          parsed.data.translations?.zh?.footerText ??
          existingTranslations.zh?.footerText ??
          "",
        metaTitle:
          parsed.data.translations?.zh?.metaTitle ??
          existingTranslations.zh?.metaTitle ??
          null,
        metaDescription:
          parsed.data.translations?.zh?.metaDescription ??
          existingTranslations.zh?.metaDescription ??
          null,
        ogTitle:
          parsed.data.translations?.zh?.ogTitle ??
          existingTranslations.zh?.ogTitle ??
          null,
        ogDescription:
          parsed.data.translations?.zh?.ogDescription ??
          existingTranslations.zh?.ogDescription ??
          null,
        twitterTitle:
          parsed.data.translations?.zh?.twitterTitle ??
          existingTranslations.zh?.twitterTitle ??
          null,
        twitterDescription:
          parsed.data.translations?.zh?.twitterDescription ??
          existingTranslations.zh?.twitterDescription ??
          null,
      },
      en: {
        eyebrow:
          parsed.data.translations?.en?.eyebrow ??
          existingTranslations.en?.eyebrow ??
          "",
        headline:
          parsed.data.translations?.en?.headline ??
          existingTranslations.en?.headline ??
          "",
        subheadline:
          parsed.data.translations?.en?.subheadline ??
          existingTranslations.en?.subheadline ??
          "",
        aboutTitle:
          parsed.data.translations?.en?.aboutTitle ??
          existingTranslations.en?.aboutTitle ??
          "",
        aboutBody:
          parsed.data.translations?.en?.aboutBody ??
          existingTranslations.en?.aboutBody ??
          "",
        primaryLabel:
          parsed.data.translations?.en?.primaryLabel ??
          existingTranslations.en?.primaryLabel ??
          "",
        primaryHref:
          parsed.data.translations?.en?.primaryHref ??
          existingTranslations.en?.primaryHref ??
          "",
        secondaryLabel:
          parsed.data.translations?.en?.secondaryLabel ??
          existingTranslations.en?.secondaryLabel ??
          "",
        secondaryHref:
          parsed.data.translations?.en?.secondaryHref ??
          existingTranslations.en?.secondaryHref ??
          "",
        footerText:
          parsed.data.translations?.en?.footerText ??
          existingTranslations.en?.footerText ??
          "",
        metaTitle:
          parsed.data.translations?.en?.metaTitle ??
          existingTranslations.en?.metaTitle ??
          null,
        metaDescription:
          parsed.data.translations?.en?.metaDescription ??
          existingTranslations.en?.metaDescription ??
          null,
        ogTitle:
          parsed.data.translations?.en?.ogTitle ??
          existingTranslations.en?.ogTitle ??
          null,
        ogDescription:
          parsed.data.translations?.en?.ogDescription ??
          existingTranslations.en?.ogDescription ??
          null,
        twitterTitle:
          parsed.data.translations?.en?.twitterTitle ??
          existingTranslations.en?.twitterTitle ??
          null,
        twitterDescription:
          parsed.data.translations?.en?.twitterDescription ??
          existingTranslations.en?.twitterDescription ??
          null,
      },
    },
  };

  const complete = siteSettingsSchema.safeParse(mergedCandidate);
  if (!complete.success) {
    return NextResponse.json({ error: complete.error.flatten() }, { status: 400 });
  }

  const data = complete.data;
  const site = await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {
      siteName: data.siteName,
      githubUrl: data.githubUrl,
      ogImageUrl: data.ogImageUrl,
      twitterHandle: data.twitterHandle,
      logoMode: data.logoMode,
      logoUrl: data.logoUrl,
      showFriendLinks: data.showFriendLinks,
      heroMediaType: data.heroMediaType,
      heroMediaMode: data.heroMediaMode,
      heroMediaUrl: data.heroMediaUrl,
      heroMediaPlaylist: data.heroMediaPlaylist,
      heroLightImageUrl: data.heroLightImageUrl,
      heroLightPlaylist: data.heroLightPlaylist,
      heroDarkImageUrl: data.heroDarkImageUrl,
      heroDarkPlaylist: data.heroDarkPlaylist,
      heroImageIntervalMs: data.heroImageIntervalMs,
      heroPosterUrl: data.heroPosterUrl,
      heroOverlayOpacity: data.heroOverlayOpacity,
      heroEffect: data.heroEffect,
      heroBackgroundPosition: data.heroBackgroundPosition,
      heroBackgroundRect: data.heroBackgroundRect
        ? JSON.stringify(data.heroBackgroundRect)
        : null,
      accentColor: data.accentColor,
      gradientEnabled: data.gradientEnabled,
      gradientStart: data.gradientStart,
      gradientEnd: data.gradientEnd,
      gradientAngle: data.gradientAngle,
      translations: {
        deleteMany: {},
        create: [
          { locale: "zh", ...data.translations.zh },
          { locale: "en", ...data.translations.en },
        ],
      },
    },
    create: {
      id: "default",
      siteName: data.siteName,
      githubUrl: data.githubUrl,
      ogImageUrl: data.ogImageUrl,
      twitterHandle: data.twitterHandle,
      logoMode: data.logoMode,
      logoUrl: data.logoUrl,
      showFriendLinks: data.showFriendLinks,
      heroMediaType: data.heroMediaType,
      heroMediaMode: data.heroMediaMode,
      heroMediaUrl: data.heroMediaUrl,
      heroMediaPlaylist: data.heroMediaPlaylist,
      heroLightImageUrl: data.heroLightImageUrl,
      heroLightPlaylist: data.heroLightPlaylist,
      heroDarkImageUrl: data.heroDarkImageUrl,
      heroDarkPlaylist: data.heroDarkPlaylist,
      heroImageIntervalMs: data.heroImageIntervalMs,
      heroPosterUrl: data.heroPosterUrl,
      heroOverlayOpacity: data.heroOverlayOpacity,
      heroEffect: data.heroEffect,
      heroBackgroundPosition: data.heroBackgroundPosition,
      heroBackgroundRect: data.heroBackgroundRect
        ? JSON.stringify(data.heroBackgroundRect)
        : null,
      accentColor: data.accentColor,
      gradientEnabled: data.gradientEnabled,
      gradientStart: data.gradientStart,
      gradientEnd: data.gradientEnd,
      gradientAngle: data.gradientAngle,
      translations: {
        create: [
          { locale: "zh", ...data.translations.zh },
          { locale: "en", ...data.translations.en },
        ],
      },
    },
    include: { translations: true },
  });

  await logAudit({
    action: "site.update",
    target: "site:default",
    session,
    request,
  });

  return NextResponse.json({ site });
});
