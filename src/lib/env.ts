import { z } from "zod";

/**
 * Public env (zod-validated, plan A8). NEXT_PUBLIC_* values are inlined by Next
 * at build time and safe in the browser. Parsed once at module load so a missing
 * variable fails fast rather than surfacing as a confusing runtime error later.
 *
 * Server-only secrets (DATABASE_URL) live in `env.server.ts` behind a
 * `server-only` guard so they can never be pulled into a client bundle.
 */
const publicEnv = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
      .string()
      .min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required"),
    NEXT_PUBLIC_SITE_URL: z.string().min(1).optional(),
  })
  .parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

export const SUPABASE_URL = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY = publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const SITE_URL = publicEnv.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
