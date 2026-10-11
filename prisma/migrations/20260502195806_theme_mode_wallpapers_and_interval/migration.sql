-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SiteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "siteName" TEXT NOT NULL DEFAULT 'xh.do',
    "siteDomain" TEXT NOT NULL DEFAULT 'xh.do',
    "logoMode" TEXT NOT NULL DEFAULT 'url',
    "logoUrl" TEXT,
    "heroMediaType" TEXT NOT NULL DEFAULT 'image',
    "heroMediaMode" TEXT NOT NULL DEFAULT 'url',
    "heroMediaUrl" TEXT,
    "heroMediaPlaylist" TEXT,
    "heroLightImageUrl" TEXT,
    "heroLightPlaylist" TEXT,
    "heroDarkImageUrl" TEXT,
    "heroDarkPlaylist" TEXT,
    "heroImageIntervalMs" INTEGER NOT NULL DEFAULT 4500,
    "heroPosterUrl" TEXT,
    "heroOverlayOpacity" INTEGER NOT NULL DEFAULT 55,
    "heroEffect" TEXT NOT NULL DEFAULT 'scroll-pan',
    "accentColor" TEXT NOT NULL DEFAULT '#4cc9ff',
    "backgroundFallback" TEXT NOT NULL DEFAULT '/uploads/backgrounds/default-grid.jpg',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SiteSettings" ("accentColor", "backgroundFallback", "createdAt", "heroEffect", "heroMediaMode", "heroMediaPlaylist", "heroMediaType", "heroMediaUrl", "heroOverlayOpacity", "heroPosterUrl", "id", "logoMode", "logoUrl", "siteDomain", "siteName", "updatedAt") SELECT "accentColor", "backgroundFallback", "createdAt", "heroEffect", "heroMediaMode", "heroMediaPlaylist", "heroMediaType", "heroMediaUrl", "heroOverlayOpacity", "heroPosterUrl", "id", "logoMode", "logoUrl", "siteDomain", "siteName", "updatedAt" FROM "SiteSettings";
DROP TABLE "SiteSettings";
ALTER TABLE "new_SiteSettings" RENAME TO "SiteSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
