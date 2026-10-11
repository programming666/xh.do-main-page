import { ImageResponse } from "next/og";

import { ensureSiteSettings } from "@/lib/site-data";
import { iconInitials, resolveIconLogo } from "@/lib/site-icon";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";
export const dynamic = "force-dynamic";

/**
 * Dynamic favicon, generated from the admin's Logo (Site settings → Brand &
 * identity). There is no static `favicon.ico` in the app any more — the tab
 * icon is always this route, and `/favicon.ico` is redirected to it in
 * `next.config.ts` for clients that only know the classic path.
 *
 * The logo is normalised by `resolveIconLogo` (rasterised, inlined as a data
 * URI) because Satori silently drops SVG sources and cannot fetch from the
 * edge; without it the icon rendered as an empty tile. No logo, or an
 * unreadable one, falls back to the site-name monogram.
 */
export default async function Icon() {
  const site = await ensureSiteSettings();
  const logo = await resolveIconLogo(site.logoUrl, 96);

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
        {logo ? (
          // Numeric dimensions on purpose: Satori rejects string width/height
          // ("Invalid value "48"") and then silently drops the image.
          // eslint-disable-next-line @next/next/no-img-element -- Satori only understands plain <img>
          <img src={logo} alt="" width={48} height={48} style={{ objectFit: "contain" }} />
        ) : (
          <div
            style={{
              fontSize: 28,
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
        // Allow short caches to keep tab nav fast, but force revalidation so a
        // changed `?v=<updatedAt>` URL is honored even if the network layer
        // drops the query for normalization.
        "Cache-Control": "public, max-age=60, must-revalidate",
      },
    },
  );
}
