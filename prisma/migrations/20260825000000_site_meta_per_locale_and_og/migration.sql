-- Per-locale metadata & social card columns.
-- The previous global SiteSettings.metaTitle is being dropped; its current value
-- is preserved by copying it into BOTH locales' SiteSettingsTranslation.metaTitle
-- so /zh and /en both keep the tab title the admin set ("550W.个人主页"). Empty
-- string columns intentionally default to NULL so the runtime can chain
-- fallbacks (translation field -> translation.headline -> siteName).

-- Add new columns to SiteSettingsTranslation
ALTER TABLE "SiteSettingsTranslation" ADD COLUMN "metaTitle" TEXT;
ALTER TABLE "SiteSettingsTranslation" ADD COLUMN "metaDescription" TEXT;
ALTER TABLE "SiteSettingsTranslation" ADD COLUMN "ogTitle" TEXT;
ALTER TABLE "SiteSettingsTranslation" ADD COLUMN "ogDescription" TEXT;
ALTER TABLE "SiteSettingsTranslation" ADD COLUMN "twitterTitle" TEXT;
ALTER TABLE "SiteSettingsTranslation" ADD COLUMN "twitterDescription" TEXT;

-- Add new columns to SiteSettings
ALTER TABLE "SiteSettings" ADD COLUMN "ogImageUrl" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN "twitterHandle" TEXT;

-- Migrate the existing global metaTitle value into per-locale metaTitle so
-- nothing visually regresses for either locale. NULL otherwise.
UPDATE "SiteSettingsTranslation"
SET "metaTitle" = (
  SELECT "metaTitle" FROM "SiteSettings" WHERE "id" = 'default'
)
WHERE "siteSettingsId" = 'default';

-- Drop the now-redundant global column
ALTER TABLE "SiteSettings" DROP COLUMN "metaTitle";