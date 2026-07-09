# Security Policy

## Reporting a Vulnerability

Please do not open public issues for suspected vulnerabilities.

Report security issues privately to the project maintainer. Include:

- A short description of the issue and impact
- Reproduction steps or proof of concept
- Affected routes, files, or configuration
- Any relevant logs with secrets removed

The maintainer should confirm receipt, investigate, and publish a fix before public disclosure.

## Scope

In scope:

- Authentication or authorization bypasses
- Exposure of private blueprints or drafts
- Server-side secret leaks
- Stored or reflected cross-site scripting
- Abuse paths that can cause unusual resource consumption

Out of scope:

- Vulnerabilities in a local development environment caused by leaked local `.env` files
- Social engineering
- Issues requiring physical access to a contributor's device
- Denial-of-service reports without a practical mitigation

## Security Model

- `.env` files are ignored and must never be committed.
- `NEXT_PUBLIC_*` values are public by design. Do not put secrets in them.
- The app does not require `SUPABASE_SERVICE_ROLE_KEY`.
- Drizzle uses a direct Postgres connection, so Supabase RLS is not the runtime security boundary. Owner checks in server data access code are required.
- Public `/share/[slug]` pages should return only viewer-safe fields.

See `docs/SECURITY_MODEL.md` for the full security model.
