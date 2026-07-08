import { describe, expect, it } from "vitest";
import { parseSql } from "@/lib/sql/parser";
import { TEMPLATES } from "@/lib/templates";

describe("starter templates", () => {
  for (const t of TEMPLATES) {
    it(`"${t.name}" parses to ${t.tableCount} tables with relationships`, () => {
      const r = parseSql(t.sql);
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.model.tables).toHaveLength(t.tableCount);
        expect(r.model.relations.length).toBeGreaterThan(0);
      }
    });
  }
});
