import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

function getOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const supabaseOrigin = getOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseRealtimeOrigin = supabaseOrigin?.replace(/^http/, "ws");

// PostHog is reverse-proxied under /ingest so the browser only talks to this
// origin: the CSP stays 'self'-only and content blockers see nothing to block.
// The assets host is the ingest host with "-assets" added, per PostHog's docs.
const posthogHost = getOrigin(process.env.NEXT_PUBLIC_POSTHOG_HOST);
const posthogAssetsHost = posthogHost?.replace(
  ".i.posthog.com",
  "-assets.i.posthog.com",
);

const cspDirectives = [
  ["default-src", "'self'"],
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
  ],
  ["style-src", "'self'", "'unsafe-inline'"],
  ["img-src", "'self'", "blob:", "data:"],
  ["font-src", "'self'", "data:"],
  ["connect-src", "'self'", supabaseOrigin, supabaseRealtimeOrigin].filter(
    Boolean,
  ),
  ["media-src", "'self'"],
  ["worker-src", "'self'", "blob:"],
  ["object-src", "'none'"],
  ["base-uri", "'self'"],
  ["form-action", "'self'"],
  ["frame-src", "'none'"],
  ["frame-ancestors", "'none'"],
  ["manifest-src", "'self'"],
  ...(isDev ? [] : [["upgrade-insecure-requests"]]),
];

const contentSecurityPolicy = cspDirectives
  .map((directive) => directive.join(" "))
  .join("; ");

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "256kb",
    },
  },
  poweredByHeader: false,
  // PostHog endpoints use trailing slashes; without this Next would redirect
  // them and drop the POST body.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    if (!posthogHost || !posthogAssetsHost) return [];
    return [
      {
        source: "/ingest/static/:path*",
        destination: `${posthogAssetsHost}/static/:path*`,
      },
      {
        source: "/ingest/array/:path*",
        destination: `${posthogAssetsHost}/array/:path*`,
      },
      { source: "/ingest/:path*", destination: `${posthogHost}/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
