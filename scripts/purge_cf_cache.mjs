#!/usr/bin/env node
/**
 * Purge the Cloudflare edge cache for the public pages right after a deploy.
 *
 * Next.js sends `Cache-Control: s-maxage=60, stale-while-revalidate=31535940`
 * for prerendered pages. Cloudflare keeps serving the previous build's HTML as
 * a cache HIT inside that (one year) stale window instead of revalidating, so a
 * successful `pm2 restart xhdo` can stay invisible on the plain URLs — while a
 * request with any extra query string (a different cache key) already returns
 * the new build. Run this after every deploy.
 *
 * Environment:
 *   CF_API_TOKEN  API token with Zone -> Cache Purge permission (required)
 *   CF_ZONE_ID    zone id; when unset, the zone is looked up via CF_ZONE_NAME
 *   CF_ZONE_NAME  zone name to look up, defaults to "xh.do"
 *
 * Usage:
 *   node scripts/purge_cf_cache.mjs                # purge the whole zone
 *   node scripts/purge_cf_cache.mjs --urls-only    # purge only the pages below
 *   node scripts/purge_cf_cache.mjs --dry-run      # print the request, call nothing
 *
 * Without CF_API_TOKEN the script prints a warning and exits 0, so it is safe
 * to call unconditionally from an automated deploy.
 */

const API_BASE = "https://api.cloudflare.com/client/v4";

/** Pages that carry the prerendered HTML users land on. */
const PAGE_URLS = [
  "https://xh.do/",
  "https://xh.do/zh",
  "https://xh.do/en",
  "https://xh.do/zh/friends",
  "https://xh.do/en/friends",
];

function parseArgs(argv) {
  const flags = new Set(argv.filter((arg) => arg.startsWith("--")));
  return {
    urlsOnly: flags.has("--urls-only"),
    dryRun: flags.has("--dry-run"),
  };
}

async function cfFetch(path, token, init) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!payload) {
    throw new Error(`Cloudflare returned a non-JSON response (HTTP ${response.status}) at ${path}`);
  }
  if (!payload.success) {
    const detail = (payload.errors ?? [])
      .map((error) => `${error.code ?? "?"} ${error.message ?? "unknown"}`)
      .join("; ");
    throw new Error(`Cloudflare rejected ${path}: ${detail || `HTTP ${response.status}`}`);
  }
  return payload.result;
}

async function resolveZoneId(token, zoneName) {
  const zones = await cfFetch(`/zones?name=${encodeURIComponent(zoneName)}`, token, { method: "GET" });
  const zone = zones?.[0];
  if (!zone?.id) {
    throw new Error(`no zone named ${zoneName} is visible to this token`);
  }
  return zone.id;
}

async function main() {
  const { urlsOnly, dryRun } = parseArgs(process.argv.slice(2));
  const token = process.env.CF_API_TOKEN;
  const zoneName = process.env.CF_ZONE_NAME || "xh.do";
  const body = urlsOnly ? { files: PAGE_URLS } : { purge_everything: true };

  if (!token) {
    console.warn(
      "[purge-cf] CF_API_TOKEN is not set — skipping the purge.\n" +
        "[purge-cf] Cloudflare keeps serving the previous build's HTML on cached URLs " +
        "until someone purges it: export CF_API_TOKEN, or use the Cloudflare dashboard " +
        "(Caching → Configuration → Purge Everything).",
    );
    return;
  }

  const zoneId = process.env.CF_ZONE_ID || (await resolveZoneId(token, zoneName));

  if (dryRun) {
    console.log(`[purge-cf] dry run → POST /zones/${zoneId}/purge_cache ${JSON.stringify(body)}`);
    return;
  }

  const result = await cfFetch(`/zones/${zoneId}/purge_cache`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const purged = urlsOnly ? PAGE_URLS.length : "everything";
  console.log(`[purge-cf] purged ${purged} from zone ${zoneName} (${zoneId})`);
  console.log(JSON.stringify(result));
}

main().catch((error) => {
  console.error(`[purge-cf] ${error.message}`);
  process.exitCode = 1;
});
