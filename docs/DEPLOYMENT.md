# Deployment Guide

This guide covers the production setup for blueprint1.

## Requirements

- A Supabase project
- Google OAuth credentials for Supabase Auth
- A Postgres connection string for app runtime
- A separate direct or session-pooler connection string for migrations
- A deployment platform that supports Next.js 16

## Environment Variables

Set every variable from `.env.example` in your deployment platform.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

### `NEXT_PUBLIC_SUPABASE_URL`

Your Supabase project URL.

### `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Your Supabase publishable key. This value is safe to expose to the browser.

Do not use `SUPABASE_SERVICE_ROLE_KEY`. The app does not need it.

### `DATABASE_URL`

Use this for the deployed app runtime.

For serverless platforms, use the Supabase transaction pooler URL, usually on
port `6543`. The database client is configured with `{ prepare: false }`, which
is compatible with the transaction pooler.

### `DIRECT_URL`

Use this only for Drizzle generation and migrations.

Use a direct connection or Supabase session pooler URL, usually on port `5432`.
Do not run migrations against the transaction pooler.

### `NEXT_PUBLIC_SITE_URL`

Set this to the exact production origin, for example:

```text
https://blueprint1.example.com
```

This value is used for metadata, robots, sitemap, and production OAuth callback
redirects.

## Supabase Auth Setup

### Google Provider

In the Supabase dashboard:

1. Go to **Authentication -> Providers -> Google**.
2. Enable Google.
3. Add your Google OAuth Client ID and Client Secret.

In Google Cloud Console, add this authorized redirect URI:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

### URL Configuration

In Supabase:

1. Go to **Authentication -> URL Configuration**.
2. Set **Site URL** to your production URL.
3. Add local and production callback URLs:

```text
http://localhost:3000/auth/callback
https://your-domain.com/auth/callback
```

## Database Migrations

Schema changes live in:

```text
src/db/schema.ts
```

Generate migrations with:

```bash
pnpm drizzle-kit generate --name=your_change_name
```

Apply migrations with:

```bash
pnpm drizzle-kit migrate
```

Review generated SQL before applying it.

## Production Checklist

- `NEXT_PUBLIC_SITE_URL` is the exact deployed origin.
- Supabase Google OAuth callback URLs include production.
- `DATABASE_URL` points to the transaction pooler for runtime.
- `DIRECT_URL` points to the direct/session connection for migrations.
- `.env` files are not committed.
- `SUPABASE_SERVICE_ROLE_KEY` is not configured.
- GitHub secret scanning and Dependabot alerts are enabled.
- TypeScript check passes:

```bash
pnpm exec tsc --noEmit
```

## Security Notes

See `docs/SECURITY_MODEL.md` for trust boundaries and authorization details.
