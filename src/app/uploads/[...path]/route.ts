import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

/**
 * Catch-all route that serves files written to `public/uploads/` by the admin
 * upload API. We deliberately bypass Next.js's built-in static file handling
 * for `/uploads/...` because:
 *
 *   - Files in `public/` are picked up by `next build` only at build time. Any
 *     image uploaded after the production server starts can hit
 *     "received null" / 404 from Next's static file handler depending on the
 *     deployment mode (the issue we ran into in production).
 *   - Routing this through a Node runtime route handler means we read the
 *     bytes off disk on every request, with no static-asset manifest in the
 *     way.
 *
 * The handler also supports HTTP Range requests so video backgrounds in the
 * hero section can seek properly.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

function getContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

/**
 * Resolve the requested path safely under UPLOAD_ROOT. Returns null when the
 * resolved path would escape the upload root (e.g. via `..`). Path segments
 * arrive already URI-decoded by Next.
 */
function resolveSafePath(segments: string[]): string | null {
  if (segments.length === 0) return null;
  if (segments.some((segment) => segment === "" || segment.includes(".."))) {
    return null;
  }
  const joined = path.join(UPLOAD_ROOT, ...segments);
  const resolved = path.resolve(joined);
  // The resolved path must live strictly under UPLOAD_ROOT.
  const rootWithSep = UPLOAD_ROOT.endsWith(path.sep)
    ? UPLOAD_ROOT
    : UPLOAD_ROOT + path.sep;
  if (!resolved.startsWith(rootWithSep)) {
    return null;
  }
  return resolved;
}

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

async function statFile(filePath: string) {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile() ? stat : null;
  } catch {
    return null;
  }
}

function buildBaseHeaders(filePath: string, size: number, mtime: Date) {
  return new Headers({
    "Content-Type": getContentType(filePath),
    "Content-Length": String(size),
    "Last-Modified": mtime.toUTCString(),
    // Uploaded filenames already include `${Date.now()}-${random}-` so the
    // bytes are effectively immutable; cache hard at the edge and client.
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
  });
}

function parseRange(rangeHeader: string, size: number) {
  const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;
  const start = Number(match[1]);
  const end = match[2] === "" ? size - 1 : Number(match[2]);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end >= size ||
    start > end
  ) {
    return null;
  }
  return { start, end };
}

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

export async function GET(request: Request, context: RouteContext) {
  const { path: segments } = await context.params;
  const filePath = resolveSafePath(segments);
  if (!filePath) return notFound();

  const stat = await statFile(filePath);
  if (!stat) return notFound();

  const headers = buildBaseHeaders(filePath, stat.size, stat.mtime);

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const range = parseRange(rangeHeader, stat.size);
    if (!range) {
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${stat.size}` },
      });
    }
    const length = range.end - range.start + 1;
    headers.set("Content-Length", String(length));
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${stat.size}`);
    const nodeStream = createReadStream(filePath, {
      start: range.start,
      end: range.end,
    });
    const webStream = Readable.toWeb(nodeStream) as NodeReadableStream;
    return new Response(webStream as unknown as BodyInit, {
      status: 206,
      headers,
    });
  }

  const nodeStream = createReadStream(filePath);
  const webStream = Readable.toWeb(nodeStream) as NodeReadableStream;
  return new Response(webStream as unknown as BodyInit, {
    status: 200,
    headers,
  });
}

export async function HEAD(request: Request, context: RouteContext) {
  const { path: segments } = await context.params;
  const filePath = resolveSafePath(segments);
  if (!filePath) return notFound();

  const stat = await statFile(filePath);
  if (!stat) return notFound();

  return new Response(null, {
    status: 200,
    headers: buildBaseHeaders(filePath, stat.size, stat.mtime),
  });
}
