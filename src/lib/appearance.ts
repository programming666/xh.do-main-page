import { z } from "zod";

import { cleanedColor, normalizeString } from "./string-validation";

export const SECTION_KEYS = ["about", "projects", "contact"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

const appearanceColor = cleanedColor.pipe(z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color (#123456)."));

function isBackgroundImageUrl(value: string) {
  if (!value) return true;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return false;
  if (!value.startsWith("/") && !/^https?:\/\//i.test(value)) return false;
  if (value.startsWith("//")) return false;
  try {
    const url = new URL(value, "https://local.invalid");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
    return !/\.(mp4|webm|mov|m4v|ogv|avi|mkv)$/i.test(decodeURIComponent(url.pathname));
  } catch {
    return false;
  }
}

export const backgroundThemeSchema = z.object({
  background: appearanceColor,
  foreground: appearanceColor,
  accent: appearanceColor,
  mode: z.enum(["solid", "gradient", "image"]),
  imageUrl: z.preprocess(normalizeString, z.string().max(2048).refine(isBackgroundImageUrl, "Use a root-relative or HTTP(S) image URL, not a video.")),
  overlay: z.number().int().min(0).max(90),
  gradientStart: appearanceColor,
  gradientEnd: appearanceColor,
  gradientAngle: z.number().int().min(0).max(360),
});

const sectionsSchema = z.object({ about: z.boolean(), projects: z.boolean(), contact: z.boolean() });

export const appearanceSchema = z.object({
  backgroundSource: z.enum(["hero", "custom"]),
  autoColors: z.boolean(),
  light: backgroundThemeSchema,
  dark: backgroundThemeSchema,
  width: z.enum(["compact", "standard", "wide"]),
  density: z.enum(["compact", "relaxed"]),
  mediaVisible: z.boolean(),
  mediaSide: z.enum(["left", "right"]),
  mediaRatio: z.enum(["narrow", "balanced", "wide"]),
  projectStyle: z.enum(["list", "cards"]),
  sections: sectionsSchema,
  sectionOrder: z.array(z.enum(SECTION_KEYS)).length(SECTION_KEYS.length).refine(
    (keys) => new Set(keys).size === SECTION_KEYS.length,
    "Include each section exactly once.",
  ),
});

export const appearancePatchSchema = appearanceSchema.partial().extend({
  light: backgroundThemeSchema.partial().optional(),
  dark: backgroundThemeSchema.partial().optional(),
  sections: sectionsSchema.partial().optional(),
});

export type Appearance = z.infer<typeof appearanceSchema>;
export type AppearancePatch = z.infer<typeof appearancePatchSchema>;
export type BackgroundTheme = z.infer<typeof backgroundThemeSchema>;

export const DEFAULT_APPEARANCE: Appearance = {
  backgroundSource: "hero", autoColors: true,
  light: {
    background: "#f4f1e9", foreground: "#252923", accent: "#526344",
    mode: "solid", imageUrl: "", overlay: 65,
    gradientStart: "#f4f1e9", gradientEnd: "#dde3d2", gradientAngle: 135,
  },
  dark: {
    background: "#181d19", foreground: "#eceee5", accent: "#bacba3",
    mode: "solid", imageUrl: "", overlay: 65,
    gradientStart: "#181d19", gradientEnd: "#2b372b", gradientAngle: 135,
  },
  width: "standard", density: "relaxed", mediaVisible: true, mediaSide: "right",
  mediaRatio: "balanced", projectStyle: "list",
  sections: { about: true, projects: true, contact: true },
  sectionOrder: ["projects", "about", "contact"],
};

export function mergeAppearance(existing: Appearance, patch?: AppearancePatch): Appearance {
  return appearanceSchema.parse({
    ...existing,
    ...patch,
    light: { ...existing.light, ...patch?.light },
    dark: { ...existing.dark, ...patch?.dark },
    sections: { ...existing.sections, ...patch?.sections },
  });
}

export function readAppearance(raw: unknown): Appearance {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    const parsed = appearancePatchSchema.safeParse(value);
    if (parsed.success) return mergeAppearance(DEFAULT_APPEARANCE, parsed.data);
  } catch {
    // Older rows and malformed stored JSON use the same safe editorial default.
  }
  return appearanceSchema.parse(DEFAULT_APPEARANCE);
}

export function getBackgroundImage(theme: BackgroundTheme): string {
  if (theme.mode === "gradient") {
    return `linear-gradient(${theme.gradientAngle}deg, ${theme.gradientStart}, ${theme.gradientEnd})`;
  }
  if (theme.mode === "image" && theme.imageUrl) {
    return `url(${JSON.stringify(theme.imageUrl)})`;
  }
  return "none";
}

export function visibleSections(appearance: Appearance, hasContacts: boolean): SectionKey[] {
  return appearance.sectionOrder.filter((key) => appearance.sections[key] && (key !== "contact" || hasContacts));
}

export function isVisibleSectionHref(href: string, appearance: Appearance, hasContacts: boolean): boolean {
  const section = href.replace(/^#/, "") as SectionKey;
  return !href.startsWith("#") || !SECTION_KEYS.includes(section) || visibleSections(appearance, hasContacts).includes(section);
}
