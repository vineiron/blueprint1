"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BlueprintCard } from "@/components/blueprint-card";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DatabaseIcon,
  GridIcon,
  ListIcon,
  PlusIcon,
  SearchIcon,
  SortIcon,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BlueprintSummary } from "@/server/data/blueprints";

type SortField = "updated" | "created" | "name";
type SortDir = "asc" | "desc";
type SortValue =
  | "created_desc"
  | "created_asc"
  | "updated_desc"
  | "updated_asc"
  | "name_asc"
  | "name_desc";
type FilterKey = "all" | "public" | "private" | "draft";

/** Each option is a self-describing field + direction pair — one pick sorts immediately. */
const SORT_OPTIONS: { value: SortValue; label: string; field: SortField; dir: SortDir }[] = [
  { value: "created_desc", label: "Recently created", field: "created", dir: "desc" },
  { value: "created_asc", label: "Oldest created", field: "created", dir: "asc" },
  { value: "updated_desc", label: "Recently updated", field: "updated", dir: "desc" },
  { value: "updated_asc", label: "Oldest updated", field: "updated", dir: "asc" },
  { value: "name_asc", label: "Name (A–Z)", field: "name", dir: "asc" },
  { value: "name_desc", label: "Name (Z–A)", field: "name", dir: "desc" },
];

/** Ascending comparison for a single field. Names use natural, case-insensitive order. */
function compareByField(a: BlueprintSummary, b: BlueprintSummary, field: SortField): number {
  if (field === "name") {
    return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
  }
  const av = new Date(field === "created" ? a.createdAt : a.updatedAt).getTime();
  const bv = new Date(field === "created" ? b.createdAt : b.updatedAt).getTime();
  return av - bv;
}

export function DashboardGrid({ blueprints }: { blueprints: BlueprintSummary[] }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState<SortValue>("created_desc");
  const [filter, setFilter] = useState<FilterKey>("all");

  function resetSearchAndFilters() {
    setQuery("");
    setFilter("all");
  }

  const counts = useMemo(
    () => ({
      all: blueprints.length,
      public: blueprints.filter((d) => d.isPublic).length,
      private: blueprints.filter((d) => !d.isPublic).length,
      draft: blueprints.filter((d) => d.hasDraft).length,
    }),
    [blueprints],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let base = blueprints;
    if (q) {
      base = base.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.tableNames.some((n) => n.toLowerCase().includes(q)),
      );
    }
    base = base.filter((d) =>
      filter === "all"
        ? true
        : filter === "public"
          ? d.isPublic
          : filter === "private"
            ? !d.isPublic
            : d.hasDraft,
    );
    const opt = SORT_OPTIONS.find((o) => o.value === sort) ?? SORT_OPTIONS[0];
    return [...base].sort((a, b) => {
      const primary = compareByField(a, b, opt.field);
      const signed = opt.dir === "asc" ? primary : -primary;
      if (signed !== 0) return signed;
      // Intentional, stable tiebreak so equal primary keys never reorder arbitrarily.
      return (
        a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }) ||
        a.id.localeCompare(b.id)
      );
    });
  }, [blueprints, query, sort, filter]);

  if (blueprints.length === 0) {
    return (
      <EmptyState
        icon={DatabaseIcon}
        title="No blueprints yet"
        description="Create your first blueprint by pasting some PostgreSQL CREATE TABLE statements."
        action={
          <Link
            href="/blueprints/new"
            className="focus-ring inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            <PlusIcon size={16} />
            New blueprint
          </Link>
        }
      />
    );
  }

  const filterChips: { key: FilterKey; label: string; n: number }[] = [
    { key: "all", label: "All", n: counts.all },
    { key: "public", label: "Public", n: counts.public },
    { key: "private", label: "Private", n: counts.private },
    { key: "draft", label: "Has draft", n: counts.draft },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your blueprints</h1>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <SearchIcon
                size={16}
                className="-translate-y-1/2 absolute top-1/2 left-2.5 text-muted-foreground"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search title or table name…"
                className="h-9 w-full pl-8 sm:w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortValue)}
                  aria-label="Sort blueprints"
                  className="focus-ring h-9 w-full appearance-none rounded-md border border-border bg-card pr-8 pl-2 text-sm text-foreground"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <SortIcon
                  size={14}
                  className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-2.5 text-muted-foreground"
                />
              </div>
              <div className="flex items-center rounded-md border border-border p-0.5">
                <ViewButton active={view === "grid"} onClick={() => setView("grid")} label="Grid view">
                  <GridIcon size={16} />
                </ViewButton>
                <ViewButton active={view === "list"} onClick={() => setView("list")} label="List view">
                  <ListIcon size={16} />
                </ViewButton>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            {filterChips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setFilter(c.key)}
                aria-pressed={filter === c.key}
                className={cn(
                  "focus-ring inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                  filter === c.key
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {c.label}
                <span className="text-muted-foreground">{c.n}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No blueprints match your search{filter !== "all" ? " and filter" : ""}.
          </p>
          <button
            type="button"
            onClick={resetSearchAndFilters}
            className="focus-ring inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
          >
            Reset search and filters
          </button>
        </div>
      ) : (
        <div
          className={cn(
            view === "grid"
              ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              : "flex flex-col gap-3",
          )}
        >
          {view === "grid" ? (
            <Link
              href="/blueprints/new"
              className="focus-ring flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary text-primary transition hover:bg-primary/5"
            >
              <PlusIcon size={22} />
              <span className="text-sm font-medium">New blueprint</span>
            </Link>
          ) : null}
          {filtered.map((d) => (
            <BlueprintCard key={d.id} blueprint={d} view={view} />
          ))}
        </div>
      )}
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "focus-ring flex h-7 w-7 items-center justify-center rounded",
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
