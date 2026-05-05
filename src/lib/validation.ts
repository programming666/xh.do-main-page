import { z } from "zod";

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim().replace(/^`+|`+$/g, "").trim();
  return trimmed === "" ? undefined : trimmed;
}

function normalizeString(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim().replace(/^`+|`+$/g, "").trim();
}

const cleanedRequiredString = z.preprocess(normalizeString, z.string().min(1));
const cleanedOptionalString = z.preprocess(
  normalizeOptionalString,
  z.string().optional().nullable(),
);
const cleanedColor = z.preprocess(normalizeString, z.string().min(4));

/**
 * Allow-list of href schemes that are safe to render as `<a href>`.
 * Crucially does NOT include `javascript:`, `data:`, `vbscript:`, `file:`.
 * `mailto:` and `tel:` are allowed because they're sometimes useful in CTAs.
 */
function isSafeHref(value: string): boolean {
  if (value === "") return true;
  // Anchor / relative paths stay on the same origin and can never be
  // `javascript:` because they don't carry a scheme.
  if (value.startsWith("#")) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const u = new URL(value);
    return (
      u.protocol === "http:" ||
      u.protocol === "https:" ||
      u.protocol === "mailto:" ||
      u.protocol === "tel:"
    );
  } catch {
    return false;
  }
}

/**
 * Allow-list of image / media sources. The site only ever serves media from
 * its own `/uploads/*` static directory or the dedicated CDN. Anything else
 * — including `javascript:`, `data:`, third-party hosts — is rejected.
 *
 * Update this list (and `next.config.ts -> images.remotePatterns`) together
 * if a new media host is introduced.
 */
const ALLOWED_MEDIA_HOSTS = new Set<string>(["cdn.xh.do"]);

function isSafeMediaUrl(value: string): boolean {
  if (value === "") return true;
  if (value.startsWith("/uploads/")) return true;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return false;
    return ALLOWED_MEDIA_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

const SAFE_HREF_MESSAGE =
  "Link must use http(s)/mailto/tel, or be a relative path (/...) or anchor (#...).";
const SAFE_MEDIA_MESSAGE =
  "Media URL must be /uploads/* or https://cdn.xh.do/*.";

const safeHrefRequired = z.preprocess(
  normalizeString,
  z
    .string()
    .min(1)
    .refine(isSafeHref, { message: SAFE_HREF_MESSAGE }),
);

const safeHrefOptional = z.preprocess(
  normalizeOptionalString,
  z
    .string()
    .refine(isSafeHref, { message: SAFE_HREF_MESSAGE })
    .optional()
    .nullable(),
);

const safeMediaOptional = z.preprocess(
  normalizeOptionalString,
  z
    .string()
    .refine(isSafeMediaUrl, { message: SAFE_MEDIA_MESSAGE })
    .optional()
    .nullable(),
);

/**
 * Newline-delimited list of media URLs. Each non-empty line must individually
 * pass `isSafeMediaUrl`. Empty / whitespace-only entries are dropped before
 * validation so users can leave blank lines in the textarea.
 */
const safeMediaPlaylistOptional = z.preprocess(
  normalizeOptionalString,
  z
    .string()
    .refine(
      (raw) =>
        raw
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .every(isSafeMediaUrl),
      { message: SAFE_MEDIA_MESSAGE },
    )
    .optional()
    .nullable(),
);

const localeContentSchema = z.object({
  eyebrow: cleanedRequiredString,
  headline: cleanedRequiredString,
  subheadline: cleanedRequiredString,
  aboutTitle: cleanedRequiredString,
  aboutBody: cleanedRequiredString,
  primaryLabel: cleanedRequiredString,
  primaryHref: safeHrefRequired,
  secondaryLabel: z.preprocess(normalizeString, z.string().default("")),
  secondaryHref: z.preprocess(
    normalizeString,
    z
      .string()
      .default("")
      .refine(isSafeHref, { message: SAFE_HREF_MESSAGE }),
  ),
  footerText: z.preprocess(normalizeString, z.string().default("")),
});

const translationsSchema = z.object({
  zh: localeContentSchema,
  en: localeContentSchema,
});

export const siteSettingsSchema = z.object({
  siteName: cleanedRequiredString,
  metaTitle: cleanedOptionalString,
  githubUrl: safeHrefOptional,
  logoMode: z.enum(["url", "upload"]),
  logoUrl: safeMediaOptional,
  showFriendLinks: z.boolean().default(true),
  heroMediaType: z.enum(["image", "video"]),
  heroMediaMode: z.enum(["url", "upload"]),
  heroMediaUrl: safeMediaOptional,
  heroMediaPlaylist: safeMediaPlaylistOptional,
  heroLightImageUrl: safeMediaOptional,
  heroLightPlaylist: safeMediaPlaylistOptional,
  heroDarkImageUrl: safeMediaOptional,
  heroDarkPlaylist: safeMediaPlaylistOptional,
  heroImageIntervalMs: z.coerce.number().min(1500).max(20000),
  heroPosterUrl: safeMediaOptional,
  heroOverlayOpacity: z.coerce.number().min(0).max(90),
  heroEffect: z.enum(["none", "scroll-pan", "parallax"]),
  accentColor: cleanedColor,
  gradientEnabled: z.boolean().default(false),
  gradientStart: cleanedColor,
  gradientEnd: cleanedColor,
  gradientAngle: z.coerce.number().min(0).max(360),
  translations: translationsSchema,
});

export const siteSettingsPatchSchema = siteSettingsSchema.partial().extend({
  translations: z
    .object({
      zh: localeContentSchema.partial().optional(),
      en: localeContentSchema.partial().optional(),
    })
    .partial()
    .optional(),
});

export const projectSchema = z.object({
  slug: cleanedRequiredString,
  coverMode: z.enum(["url", "upload"]),
  coverUrl: safeMediaOptional,
  demoUrl: safeHrefOptional,
  repoUrl: safeHrefOptional,
  status: cleanedRequiredString,
  sortOrder: z.coerce.number().min(0),
  isFeatured: z.boolean(),
  isPublished: z.boolean(),
  translations: z.object({
    zh: z.object({
      title: cleanedRequiredString,
      summary: cleanedRequiredString,
      description: cleanedRequiredString,
      techStack: cleanedRequiredString
    }),
    en: z.object({
      title: cleanedRequiredString,
      summary: cleanedRequiredString,
      description: cleanedRequiredString,
      techStack: cleanedRequiredString
    })
  })
});

/**
 * Friend / social link schema. Lives here (instead of inline in the route) so
 * the same href/media restrictions are applied as for site settings.
 */
export const socialLinkSchema = z.object({
  platform: z.preprocess(normalizeString, z.string().min(1)).default("friend"),
  label: z.preprocess(normalizeString, z.string().min(1)),
  url: safeHrefRequired,
  imageUrl: safeMediaOptional,
  sortOrder: z.coerce.number().min(0),
  isPublished: z.boolean().default(true),
});
