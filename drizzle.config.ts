import { defineConfig } from "drizzle-kit";

/*
 * Run migrations against the SESSION pooler URL (port 5432), never the
 * transaction pooler (6543). Prefers DIRECT_URL (session pooler) and falls back
 * to DATABASE_URL; ensure it's exported (or in .env) before generate/migrate.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
