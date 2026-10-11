-- Additive: SocialLink.category to distinguish friend links from contact links.
-- Default "friend" preserves the existing default for rows created before this.
ALTER TABLE "SocialLink" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'friend';
