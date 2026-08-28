-- Additive: SiteSettings.heroBackgroundPosition lets the admin choose which
-- part of a cover-cropped hero image is shown (CSS background-position value).
-- Default "center" preserves the current centered-crop behaviour.
ALTER TABLE "SiteSettings" ADD COLUMN "heroBackgroundPosition" TEXT NOT NULL DEFAULT 'center';
