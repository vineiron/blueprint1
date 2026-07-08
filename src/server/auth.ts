import "server-only";
import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export class UnauthorizedError extends Error {
  constructor() {
    super("You must be signed in to do that.");
    this.name = "UnauthorizedError";
  }
}

/**
 * Fast, local JWT verification via getClaims() — the DEFAULT for the auth gate
 * and hot owner-scoped reads (plan B3). Avoids a network round-trip on every
 * gated request; returns the user id (claims.sub) or null.
 */
export async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return error || !sub ? null : sub;
}

/**
 * Network-verified current user (authoritative). Use only where the full
 * profile is needed (e.g. the app shell's name/avatar), not on hot paths.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** For RSC pages/layouts: bounce to home (which auto-opens the sign-in popup) when signed out (id-only fast path). */
export async function requireAuthUserId(nextPath?: string): Promise<string> {
  const userId = await getAuthUserId();
  if (!userId) {
    redirect(nextPath ? `/?signin=1&next=${encodeURIComponent(nextPath)}` : "/?signin=1");
  }
  return userId;
}

/** For pages/layouts that need the full user object (network-verified). */
export async function requireUser(nextPath?: string): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(nextPath ? `/?signin=1&next=${encodeURIComponent(nextPath)}` : "/?signin=1");
  }
  return user;
}

/** For Server Actions: throw (don't redirect) when signed out (fast path). */
export async function requireUserId(): Promise<string> {
  const userId = await getAuthUserId();
  if (!userId) throw new UnauthorizedError();
  return userId;
}
