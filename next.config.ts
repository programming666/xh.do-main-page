import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const COMMON_SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // Safe to send unconditionally; browsers ignore it on plain-HTTP responses.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
] as const;

// Permissive enough that the existing inline scripts/styles emitted by
// Next.js / next-intl / react-compiler keep working (those rely on inline
// hydration data), while still neutering arbitrary remote scripts and
// `javascript:` URIs that may sneak in via stored values.
//
// `frame-ancestors 'none'` does the same job as X-Frame-Options: DENY in
// modern browsers, while X-Frame-Options remains as a fallback header on
// individual /admin routes.
const PAGE_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' https://cdn.xh.do data: blob:",
  "media-src 'self' https://cdn.xh.do blob:",
  "font-src 'self' data:",
  // Cloudflare Web Analytics (`beacon.min.js`) ships from
  // static.cloudflareinsights.com. Whitelisted here so the script (and its
  // accompanying `connect-src` beacon POSTs) aren't blocked by our own CSP.
  // React 19 + react-compiler still emit hydration scripts inline; merging
  // both source lists into a single directive avoids the duplicate-directive
  // warning browsers emit when script-src appears twice in one policy.
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  "connect-src 'self' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "object-src 'none'",
].join("; ");

// Defense-in-depth for /uploads/*: even if a malicious SVG gets past the
// upload sanitizer, this CSP renders it inert when fetched directly as a
// document. Embedding via <img>/<video> is unaffected.
const UPLOADS_CSP = [
  "default-src 'none'",
  "img-src 'self'",
  "style-src 'unsafe-inline'",
  "sandbox",
].join("; ");

const nextConfig: NextConfig = {
  reactCompiler: true,
  devIndicators: false,
  // Strip the X-Powered-By: Next.js header — minor fingerprinting hygiene.
  poweredByHeader: false,
  images: {
    // Cap the srcSet ceiling: project covers render at ≤ ~620px per card,
    // so 1920/2048/3840 candidates only ever get picked by mistake and
    // inflate the mobile payload (Lighthouse saw 4.85 MiB total). The hero
    // is a CSS background (not next/image), so this only governs covers.
    deviceSizes: [640, 750, 828, 1080, 1200, 1536],
    // Next 16 dropped `images.quality` — allowed levels live in `qualities`.
    // [65] makes every optimized image 65%: screenshots look identical and
    // it trims ~15-20% off each payload.
    qualities: [65],
    // Only the dedicated CDN is allowed to serve through next/image's
    // optimizer. `/uploads/*` is local and bypasses remotePatterns.
    // Adding a new host? Mirror the change in `src/lib/validation.ts`
    // (`ALLOWED_MEDIA_HOSTS`).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.xh.do",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...COMMON_SECURITY_HEADERS,
          { key: "Content-Security-Policy", value: PAGE_CSP },
          // Belt-and-suspenders for older browsers that don't honor
          // CSP frame-ancestors.
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Content-Security-Policy", value: UPLOADS_CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Make sure browsers can't be tricked into framing an uploaded
          // SVG and treating it as part of the parent page.
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // Admin surfaces are private; never let intermediaries cache them.
        source: "/:locale(zh|en)/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
