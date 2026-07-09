# blueprint1

Turn PostgreSQL DDL into interactive, versioned, shareable entity-relationship blueprints.

Paste `CREATE TABLE` statements → get a pan/zoom ERD with hover-highlighting and one-click auto-layout. Sign in with Google to save blueprints, keep a version history, and publish read-only share links.

## Stack

- **Next.js 16** (App Router, React 19, React Compiler) · TypeScript · Tailwind v4 · Biome
- **Supabase Auth** (Google OAuth) via `@supabase/ssr`
- **Drizzle ORM** + `postgres-js` (direct connection — authorization is enforced in app code)
- **pgsql-ast-parser** for SQL DDL parsing · **@xyflow/react** + **elkjs (ELK)** for the canvas and auto-layout

## 1. Environment

Set these in `.env` (already present in this project):

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # the new publishable key (replaces anon)
DATABASE_URL=...                            # Postgres connection string
```

> For serverless deploys use the Supabase **transaction pooler** URL (port 6543) — `{ prepare: false }` is already set. Run **migrations** against the **direct/session** URL (port 5432).

## 2. Install dependencies

These libraries are required and must be declared in `package.json`:

```bash
pnpm add @supabase/ssr@0.12.0 @supabase/supabase-js@2.108.1 drizzle-orm@0.45.2 postgres@3.4.9 pgsql-ast-parser@12.0.2 @xyflow/react@12.11.0 elkjs
pnpm add -D drizzle-kit@0.31.10
```

## 3. Database migration

The schema lives in `src/db/schema.ts` (tables: `blueprints`, `blueprint_versions`). Owner identity comes from the Supabase session — `blueprints.owner_id` holds the `auth.users.id` directly, with no local `profiles` mirror. Generate and apply the first migration:

```bash
pnpm drizzle-kit generate --name=blueprints_versions
pnpm drizzle-kit migrate
```

## 4. Supabase Google OAuth (one-time, manual)

1. **Supabase dashboard → Authentication → Providers → Google**: enable it and paste your Google OAuth **Client ID** and **Client Secret**.
2. **Google Cloud Console → Credentials → OAuth client**: add the authorized redirect URI
   `https://<project-ref>.supabase.co/auth/v1/callback`.
3. **Supabase dashboard → Authentication → URL Configuration**: set the Site URL (e.g. `http://localhost:3000`) and add redirect URLs:
   `http://localhost:3000/auth/callback` (and your production `https://…/auth/callback`).

## 5. Run

```bash
pnpm dev
```

Type-check:

```bash
pnpm exec tsc --noEmit
```

## Architecture notes

- **Routes**: `(marketing)` = landing, `(app)` = authed dashboard/editor (gated in the layout + re-checked per page), `share/[slug]` = public read-only, `auth/callback` = OAuth code exchange. Sign-in is a **modal popup** (no dedicated route) — see `src/components/sign-in-modal*.tsx`; gated routes bounce to `/?signin=1&next=` which auto-opens it.
- **Authorization is in application code.** `postgres-js` connects directly and bypasses Supabase RLS, so every owner-scoped query carries `where ownerId = userId` (see `src/server/data/blueprints.ts`) and every Server Action verifies the user first. `src/proxy.ts` only refreshes the session and does optimistic redirects — it is **not** the security boundary.
- **Draft → version flow**: editing a saved blueprint autosaves a *draft* (`draft_sql` / `draft_positions` columns on `blueprints`). "Save as new version" commits an immutable `blueprint_versions` row. Loading an old version as a draft copies its SQL and positions into the draft for review; history is never destroyed.
- **Source of truth = SQL**. The committed `graph` per version is produced by the server **re-parsing** the SQL (the client parse is for live preview only); manual node positions are merged in.
- **Auto-layout (ELK)**: pasted DDL has no coordinates, so the canvas runs **elkjs** (`layered` + orthogonal edge routing, with per-column ports) to place tables and route relationships *around* them. It runs automatically when a table has no saved position and on demand via the **Auto layout** button; manual positions are otherwise preserved. Routed edge paths are recomputed on each auto-layout and revert to live curves while dragging.

## Documented decisions

See `docs/DECISIONS.md` for the full decision register (93 decisions, all options + reasoning).

## Optional upgrades

The UI primitives, toasts, icons, and SQL editor are hand-rolled to keep the dependency surface minimal and the app runnable out of the box. To upgrade:

- **Syntax-highlighted SQL editor** (CodeMirror): `pnpm add @uiw/react-codemirror @codemirror/lang-sql` — then swap the textarea in `src/components/sql-editor.tsx`.
- **Accessible primitives** (Radix): `pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tooltip`.
- **Icons / toasts / schema validation**: `pnpm add lucide-react sonner zod`.
