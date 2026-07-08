import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Allow crawling the marketing front door only. Authenticated areas and the
 * unlisted (link-only) public share pages are kept out of search indexes.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/blueprints", "/auth", "/share"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
