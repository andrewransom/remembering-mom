# Milestone 7: Deployment and Handoff

## Goal

Prepare the multi-memorial site for real use on Cloudflare and leave clear setup documentation for Supabase and Cloudflare.

## Scope

- Production environment variables.
- Cloudflare/OpenNext deployment configuration.
- Supabase setup documentation final pass.
- Seed or manually create the first memorial.
- Smoke testing across one memorial slug.
- Accessibility and responsive polish.

## Smoke Tests

For a published memorial slug such as `/jane-doe`:

- `/` lists the memorial.
- `/jane-doe` renders.
- `/jane-doe/memories` submits a memory.
- `/jane-doe/memories/thank-you` shows only that preview.
- `/login` works.
- `/jane-doe/admin/memories` works when authenticated.
- `/jane-doe/condolences` add/delete works when authenticated.

## Acceptance Checks

- Production deployment is reachable.
- Required env vars are configured outside the repo.
- Supabase Auth URLs include local `3076`, preview, and production URLs.
- At least one memorial row exists and is published.
- Storage buckets and policies are applied.
- `docs/supabase-setup.md` is complete enough to recreate the project.

## Not Included

- Custom domain.
- Per-family admin accounts.
- CI/CD beyond simple deployment.
