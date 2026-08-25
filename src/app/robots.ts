
export default function robots() {
  const baseUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  // Disallow the entire admin surface from crawlers and explicitly point at
  // the sitemap so search engines can re-discover it after we add locales.
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/api/", "/zh/admin", "/en/admin"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}