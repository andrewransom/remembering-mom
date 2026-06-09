# Milestone 1: Project Foundation

## Goal

Create the initial Next.js application structure and shared UI foundation for a multi-memorial site.

## Scope

- Next.js App Router with TypeScript.
- Tailwind CSS and shadcn-style UI primitives.
- Shared layout, typography, color tokens, and navigation.
- Dynamic route model: `/<name-slug>/...`.
- Deployment path documented before relying on server behavior. Historical note: this originally targeted Cloudflare/OpenNext before the AWS/SST migration.
- Local development defaults use port `3076`.

## Key Decisions

- The site can host multiple memorials.
- `/` lists published memorials.
- Memorial-specific routes live under `/<name-slug>`.
- `/login` remains global.
- Public visitors can submit memories but cannot browse all submitted memories.
- Any authenticated Supabase user is an admin for v1, only safe if public signup is disabled.
- Memorial landing content lives in the `memorials` table instead of hardcoded code content.

## Required Routes

- `/`
- `/<name-slug>`
- `/<name-slug>/memories`
- `/<name-slug>/memories/thank-you`
- `/login`
- `/<name-slug>/condolences`
- `/<name-slug>/admin/memories`

## Acceptance Checks

- `npm run dev` starts on port `3076`.
- Required routes render when Supabase is configured and a published memorial exists.
- Navigation becomes memorial-scoped when on a memorial route.
- Deployment adapter choice, commands, and runtime limitations are documented.
- `.env.example` lists required Supabase and preview-cookie env vars.

## Not Included

- Per-memorial role hierarchy.
- Production deployment.
