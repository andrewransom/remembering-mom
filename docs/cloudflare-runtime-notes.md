# Cloudflare Runtime Notes

## Current Status

The app is intended to deploy to Cloudflare with `@opennextjs/cloudflare`.

Cloudflare deployment is now configured and has been deployed once:

- `npm run build` works.
- `npm run cf:build` works.
- `npm run cf:deploy` works.
- Worker name: `remembering`.
- Deployed URL: `https://remembering.devadmin-461.workers.dev`.
- `open-next.config.ts` exists.
- `wrangler.jsonc` exists.
- Cloudflare secrets have been set from local `.env`, with `NEXT_PUBLIC_SITE_URL` set to the deployed Workers URL.

Remaining deployment readiness work:

- Update Supabase Auth URLs for the deployed Workers URL.
- Run full manual smoke tests on the deployed Workers URL.
- Update `docs/supabase-setup.md` so it lists every migration currently in `supabase/migrations/`.

## Pre-M07 Readiness

Do these before treating Milestone 7 as active deployment work.

### 1) Clean up the working tree

Review the current changes and commit the finished app state before deployment config work.

```bash
git status --short
npm run lint
npm run build
```

Known acceptable lint warnings:

- `<img>` warnings for runtime Supabase image URLs.

### 2) Confirm Supabase is ready

Apply all migrations to the hosted Supabase project.

```bash
npx supabase db push
```

Confirm these exist in Supabase:

- `memorials`
- `memories`
- `condolences`
- `profile` storage bucket
- `memories` storage bucket

Confirm at least one `memorials` row exists with:

- `slug`
- `person_name`
- `is_published = true`

Update `docs/supabase-setup.md` so it lists every migration currently in `supabase/migrations/`, not only the original two.

### 3) Confirm Cloudflare account access

Install dependencies and authenticate Wrangler.

```bash
npm install
npx wrangler login
npx wrangler whoami
```

Choose a worker name before creating config, for example:

```txt
remembering
```

### 4) Add OpenNext and Wrangler config

Generate starter config:

```bash
npx opennextjs-cloudflare migrate
```

Expected new files:

```txt
open-next.config.ts
wrangler.jsonc
```

If creating the files manually, start from the templates in:

```txt
node_modules/@opennextjs/cloudflare/templates/open-next.config.ts
node_modules/@opennextjs/cloudflare/templates/wrangler.jsonc
```

The generated config for this project currently does not enable R2 incremental cache. That is acceptable for the first deployment.

If enabling R2 incremental cache later, `wrangler.jsonc` needs:

- `main: ".open-next/worker.js"`
- `assets.directory: ".open-next/assets"`
- `assets.binding: "ASSETS"`
- `compatibility_flags` including `nodejs_compat`
- `WORKER_SELF_REFERENCE` service binding
- `NEXT_INC_CACHE_R2_BUCKET` R2 binding

Create the R2 cache bucket if R2 cache config is enabled:

```bash
npx wrangler r2 bucket create remembering-opennext-cache
```

The bucket name in `wrangler.jsonc` must match the bucket created in Cloudflare.

### 5) Configure runtime environment values

Do not commit secrets. Configure them in Cloudflare.

Required runtime values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PREVIEW_COOKIE_SECRET=...
NEXT_PUBLIC_SITE_URL=https://<cloudflare-hostname>
```

For this project, use:

```env
NEXT_PUBLIC_SITE_URL=https://remembering.devadmin-461.workers.dev
```

Recommended secret setup:

```bash
npx wrangler secret put NEXT_PUBLIC_SUPABASE_URL
npx wrangler secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put PREVIEW_COOKIE_SECRET
npx wrangler secret put NEXT_PUBLIC_SITE_URL
```

Generate `PREVIEW_COOKIE_SECRET` with enough entropy, for example:

```bash
openssl rand -base64 32
```

### 6) Confirm runtime assumptions

Before deploy, keep these constraints in mind:

- Avoid direct Node-only APIs such as `fs`, `path`, and process-level file persistence in request paths.
- Keep `SUPABASE_SERVICE_ROLE_KEY` in server-only modules.
- Preview-token signing should continue using Web Crypto-compatible code.
- Memory photo upload must be validated in Cloudflare preview because it depends on multipart form data and server actions.
- Cookie flows must be validated in Cloudflare preview because login and memory preview depend on cookies.

## M07 Deployment Work

### 1) Build for Cloudflare

```bash
npm run cf:build
```

If this fails, fix config/runtime issues before attempting deploy.

### 2) Preview locally through Wrangler

```bash
npm run cf:dev
```

Smoke test with one published memorial slug:

- `/` lists the published memorial.
- `/<slug>` renders.
- `/<slug>/memories` submits a memory.
- `/<slug>/memories/thank-you` shows only that submitted preview.
- `/login` works.
- `/<slug>/admin/memories` works when authenticated.
- `/<slug>/condolences` add/delete works when authenticated.

Also test:

- Photo upload.
- Photo lightbox on the thank-you page.
- Public users cannot access admin-only routes.

### 3) Deploy

```bash
npm run cf:deploy
```

Current deployed hostname:

```txt
https://remembering.devadmin-461.workers.dev
```

### 4) Update Supabase Auth URLs

In Supabase Auth settings, include local, preview, and production URLs.

Local:

```txt
Site URL: http://localhost:3076
Redirect URL: http://localhost:3076/**
```

Cloudflare:

```txt
Site URL: https://remembering.devadmin-461.workers.dev
Redirect URL: https://remembering.devadmin-461.workers.dev/**
```

If Cloudflare provides separate preview URLs, add those too.

### 5) Run production smoke tests

Repeat the full M07 smoke test list on the deployed hostname.

Acceptance checks:

- Production deployment is reachable.
- Required env vars are configured outside the repo.
- Supabase Auth URLs include local `3076`, preview, and production URLs.
- At least one memorial row exists and is published.
- Storage buckets and policies are applied.
- `docs/supabase-setup.md` is complete enough to recreate the project.

## After M07

Nice-to-have follow-ups after first deployment:

- Add a custom domain.
- Decide whether to keep R2 incremental cache or simplify config if cache is unnecessary.
- Add CI/CD only after manual deployment is stable.
- Add per-family admin accounts when the product needs that boundary.
- Revisit `next/image` once Supabase image host and Cloudflare image behavior are settled.
