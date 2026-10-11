-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SiteSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "siteName" TEXT NOT NULL DEFAULT 'xh.do',
    "metaTitle" TEXT,
    "githubUrl" TEXT,
    "logoMode" TEXT NOT NULL DEFAULT 'url',
    "logoUrl" TEXT,
    "showFriendLinks" BOOLEAN NOT NULL DEFAULT true,
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
    "gradientEnabled" BOOLEAN NOT NULL DEFAULT false,
    "gradientStart" TEXT NOT NULL DEFAULT '#1297ff',
    "gradientEnd" TEXT NOT NULL DEFAULT '#7b61ff',
    "gradientAngle" INTEGER NOT NULL DEFAULT 135,
    "backgroundFallback" TEXT NOT NULL DEFAULT '/uploads/backgrounds/default-grid.jpg',
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_SiteSettings" ("accentColor", "backgroundFallback", "createdAt", "githubUrl", "gradientAngle", "gradientEnabled", "gradientEnd", "gradientStart", "heroDarkImageUrl", "heroDarkPlaylist", "heroEffect", "heroImageIntervalMs", "heroLightImageUrl", "heroLightPlaylist", "heroMediaMode", "heroMediaPlaylist", "heroMediaType", "heroMediaUrl", "heroOverlayOpacity", "heroPosterUrl", "id", "logoMode", "logoUrl", "metaTitle", "showFriendLinks", "siteName", "updatedAt") SELECT "accentColor", "backgroundFallback", "createdAt", "githubUrl", "gradientAngle", "gradientEnabled", "gradientEnd", "gradientStart", "heroDarkImageUrl", "heroDarkPlaylist", "heroEffect", "heroImageIntervalMs", "heroLightImageUrl", "heroLightPlaylist", "heroMediaMode", "heroMediaPlaylist", "heroMediaType", "heroMediaUrl", "heroOverlayOpacity", "heroPosterUrl", "id", "logoMode", "logoUrl", "metaTitle", "showFriendLinks", "siteName", "updatedAt" FROM "SiteSettings";
DROP TABLE "SiteSettings";
ALTER TABLE "new_SiteSettings" RENAME TO "SiteSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
