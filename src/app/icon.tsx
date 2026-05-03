/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

import { ensureSiteSettings } from "@/lib/site-data";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";
export const dynamic = "force-dynamic";

function toAbsoluteUrl(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return new URL(url, base).toString();
}

export default async function Icon() {
  const site = await ensureSiteSettings();
  const logoUrl = toAbsoluteUrl(site.logoUrl);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #03111f 0%, #112446 100%)",
          borderRadius: 18,
          color: "white",
          overflow: "hidden",
          border: "2px solid rgba(76, 201, 255, 0.28)",
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={site.siteName}
            width="48"
            height="48"
            style={{ objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            {site.siteName.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    ),
    {
      ...size,
      headers: {
        // Allow short caches to keep tab nav fast, but force revalidation so a
        // changed `?v=<updatedAt>` URL is honored even if the network layer
        // drops the query for normalization.
        "Cache-Control": "public, max-age=60, must-revalidate",
      },
    },
  );
}
