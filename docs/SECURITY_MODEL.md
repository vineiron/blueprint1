# Security Model

This document explains the intended security boundaries for blueprint1.

## Summary

- SQL input is parsed and visualized. It is not executed.
- Blueprints are private by default.
- Public share links expose only the latest saved version of a blueprint.
- Authentication uses Supabase Auth with cookie-based SSR clients.
- Authorization is enforced in application code.
- Drizzle connects directly to Postgres, so Supabase Row Level Security is not
  the runtime authorization boundary.

## Trust Boundaries

### Browser

The browser can edit SQL, preview diagrams, and call Server Actions. Browser
state is never trusted for authorization. Client-side parsing exists for
preview and user feedback only.

### Server Actions And Server Components

Server Actions are public POST endpoints from a security perspective. Each
mutation must authenticate the user and perform owner checks server-side.

Owner-scoped reads and writes must include the authenticated user id in the data
access layer, usually as `where owner_id = userId`.

### Database

The app uses Drizzle with `postgres-js` through `DATABASE_URL`. This direct
connection runs as the table owner and bypasses Supabase RLS, so the app must
not rely on RLS to protect runtime data access.

RLS is still enabled on `blueprints` and `blueprint_versions`, with no
policies, and the `anon` and `authenticated` roles have their table grants
revoked (migration `0003_blueprints_rls`). That closes both tables to
Supabase's auto-generated REST API, which would otherwise expose every row,
including private drafts, to anyone holding the publishable key. It is a
second door being locked, not the authorization boundary for the app's own
queries.

## Data Visibility

### Private Blueprints

Private blueprints should only be readable and writable by their owner.

Owner-only data includes:

- draft SQL;
- draft positions;
- owner id;
- private blueprint metadata;
- version history.

### Public Share Links

Public share pages are unlisted but not secret once shared. Anyone with the link
can view the latest saved version.

Public share responses should include only viewer-safe fields:

- title;
- latest saved SQL;
- latest parsed graph;
- latest node positions;
- updated timestamp.

Public share responses should not expose:

- owner id;
- draft SQL;
- draft positions;
- private version history;
- private dashboard metadata.

Unpublishing a blueprint should invalidate the existing public link.

## SQL Handling

User-provided SQL is treated as text input.

The app parses PostgreSQL DDL to build an ERD model. It must not execute pasted
SQL against the database.

SQL output rendered in the UI should be rendered as escaped React text, not as
HTML.

## Environment Variables

`.env` files are ignored and must never be committed.

`NEXT_PUBLIC_*` values are public by design and must not contain secrets.

The app intentionally does not require `SUPABASE_SERVICE_ROLE_KEY`. Adding it
would increase secret leak risk and is unnecessary for the current architecture.

## Current Hardening

- Route UUIDs are validated before owner-scoped database access.
- Public share slugs are validated before database access.
- OAuth callback redirects use configured site origin in production.
- Server Action request body size is capped.
- Baseline security headers and an enforced Content Security Policy are
  configured in `next.config.ts`.
- GitHub secret scanning, Dependabot alerts, Dependabot version updates,
  private vulnerability reporting, CodeQL scanning, and dependency audit
  workflows are enabled or configured for the public repository.
- Authorization and public share behavior have focused automated tests around
  the server data access layer.

## Known Gaps

- Dedicated rate limiting is not implemented yet.
- CSP should still be validated against the real deployed OAuth and Supabase
  flow before treating it as final.
- Automated tests for Server Actions and full route behavior should be expanded.
