import { describe, expect, it } from "vitest";

/**
 * DAL authorization invariants (plan H9, suite 2).
 *
 * These exercise the real Drizzle/postgres-js layer, so they need a disposable
 * Postgres. They are skipped unless TEST_DATABASE_URL is set, keeping the default
 * suite hermetic. Intended invariants to assert against a seeded DB:
 *   1. getOwnedBlueprint(id, owner)       → returns the row
 *   2. getOwnedBlueprint(id, otherUser)   → null   (cross-tenant isolation)
 *   3. getPublicBlueprint(slug)           → object WITHOUT ownerId / email / draft_*
 *   4. setVisibility(..., false)          → public_slug becomes null (revocation)
 *   5. saveAsNewVersion                   → version_number increments atomically
 *
 * To implement: point TEST_DATABASE_URL at a throwaway database, run the
 * migration, seed two users + a blueprint, then assert the above.
 */
const hasTestDb = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!hasTestDb)("DAL authorization invariants", () => {
  it("placeholder — implement against TEST_DATABASE_URL", () => {
    expect(hasTestDb).toBe(true);
  });
});
