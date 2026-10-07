/* eslint-disable @next/next/no-img-element -- Satori only understands plain <img> */
import { ImageResponse } from "next/og";

import { ensureSiteSettings } from "@/lib/site-data";
import { iconInitials, resolveIconLogo } from "@/lib/site-icon";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";
export const dynamic = "force-dynamic";

/**
 * iOS home-screen icon, same source as the favicon: the admin's Logo,
 * normalised into a data URI by `resolveIconLogo` (Satori cannot paint an SVG
 * or fetch a remote file), with the site-name monogram as the fallback.
 */
export default async function AppleIcon() {
  const site = await ensureSiteSettings();
  const logo = await resolveIconLogo(site.logoUrl, 280);

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
        {logo ? (
          <img src={logo} alt="" width={140} height={140} style={{ objectFit: "contain" }} />
        ) : (
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              letterSpacing: "0.08em",
            }}
          >
            {iconInitials(site.siteName)}
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
