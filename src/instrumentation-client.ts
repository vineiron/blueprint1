import posthog from "posthog-js";

// Runs once in the browser before hydration. Without a token this is a no-op,
// so clones and CI send nothing.
//
// Privacy defaults, deliberately: identity lives in localStorage only (no
// cookie), no autocapture of clicks, no session replay, and nobody is ever
// identified, so signed-in users stay anonymous ids here.
const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (token && host) {
  posthog.init(token, {
    api_host: "/ingest",
    ui_host: host.replace(".i.posthog.com", ".posthog.com"),
    defaults: "2026-05-30",
    persistence: "localStorage",
    autocapture: false,
    capture_exceptions: true,
    disable_session_recording: true,
  });
}
