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

const localeContentSchema = z.object({
  eyebrow: cleanedRequiredString,
  headline: cleanedRequiredString,
  subheadline: cleanedRequiredString,
  aboutTitle: cleanedRequiredString,
  aboutBody: cleanedRequiredString,
  primaryLabel: cleanedRequiredString,
  primaryHref: cleanedRequiredString,
  secondaryLabel: z.preprocess(normalizeString, z.string().default("")),
  secondaryHref: z.preprocess(normalizeString, z.string().default("")),
  footerText: z.preprocess(normalizeString, z.string().default("")),
});

const translationsSchema = z.object({
  zh: localeContentSchema,
  en: localeContentSchema,
});

export const siteSettingsSchema = z.object({
  siteName: cleanedRequiredString,
  metaTitle: cleanedOptionalString,
  githubUrl: cleanedOptionalString,
  logoMode: z.enum(["url", "upload"]),
  logoUrl: cleanedOptionalString,
  showFriendLinks: z.boolean().default(true),
  heroMediaType: z.enum(["image", "video"]),
  heroMediaMode: z.enum(["url", "upload"]),
  heroMediaUrl: cleanedOptionalString,
  heroMediaPlaylist: cleanedOptionalString,
  heroLightImageUrl: cleanedOptionalString,
  heroLightPlaylist: cleanedOptionalString,
  heroDarkImageUrl: cleanedOptionalString,
  heroDarkPlaylist: cleanedOptionalString,
  heroImageIntervalMs: z.coerce.number().min(1500).max(20000),
  heroPosterUrl: cleanedOptionalString,
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
  coverUrl: cleanedOptionalString,
  demoUrl: cleanedOptionalString,
  repoUrl: cleanedOptionalString,
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
