# Architecture

blueprint1 turns PostgreSQL DDL into an interactive ERD, then lets signed-in
users save private blueprints, keep version history, and publish read-only
share links.

## System Overview

The app is a Next.js App Router application with a small server-side data layer:

- **Next.js / React** renders the marketing page, dashboard, editor, public
  share pages, and Server Actions.
- **Supabase Auth** provides Google OAuth identity and cookie-backed sessions.
- **Drizzle ORM** talks to Postgres through `postgres-js`.
- **pgsql-ast-parser** parses pasted PostgreSQL DDL into an internal ERD model.
- **React Flow + ELK** render and auto-layout the diagram canvas.

Postgres is the persistence layer. Supabase is currently used for auth identity,
not for runtime data access through Supabase client APIs.

## Runtime Boundaries

### Browser

The browser handles editing, live preview, theme state, canvas interaction, and
image export UI. Browser state is treated as untrusted. Client-side parsing is
only for immediate feedback and preview.

### Next.js Server

Server Components load owner-scoped data for dashboard and editor routes. Server
Actions perform mutations such as create, draft save, version save, visibility
changes, restore, export reads, and delete.

Server Actions are treated like public POST endpoints: every mutation must
authenticate the user and re-check ownership on the server.

### Database

The app uses Drizzle with a direct Postgres connection. This means Supabase Row
Level Security is not the runtime authorization boundary. Owner checks happen in
application code before private rows are returned or changed.

## Route Layout

The app routes are split by product surface:

- `src/app/(marketing)/page.tsx` is the public landing page at `/`.
- `src/app/try/page.tsx` is the no-signup SQL-to-ERD playground.
- `src/app/(app)/dashboard/page.tsx` is the authenticated dashboard.
- `src/app/(app)/blueprints/new/page.tsx` creates a signed-in blueprint.
- `src/app/(app)/blueprints/[id]/page.tsx` shows an owner-only blueprint.
- `src/app/(app)/blueprints/[id]/edit/page.tsx` edits an owner-only blueprint.
- `src/app/(app)/blueprints/[id]/versions/[versionId]/page.tsx` shows a saved
  owner-only version.
- `src/app/share/[slug]/page.tsx` shows a public, read-only share page.
- `src/app/auth/callback/route.ts` exchanges Supabase OAuth codes.

The `(app)` layout gates authenticated product routes. Individual pages and data
loaders still re-check authorization; the layout is not the only protection.

## Data Flow

### Playground

1. A visitor pastes SQL into `/try`.
2. The client parses the SQL for preview.
3. The graph renders locally.
4. Nothing is saved unless the user signs in and creates a blueprint.

### Create Blueprint

1. A signed-in user submits a title and SQL.
2. `createBlueprintAction` validates title and SQL size.
3. The server parses SQL again with `parseSql`.
4. The server validates graph size limits.
5. The data layer creates a `blueprints` row and an initial
   `blueprint_versions` row in one transaction.

The committed graph is server-computed. The client parse is never the
authoritative version.

### Draft Save

1. Editing saves uncommitted state into the parent `blueprints` row.
2. Draft fields are `draft_sql`, `draft_positions`, and `draft_updated_at`.
3. Drafts are owner-only and never exposed on public share pages.

Draft save validates input size and owner access, but it does not create a new
immutable version.

### Save As New Version

1. The user saves the current SQL as a version.
2. The server validates and re-parses SQL.
3. A new `blueprint_versions` row is inserted.
4. Draft fields are cleared.
5. The blueprint `updated_at` timestamp is refreshed.

Saved versions are immutable history records from the product perspective.

### Restore Version

Restoring a version is copy-forward, not destructive. The selected version's SQL
and positions are copied into the draft fields. The user must save again to
create a new version.

### Public Sharing

1. Publishing a blueprint sets `is_public = true`.
2. A random opaque `public_slug` is minted if needed.
3. `/share/[slug]` validates the slug and reads only public, viewer-safe fields.
4. The public page shows the latest saved version only.

Unpublishing drops the slug, so old share links stop working. Republishing later
mints a new slug.

## Authorization Model

Private data access follows this rule:

```text
authenticated user id + blueprint id -> owner-scoped query
```

The data layer uses `owner_id = userId` for private blueprint reads and writes.
Route UUIDs and public slugs are validated before database access.

Important files:

- `src/server/auth.ts` reads the Supabase user from the server session.
- `src/server/actions/blueprints.ts` authenticates every mutation.
- `src/server/data/blueprints.ts` applies owner checks around database access.
- `docs/SECURITY_MODEL.md` documents trust boundaries and known gaps.

## SQL Parsing And Graph Rendering

The ERD model is produced from SQL text:

1. `src/lib/sql/parser.ts` parses PostgreSQL DDL with `pgsql-ast-parser`.
2. `src/lib/sql/types.ts` defines the shared ERD model.
3. `src/components/erd/build-graph.ts` maps the model into React Flow nodes and
   edges.
4. `src/components/erd/layout.ts` uses ELK for automatic layout.
5. `src/components/erd/erd-canvas.tsx` renders the interactive canvas.

The parser supports common PostgreSQL DDL patterns such as tables, columns,
primary keys, foreign keys, unique constraints, checks, indexes, comments, and
enums. SQL is parsed and rendered as data; it is not executed.

## Environment And Deployment

Public environment values are parsed in `src/lib/env.ts`. Server-only secrets
are parsed in `src/lib/env.server.ts`, which imports `server-only` so database
secrets cannot be pulled into a client bundle.

Runtime database connections use `DATABASE_URL`. Drizzle generation and
migrations should use `DIRECT_URL` when available. See `docs/DEPLOYMENT.md`
for the full deployment guide.

## Key Files

- `src/app/` - routes, layouts, metadata, and route handlers.
- `src/components/` - product UI, editor workspace, canvas, dialogs, and shared
  primitives.
- `src/lib/sql/` - SQL parser and ERD model types.
- `src/server/actions/` - Server Actions used by forms and client components.
- `src/server/data/` - owner-scoped database access.
- `src/db/schema.ts` - Drizzle schema for persisted blueprint data.
- `src/db/index.ts` - Postgres client and Drizzle instance.
- `src/proxy.ts` - Supabase session refresh and optimistic auth redirects.
