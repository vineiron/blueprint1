import type { Instrumentation } from "next";

// Forwards every server-side error (Server Actions, rendering, the auth
// callback, proxy) to PostHog. Runs only in the Node runtime; the edge
// runtime cannot load posthog-node.
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { getPostHogServer } = await import("@/lib/posthog/server");
  const posthog = getPostHogServer();
  if (!posthog) return;

  const digest =
    typeof err === "object" && err !== null && "digest" in err
      ? String(err.digest)
      : undefined;

  await posthog.captureExceptionImmediate(err, "blueprint1-server", {
    // One synthetic id for all server errors, and no person profile for it.
    $process_person_profile: false,
    path: request.path,
    method: request.method,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    digest,
  });
};
