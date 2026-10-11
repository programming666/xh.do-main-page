-- Additive: per-image hero crop regions (JSON map url → {x,y,w,h}).
ALTER TABLE "SiteSettings" ADD COLUMN "heroBackgroundRects" TEXT;
