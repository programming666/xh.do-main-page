import assert from "node:assert/strict";
import { test } from "node:test";
import { derivePalette, contrastRatio } from "../src/lib/adaptive-palette";
import { getCompactedUrl, resolveProgressivePair } from "../src/lib/media-compacted";
import { readAppearance } from "../src/lib/appearance";

function pixels(r: number, g: number, b: number, a = 255) {
  return new Uint8ClampedArray(Array.from({ length: 64 }, () => [r, g, b, a]).flat());
}

test("dark photography gets light readable text and a tinted dark surface", () => {
  const p = derivePalette(pixels(15, 40, 25))!;
  assert.equal(p.tone, "dark");
  assert.ok(contrastRatio(p.foreground, p.background) >= 7);
  assert.ok(contrastRatio(p.accent, p.background) >= 4.5);
});
test("bright photography gets dark readable text", () => {
  const p = derivePalette(pixels(230, 225, 200))!;
  assert.equal(p.tone, "light");
  assert.ok(contrastRatio(p.foreground, p.background) >= 7);
  assert.ok(contrastRatio(p.accent, p.background) >= 4.5);
});
test("image hue affects the palette instead of always using green", () => {
  const red = derivePalette(pixels(180, 30, 40))!;
  const blue = derivePalette(pixels(30, 45, 180))!;
  assert.notEqual(red.background, blue.background);
  assert.notEqual(red.accent, blue.accent);
});
test("transparent and empty images return no palette", () => {
  assert.equal(derivePalette(pixels(0, 0, 0, 0)), null);
  assert.equal(derivePalette(new Uint8ClampedArray()), null);
});
test("extreme and mixed images still produce readable palette colors", () => {
  for (const rgb of [[0, 0, 0], [255, 255, 255], [255, 0, 0], [0, 255, 0], [0, 0, 255], [128, 128, 128]]) {
    const p = derivePalette(pixels(...rgb as [number, number, number]))!;
    assert.ok(contrastRatio(p.foreground, p.background) >= 7);
    assert.ok(contrastRatio(p.accent, p.background) >= 4.5);
  }
});
test("local uploads use their real file instead of nonexistent CDN derivatives", () => {
  assert.equal(getCompactedUrl("/uploads/backgrounds/new.png"), null);
  assert.deepEqual(resolveProgressivePair("/uploads/projects/new.avif"), { low: "/uploads/projects/new.avif", high: "/uploads/projects/new.avif" });
  assert.equal(getCompactedUrl("https://cdn.xh.do/photo.webp"), "https://cdn.xh.do/photo-compacted.avif");
});
test("old appearance records default to hero background and automatic colors", () => {
  const a = readAppearance('{"width":"wide"}');
  assert.equal(a.backgroundSource, "hero");
  assert.equal(a.autoColors, true);
  assert.equal(a.width, "wide");
});
