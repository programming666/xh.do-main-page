export type AdaptivePalette = {
  background: string;
  foreground: string;
  accent: string;
  tone: "light" | "dark";
};

type RGB = [number, number, number];
const mix = (a: RGB, b: RGB, weight: number): RGB => a.map((v, i) => Math.round(v * (1 - weight) + b[i] * weight)) as RGB;
const hex = (rgb: RGB) => `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
const rgb = (color: string): RGB => [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16)) as RGB;

function luminance(color: RGB) {
  const linear = color.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

export function contrastRatio(a: string, b: string) {
  const l1 = luminance(rgb(a));
  const l2 = luminance(rgb(b));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** A tiny, quantized sample is enough; no full-resolution pixel traversal. */
export function derivePalette(pixels: Uint8ClampedArray): AdaptivePalette | null {
  const bins = new Map<number, { sum: RGB; count: number }>();
  const sum: RGB = [0, 0, 0];
  let count = 0;
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const color: RGB = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const key = (color[0] >> 4) * 256 + (color[1] >> 4) * 16 + (color[2] >> 4);
    const bin = bins.get(key) ?? { sum: [0, 0, 0] as RGB, count: 0 };
    for (let channel = 0; channel < 3; channel++) {
      bin.sum[channel] += color[channel];
      sum[channel] += color[channel];
    }
    bin.count++; count++;
    bins.set(key, bin);
  }
  if (!count) return null;
  const average = sum.map((v) => Math.round(v / count)) as RGB;
  const tone = luminance(average) > 0.35 ? "light" : "dark";
  let dominant = average;
  let bestScore = -1;
  for (const bin of bins.values()) {
    const color = bin.sum.map((v) => Math.round(v / bin.count)) as RGB;
    const chroma = (Math.max(...color) - Math.min(...color)) / 255;
    const score = bin.count * (0.2 + chroma);
    if (score > bestScore) { dominant = color; bestScore = score; }
  }
  const background = hex(mix(dominant, tone === "light" ? [255, 255, 255] : [0, 0, 0], tone === "light" ? 0.92 : 0.82));
  const foreground = tone === "light" ? "#151915" : "#f5f7f3";
  let accent = dominant;
  // Preserve the source hue where possible, then move toward readable text.
  for (let i = 0; i < 24 && contrastRatio(hex(accent), background) < 4.5; i++) {
    accent = mix(accent, rgb(foreground), 0.15);
  }
  return { background, foreground, accent: hex(accent), tone };
}
