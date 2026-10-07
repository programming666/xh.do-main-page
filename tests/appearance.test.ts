import assert from "node:assert/strict";
import { test } from "node:test";

import {
  appearanceSchema,
  appearancePatchSchema,
  DEFAULT_APPEARANCE,
  readAppearance,
  mergeAppearance,
  getBackgroundImage,
  visibleSections,
  isVisibleSectionHref,
} from "../src/lib/appearance";
import { siteSettingsPatchSchema } from "../src/lib/validation";

test("legacy empty JSON and corrupt stored settings fall back to editorial defaults", () => {
  for (const raw of [null, "{}", "not json", '{"width":"infinite"}']) {
    assert.deepEqual(readAppearance(raw), DEFAULT_APPEARANCE);
  }
  assert.equal(DEFAULT_APPEARANCE.light.background, "#f4f1e9");
});

test("stored valid appearance survives a round trip", () => {
  const value = mergeAppearance(DEFAULT_APPEARANCE, { width: "wide", light: { imageUrl: "/uploads/backgrounds/paper.avif", mode: "image" } });
  assert.deepEqual(readAppearance(JSON.stringify(value)), value);
});

test("a nested patch preserves the other theme and all unrelated options", () => {
  const value = mergeAppearance(DEFAULT_APPEARANCE, { dark: { imageUrl: "https://images.example.com/night.jpg", mode: "image" }, mediaSide: "left" });
  const patched = mergeAppearance(value, { light: { background: "#ffffff" } });
  assert.deepEqual(patched.dark, value.dark);
  assert.equal(patched.mediaSide, "left");
  assert.equal(patched.light.accent, value.light.accent);
  assert.deepEqual(mergeAppearance(value, undefined), value);
  assert.equal(DEFAULT_APPEARANCE.mediaSide, "right");
});

test("images can be explicitly cleared without restoring the old URL", () => {
  const value = mergeAppearance(DEFAULT_APPEARANCE, { light: { imageUrl: "/uploads/backgrounds/test.png", mode: "image" } });
  const cleared = mergeAppearance(value, { light: { imageUrl: "" } });
  assert.equal(cleared.light.imageUrl, "");
  assert.equal(getBackgroundImage(cleared.light), "none");
});

test("image URLs allow only root-relative or HTTP(S) image sources", () => {
  for (const imageUrl of ["/uploads/backgrounds/test.avif", "https://images.example.com/test.jpg", "http://localhost:3000/paper.png", "https://example.com/image?id=2"]) {
    assert.equal(appearancePatchSchema.safeParse({ light: { imageUrl } }).success, true, imageUrl);
  }
  for (const imageUrl of ["javascript:alert(1)", "data:image/svg+xml,evil", "//evil.com/pic.png", "/\\evil.com/a", "/x\n.png", "https://example.com/movie.MP4?x=1", "/uploads/backgrounds/clip.webm", "file:///tmp/image.png", "https://user:pass@example.com/a.png"]) {
    assert.equal(appearancePatchSchema.safeParse({ light: { imageUrl } }).success, false, imageUrl);
  }
});

test("appearance fields reuse string cleaning but reject malformed colors and numbers", () => {
  const cleaned = appearancePatchSchema.parse({ light: { background: " `#abcdef` ", imageUrl: " `/uploads/a.jpg` " } });
  assert.equal(cleaned.light?.background, "#abcdef");
  assert.equal(cleaned.light?.imageUrl, "/uploads/a.jpg");
  for (const patch of [{ light: { accent: "red" } }, { dark: { background: "#zzzzzz" } }, { light: { overlay: 91 } }, { light: { overlay: -1 } }, { light: { gradientAngle: 361 } }, { width: "huge" }, { mediaRatio: "arbitrary" }]) {
    assert.equal(appearancePatchSchema.safeParse(patch).success, false);
  }
});

test("module order must contain all allowed keys exactly once", () => {
  for (const sectionOrder of [["about", "about", "contact"], ["projects"], ["projects", "about", "unknown"]]) {
    assert.equal(appearancePatchSchema.safeParse({ sectionOrder }).success, false);
  }
  assert.equal(appearancePatchSchema.safeParse({ sectionOrder: ["contact", "about", "projects"] }).success, true);
});

test("visible modules and anchor links follow switches and empty contact content", () => {
  const value = mergeAppearance(DEFAULT_APPEARANCE, { sections: { about: false }, sectionOrder: ["contact", "projects", "about"] });
  assert.deepEqual(visibleSections(value, false), ["projects"]);
  assert.equal(isVisibleSectionHref("#about", value, true), false);
  assert.equal(isVisibleSectionHref("#contact", value, false), false);
  assert.equal(isVisibleSectionHref("#projects", value, false), true);
  assert.equal(isVisibleSectionHref("https://example.com", value, false), true);
});

test("background CSS uses validated values and quotes URLs safely", () => {
  const value = mergeAppearance(DEFAULT_APPEARANCE, { light: { mode: "image", imageUrl: 'https://example.com/a"b.png' } });
  assert.equal(getBackgroundImage(value.light), 'url("https://example.com/a\\"b.png")');
  assert.equal(getBackgroundImage(DEFAULT_APPEARANCE.light), "none");
  const gradient = mergeAppearance(DEFAULT_APPEARANCE, { dark: { mode: "gradient", gradientAngle: 90 } });
  assert.match(getBackgroundImage(gradient.dark), /^linear-gradient\(90deg, #[a-f0-9]{6}, #[a-f0-9]{6}\)$/);
});

test("full schema rejects incomplete settings while site PATCH accepts nested appearance patches", () => {
  assert.equal(appearanceSchema.safeParse({ light: { mode: "solid" } }).success, false);
  const result = siteSettingsPatchSchema.parse({ appearance: { sections: { projects: false } } });
  assert.deepEqual(result.appearance, { sections: { projects: false } });
  assert.equal(siteSettingsPatchSchema.safeParse({ appearance: { light: { imageUrl: "javascript:alert(1)" } } }).success, false);
});
