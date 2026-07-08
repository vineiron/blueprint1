import { describe, expect, it } from "vitest";
import {
  isUuid,
  isValidSlug,
  LIMITS,
  validateDdl,
  validateGraphSize,
  validateNote,
  validateTitle,
} from "./validation";

describe("validation", () => {
  it("rejects an empty/whitespace title", () => {
    expect(validateTitle("   ").ok).toBe(false);
    expect(validateTitle(undefined).ok).toBe(false);
  });

  it("trims and accepts a normal title", () => {
    const r = validateTitle("  My blueprint  ");
    expect(r.ok && r.value).toBe("My blueprint");
  });

  it("rejects an over-long title", () => {
    expect(validateTitle("x".repeat(LIMITS.titleMax + 1)).ok).toBe(false);
  });

  it("rejects oversized DDL", () => {
    expect(validateDdl("x".repeat(LIMITS.ddlMax + 1)).ok).toBe(false);
  });

  it("treats a null note as empty", () => {
    const r = validateNote(null);
    expect(r.ok && r.value).toBe("");
  });

  it("flags too many tables", () => {
    const model = {
      tables: Array.from({ length: LIMITS.maxTables + 1 }, () => ({ columns: [] })),
    };
    expect(validateGraphSize(model).ok).toBe(false);
  });

  it("flags too many columns in one table", () => {
    const model = {
      tables: [{ columns: Array.from({ length: LIMITS.maxColumnsPerTable + 1 }) }],
    };
    expect(validateGraphSize(model).ok).toBe(false);
  });

  it("accepts a reasonable graph", () => {
    const model = { tables: [{ columns: [{}, {}] }, { columns: [{}] }] };
    expect(validateGraphSize(model).ok).toBe(true);
  });

  it("validates uuids and slugs", () => {
    expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isValidSlug("abcdEFGH12")).toBe(true);
    expect(isValidSlug("short")).toBe(false);
    expect(isValidSlug("has space")).toBe(false);
  });
});
