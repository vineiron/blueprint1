"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { GoogleIcon } from "@/components/ui/icons";
import { SITE_URL } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

function getOAuthOrigin() {
  const configuredOrigin = new URL(SITE_URL).origin;
  const isLocalConfiguredOrigin =
    configuredOrigin.startsWith("http://localhost") ||
    configuredOrigin.startsWith("http://127.0.0.1");

  if (process.env.NODE_ENV === "production" && !isLocalConfiguredOrigin) {
    return configuredOrigin;
  }

  return window.location.origin;
}

/**
 * Sign-in popup (replaces the old dedicated /signin page). The OAuth call runs
 * client-side via the browser Supabase client so failures show inline; on
 * success the browser is sent to Google and back through /auth/callback, which
 * restores `next`.
 */
export function SignInModal({
  open,
  onClose,
  next,
}: {
  open: boolean;
  onClose: () => void;
  next?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleGoogle() {
    setLoading(true);
    setError(false);
    const supabase = createClient();
    const safeNext = next && next.startsWith("/") ? next : "/dashboard";
    const redirectTo = `${getOAuthOrigin()}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (oauthError) {
      setError(true);
      setLoading(false);
    }
    // On success the browser is redirected to Google — no further state to set.
  }

  return (
    <Dialog open={open} onClose={onClose} title="Sign in" className="max-w-sm">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Sign in to create and manage your blueprints.
        </p>

        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Sign in failed. Please try again.
          </p>
        ) : null}

        <Button
          variant="outline"
          size="lg"
          className="w-full"
          loading={loading}
          onClick={handleGoogle}
        >
          {!loading ? <GoogleIcon size={18} /> : null}
          Continue with Google
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By continuing you agree to use blueprint1 responsibly.
        </p>
      </div>
    </Dialog>
  );
}
