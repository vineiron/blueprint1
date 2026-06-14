@AGENTS.md

## Rules

- When do UI and UX, do it based on design system, if not clear ask first. there is a page /design also.
- No need to do claude launch, no need to launch dev server. Specially the claude launch thing.
- Never give commit message with co authored by claude.
- Ask questions if there are things need to be clarified first, specially when requirements are ambiguous or/and not sure when on giving answer.
- Be transparent about uncertainty or areas requiring human review.
- Recommend when a problem might require human expertise or oversight.
- No worry about build, format, lint for now, no need to check for now. However, do typescript check.
- Do not change package.json, just give the command to install the package(s).
- Use pnpm.
- If changing drizzle schema(s), DO NOT RUN the generation and migration, i will do it manually myself. Just give the --name for it (e.g., `drizzle-kit generate --name=auth`).
- When brainstorming, be creative, feel free to any suggestions (additions, removals, modify, new ideas).
- On every chat/prompt, always see wether there could be skills that can be used, look at .agents/skills
- When asked about git commit messsage, use this structure:
```
feat/fix/chore/refactor(member > disbursements): enhance /member/disbursements page

- add back button
- use card component on items
```
- When asked about creating pull request description, use this structure:
```
Authentication

  - Implement complete admin authentication flow with JWT-based login, logout, and session management
  - Add AuthProvider context for centralized auth state management across the application
  - Create login page with form validation using Zod schema
  - Set up API route handlers that proxy authentication requests to the backend (/api/auth/*)
  - Add token refresh mechanism and session management endpoints
  - Fix JWT expiration issue that was leaving admin user stuck on expired sessions

  Articles Management

  - Integrate articles backend APIs with Next.js API route handlers (/api/articles/*)
  - Implement articles listing page with search, filtering, and pagination
  - Create article detail page with improved layout and image preview
  - Add create article page with rich text editor and form validation
  - Add edit article page with consistent save flow matching create page
  - Implement publish/unpublish and archive/unarchive article actions
  - Add featured image upload with staged upload functionality on both create and edit pages
  - Change image preview aspect ratio from 4:3 to 16:9 for better visual consistency

  Infrastructure

  - Add proxy utility for forwarding requests to backend API with authentication headers
  - Refactor image upload component for better reusability
  - Update gitignore and fix default API port configuration
```