import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getDatabaseUrl } from "@/lib/env.server";
import * as schema from "./schema";

/*
 * postgres-js client behind a global singleton so Next.js HMR (dev) and
 * serverless instance reuse don't open a new pool on every reload.
 *
 * { prepare: false } is the safe universal setting: required on the Supabase
 * transaction pooler (port 6543), harmless on direct/session (5432).
 */
const globalForDb = globalThis as unknown as {
  __blueprintSql?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__blueprintSql ?? postgres(getDatabaseUrl(), { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__blueprintSql = client;
}

export const db = drizzle({ client, schema });
export type DB = typeof db;
