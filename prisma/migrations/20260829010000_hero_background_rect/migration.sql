-- Additive: SiteSettings.heroBackgroundRect stores a JSON crop rectangle
-- ({x,y,w,h}, all 0..1 relative to the source image) picked by the admin in
-- the background-settings crop picker. NULL means "whole image centered"
-- (falls back to heroBackgroundPosition). Pure additive, no reset risk.
ALTER TABLE "SiteSettings" ADD COLUMN "heroBackgroundRect" TEXT;
