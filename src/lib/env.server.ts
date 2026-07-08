import "server-only";
import { z } from "zod";

/**
 * Server-only secrets (zod-validated, plan A8/H1). The `server-only` import makes
 * pulling this into a Client Component a build error, so DATABASE_URL can never
 * leak into the browser bundle. Parsed once at load to fail fast on misconfig.
 */
const serverEnv = z
  .object({
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  })
  .parse({
    DATABASE_URL: process.env.DATABASE_URL,
  });

export function getDatabaseUrl(): string {
  return serverEnv.DATABASE_URL;
}
