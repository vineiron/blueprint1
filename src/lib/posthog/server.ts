import { PostHog } from "posthog-node";

let client: PostHog | null | undefined;

// Server-side client for error reporting. Flushes on every capture because a
// Vercel function may be frozen right after the response. Returns null when
// the token is missing so callers can bail out cheaply.
export function getPostHogServer(): PostHog | null {
  if (client !== undefined) return client;
  const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  client =
    token && host
      ? new PostHog(token, { host, flushAt: 1, flushInterval: 0 })
      : null;
  return client;
}
