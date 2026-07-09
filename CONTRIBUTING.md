# Contributing

Thanks for improving blueprint1.

blueprint1 is early, so focused changes are easiest to review. For larger
features, architecture changes, or broad UI changes, please open an issue first.

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
```

Run `pnpm lint` too when your change touches formatting-sensitive code or if a
maintainer asks for it.

## Pull Requests

- Keep changes focused.
- Do not mix unrelated fixes in one PR.
- Include screenshots or a short video for UI changes.
- Explain user-visible behavior changes.
- Do not commit `.env`, database dumps, private keys, OAuth secrets, or logs
  containing secrets.

## Database Changes

Schema changes live in `src/db/schema.ts`.

Generate migrations with:

```bash
pnpm drizzle-kit generate --name=your_change_name
```

Review generated SQL before applying it.

## Security

Do not commit secrets, database dumps, OAuth client secrets, private keys, or production `.env` files. Use `SECURITY.md` for vulnerability reporting guidance.
