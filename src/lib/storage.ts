import { promises as fs } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";

interface KindRule {
  mime: Set<string>;
  ext: Set<string>;
  maxBytes: number;
}

/**
 * Per-`kind` whitelist for uploads. Only what is in this table is allowed
 * through `saveUploadFile`. To add support for a new media type:
 *   1. Add the MIME and lowercase extension to the relevant kind.
 *   2. Bump `maxBytes` if necessary, taking host disk constraints into account.
 *   3. Add the new MIME to any consuming `<img>` / `<video>` whitelists.
 */
const KIND_RULES: Record<string, KindRule> = {
  backgrounds: {
    mime: new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
      "image/avif",
      "video/mp4",
      "video/webm",
    ]),
    ext: new Set([
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".gif",
      ".avif",
      ".mp4",
      ".webm",
    ]),
    maxBytes: 50 * 1024 * 1024,
  },
  logos: {
    mime: new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ]),
    ext: new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]),
    maxBytes: 2 * 1024 * 1024,
  },
  projects: {
    mime: new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/avif",
    ]),
    ext: new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]),
    maxBytes: 8 * 1024 * 1024,
  },
  og: {
    mime: new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/avif",
    ]),
    ext: new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]),
    maxBytes: 10 * 1024 * 1024,
  },
};

/**
 * Custom error class so the API route can map upload validation failures to
 * a 400 instead of a 500. Plain `Error` would be caught by `withAdminApi` and
 * served as a generic 500 with no detail.
 */
export class UploadValidationError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = "UploadValidationError";
  }
}

function sanitizeBaseName(input: string) {
  const cleaned = input.toLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 64) || "asset";
}

function looksLikeMaliciousSvg(text: string): boolean {
  // Normalize: strip comments + CDATA, lowercase. Decoding HTML entities once
  // so that obfuscation like `&#x6a;avascript:` collapses to `javascript:`.
  const normalized = text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .toLowerCase();

  // Tag-level deny list. SVG can host scripted content via several routes
  // beyond <script>: foreignObject lets it embed HTML, <use href> can pull in
  // remote SVG, animate/set can mutate any attribute (including href) at
  // runtime, and <handler>/<listener> are scripted SMIL hooks.
  const dangerousTags = [
    /<\s*script\b/,
    /<\s*foreignobject\b/,
    /<\s*iframe\b/,
    /<\s*embed\b/,
    /<\s*object\b/,
    /<\s*animate\b/,
    /<\s*set\b/,
    /<\s*handler\b/,
    /<\s*listener\b/,
  ];
  for (const re of dangerousTags) {
    if (re.test(normalized)) return true;
  }

  // Inline event handlers (onload, onclick, onmouseover, ...).
  if (/\son[a-z]+\s*=/.test(normalized)) return true;

  // Dangerous URL schemes anywhere they could become a request or executable
  // context. We allow data: in plain text only, never as the value of an
  // attribute that gets fetched/executed.
  const dangerousScheme = /(?:href|xlink:href|src|action|formaction|background|poster|to|from|values|by)\s*=\s*["']?\s*(?:javascript|data|vbscript|file|jar)\s*:/;
  if (dangerousScheme.test(normalized)) return true;

  // Standalone javascript: / vbscript: anywhere (covers stray strings that
  // could be plucked out by SMIL animation values, etc.).
  if (/(?:^|[^a-z0-9])javascript\s*:/.test(normalized)) return true;
  if (/(?:^|[^a-z0-9])vbscript\s*:/.test(normalized)) return true;

  // <style> block with @import or expression() (CSS-based exfil / IE legacy).
  if (/<\s*style\b[\s\S]*?(?:@import|expression\s*\()/.test(normalized)) return true;

  // style="...url(javascript:...)..." inline.
  if (/style\s*=[^>]*url\s*\(\s*["']?\s*(?:javascript|vbscript)\s*:/.test(normalized)) return true;

  // External entities / DTD — block any DOCTYPE referencing a system identifier.
  if (/<!doctype[^>]*\bsystem\b/.test(normalized)) return true;
  if (/<!entity[^>]*\bsystem\b/.test(normalized)) return true;

  return false;
}

export interface SaveUploadResult {
  url: string;
  bytes: number;
  contentType: string;
  kind: string;
}

export async function saveUploadFile(
  file: File,
  kind: string,
): Promise<SaveUploadResult> {
  const rule = KIND_RULES[kind];
  if (!rule) {
    throw new UploadValidationError(`Unsupported upload kind: ${kind}`);
  }

  if (file.size === 0) {
    throw new UploadValidationError("Empty file rejected.");
  }
  if (file.size > rule.maxBytes) {
    const limitMb = (rule.maxBytes / (1024 * 1024)).toFixed(0);
    throw new UploadValidationError(
      `File exceeds the ${limitMb} MB limit for "${kind}" uploads.`,
    );
  }

  const rawExt = path.extname(file.name).toLowerCase();
  if (!rawExt || !rule.ext.has(rawExt)) {
    throw new UploadValidationError(
      `Extension "${rawExt || "(none)"}" is not allowed for "${kind}".`,
    );
  }

  // Browsers sometimes send an empty content-type or generic
  // application/octet-stream for binaries. Allow that only if the extension
  // already matched the whitelist (which it did at this point).
  const reportedMime = (file.type || "").toLowerCase();
  if (
    reportedMime &&
    reportedMime !== "application/octet-stream" &&
    !rule.mime.has(reportedMime)
  ) {
    throw new UploadValidationError(
      `MIME type "${reportedMime}" is not allowed for "${kind}".`,
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (rawExt === ".svg") {
    const text = buffer.toString("utf8");
    if (looksLikeMaliciousSvg(text)) {
      throw new UploadValidationError(
        "SVG appears to contain executable content (script / event handlers). Rejected.",
      );
    }
  }

  const baseName = sanitizeBaseName(path.basename(file.name, path.extname(file.name)));
  const randomSuffix = randomBytes(4).toString("hex");
  const filename = `${Date.now()}-${randomSuffix}-${baseName}${rawExt}`;
  const relativeDir = path.join("public", "uploads", kind);
  const absoluteDir = path.join(process.cwd(), relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });

  const absolutePath = path.join(absoluteDir, filename);
  await fs.writeFile(absolutePath, buffer);

  return {
    url: `/uploads/${kind}/${filename}`,
    bytes: file.size,
    contentType: reportedMime || "application/octet-stream",
    kind,
  };
}
