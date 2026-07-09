# Contributing

Thanks for improving blueprint1.

## Local Setup

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Fill `.env` with your own Supabase and Postgres values before running the app.

## Checks

```bash
pnpm exec tsc --noEmit
pnpm lint
```

## Database Changes

Schema changes live in `src/db/schema.ts`.

Generate migrations with:

```bash
pnpm drizzle-kit generate --name=your_change_name
```

Review generated SQL before applying it.

## Security

Do not commit secrets, database dumps, OAuth client secrets, private keys, or production `.env` files. Use `SECURITY.md` for vulnerability reporting guidance.
