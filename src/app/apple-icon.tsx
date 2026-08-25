/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

import { ensureSiteSettings } from "@/lib/site-data";

export const size = {
  width: 180,
  height: 180,
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

export default async function AppleIcon() {
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
          color: "white",
          overflow: "hidden",
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={site.siteName}
            width="140"
            height="140"
            style={{ objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              fontSize: 80,
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
        "Cache-Control": "public, max-age=60, must-revalidate",
      },
    },
  );
}