# SST Migration Plan: Cloudflare Workers → AWS

## Goal

Replace `@opennextjs/cloudflare` with SST v3, deploying the Next.js app to AWS
(Lambda + CloudFront + S3) behind the custom domain `remember.ketseba.com`,
with DNS remaining in Route 53.

---

## How SST works here

SST v3's `sst.aws.Nextjs` component uses OpenNext under the hood — the same
philosophy as the current Cloudflare setup, just targeting AWS instead. It
produces:

- **S3** — static assets
- **Lambda** — SSR and server actions
- **CloudFront** — CDN + HTTPS, terminates at `remember.ketseba.com`
- **Route 53** — SST creates the DNS records automatically inside your existing
  hosted zone

Secrets are SST-managed encrypted values injected at deploy time. SST manages
its own state (not CloudFormation); the first deploy also bootstraps a small S3
bucket and IAM resources in your account to store that state.

---

## AWS cost at this traffic level

Very low cost for a personal site:

- **Lambda**: 1 M requests/month free (always free, no expiry)
- **CloudFront**: 1 TB transfer + 10 M requests/month free for the first 12
  months, then fractions of a cent per request
- **S3**: negligible for static assets
- **Route 53**: $0.50/month per hosted zone — the one unavoidable fixed cost

---

## Prerequisites — manual steps on your end

### 1. AWS account and IAM credentials

You need an AWS account with a programmatic IAM user (or SSO role) that has
broad permissions — SST needs to manage Lambda functions, CloudFront
distributions, S3 buckets, SSM parameters, and Route 53 records.

The simplest approach for a personal project is to create an IAM user with
`AdministratorAccess` and store its credentials locally:

```bash
aws configure
# prompts for Access Key ID, Secret Access Key, region (use us-east-1)
```

Verify access:

```bash
aws sts get-caller-identity
```

### 2. Confirm the Route 53 hosted zone and DNS inventory

SST will look up your hosted zone by domain name. The zone for `ketseba.com`
must exist in Route 53 in the **same AWS account** you deploy to.

```bash
aws route53 list-hosted-zones --query "HostedZones[*].{Name:Name,Id:Id}"
# should include "ketseba.com."
```

**If the hosted zone already exists**, skip to the next step — SST will only
add a record for `remember.ketseba.com` and leave everything else alone.

**If you need to create the hosted zone**: Route 53 will assign four NS records.
Before pointing your registrar at them, export all existing DNS records from
wherever they currently live and re-create them in Route 53 first, or you will
break other services (email, other subdomains, etc.) during the cutover. Lower
the TTLs on critical records to 60 s a day in advance so propagation is fast.
Once existing records are in place, update your registrar's nameservers.

SST only touches `remember.ketseba.com` — it does not modify any other records
in the zone.

---

## Code changes

### 1. Install SST, remove Cloudflare packages

```bash
npm install sst
npm uninstall @opennextjs/cloudflare wrangler
```

### 2. Delete Cloudflare-specific files

```bash
rm open-next.config.ts wrangler.jsonc
rm -rf .open-next
```

Update `.gitignore` — remove Wrangler/Cloudflare-only entries and add SST's
output directory. Keep `.open-next` ignored because SST/OpenNext still uses it
as a build output:

```diff
-# wrangler files
-.wrangler
-.dev.vars*
-!.dev.vars.example
+.sst
+.open-next
```

### 3. Archive Cloudflare docs

The following files contain Cloudflare-specific content that will mislead
future development (including AI agents) if left as-is:

| File | Action |
|------|--------|
| `docs/cloudflare-runtime-notes.md` | Delete or rename to `.archived.md` |
| `docs/07-deployment-and-handoff.md` | Update goal/scope to reference AWS/SST |
| `docs/supabase-setup.md` (lines 122–end) | Replace Cloudflare URL examples with `remember.ketseba.com` |
| `docs/requirements.md` (line 15) | Update hosting row from Cloudflare to AWS/SST |
| `docs/01-project-foundation.md` (line 13) | Mark Cloudflare/OpenNext deployment path note as historical |

### 4. Add `sst.config.ts`

Create this file at the project root:

```typescript
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "remembering",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    new sst.aws.Nextjs("Remembering", {
      domain: {
        name: "remember.ketseba.com",
        dns: sst.aws.dns(),
      },
      environment: {
        NEXT_PUBLIC_SUPABASE_URL: new sst.Secret("SupabaseUrl").value,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: new sst.Secret("SupabaseAnonKey").value,
        NEXT_PUBLIC_SITE_URL: "https://remember.ketseba.com",
        SUPABASE_SERVICE_ROLE_KEY: new sst.Secret("SupabaseServiceRoleKey").value,
        PREVIEW_COOKIE_SECRET: new sst.Secret("PreviewCookieSecret").value,
      },
    });
  },
});
```

### 5. Fix `next.config.ts`

Remove the Cloudflare dev initializer — it will throw after the package is
uninstalled:

```typescript
// before
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());

// after
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

### 6. Update `package.json` scripts

Replace Cloudflare-specific scripts:

```json
"scripts": {
  "build": "next build",
  "dev": "next dev -p 3076",
  "start": "next start -p 3076",
  "lint": "eslint",
  "deploy": "sst deploy --stage production",
  "deploy:dev": "sst deploy"
}
```

---

## Set secrets

SST secrets are stage-scoped encrypted values managed by SST. Set all
secrets for the **production** stage before the first deploy. The `--stage
production` flag is required — without it SST targets a default dev stage and
production will be missing them.

```bash
read -rsp "Supabase URL: " value; printf '\n'; printf '%s' "$value" | npx sst secret set SupabaseUrl --stage production
read -rsp "Supabase anon key: " value; printf '\n'; printf '%s' "$value" | npx sst secret set SupabaseAnonKey --stage production
read -rsp "Supabase service role key: " value; printf '\n'; printf '%s' "$value" | npx sst secret set SupabaseServiceRoleKey --stage production
openssl rand -base64 32 | npx sst secret set PreviewCookieSecret --stage production
unset value
```

Avoid passing real secrets inline in shell commands because they can be written
to shell history. `sst secret list` may print secret values; use it only when
you are comfortable with the output being visible in your terminal.

To verify all four names are set before deploying:

```bash
npx sst secret list --stage production
```

---

## First deploy

The first `sst deploy` automatically bootstraps SST's state infrastructure
(an S3 bucket and IAM role) in your account before proceeding — no separate
bootstrap command is needed.

```bash
npm run deploy
```

SST will:

1. Bootstrap state resources (first run only, ~1 min)
2. Build the Next.js app (`next build`)
3. Bundle the output with OpenNext for Lambda
4. Upload static assets to S3
5. Create a CloudFront distribution
6. Request an ACM certificate for `remember.ketseba.com` (~2 min)
7. Create a Route 53 A/AAAA record for `remember.ketseba.com` pointing at
   CloudFront

The first deploy takes 5–15 minutes due to CloudFront propagation and ACM
certificate issuance. Subsequent deploys are ~2 minutes.

SST prints the live URL at the end.

---

## Update Supabase Auth URLs

Do this in two passes — the new redirect URL must exist before you can smoke
test login, but keep the old Workers URL until all smoke tests pass so you
retain a rollback path.

**Before smoke tests** — add the new URL, keep the old one:

In the Supabase dashboard → Authentication → URL Configuration:

| Field         | Value                                            |
|---------------|--------------------------------------------------|
| Site URL      | `https://remember.ketseba.com`                   |
| Redirect URLs | `http://localhost:3076/**`                       |
|               | `https://remember.ketseba.com/**`                ← add this now |
|               | `https://remembering.devadmin-461.workers.dev/**` ← keep for rollback |

**After all smoke tests pass** — remove the old Workers entry (see
Post-migration cleanup).

---

## Smoke tests

Run against `https://remember.ketseba.com` after deploy:

- `/` lists the published memorial
- `/<slug>` renders the memorial page
- `/<slug>/memories` submits a memory (with photo)
- `/<slug>/memories/thank-you` shows the submitted preview only
- `/login` authenticates via Supabase
- `/<slug>/admin/memories` accessible when authenticated
- `/<slug>/condolences` add/delete works when authenticated

---

## Post-migration cleanup

Once smoke tests pass:

1. Remove `remembering.devadmin-461.workers.dev/**` from Supabase redirect URLs
2. Delete the `remembering` Cloudflare Worker from the Cloudflare dashboard
3. Update the runbook (see below)

---

## Update runbook

Replace the runbook's Cloudflare section:

```markdown
## Publish to AWS

# First time only — set secrets for production stage
npx sst secret set <Name> "<value>" --stage production

# Deploy
npm run deploy
```

---

## Risks and notes

- **Next.js 16 + SST compatibility**: SST's `sst.aws.Nextjs` component bundles
  OpenNext internally. Verify that the version of SST you install supports
  Next.js 16 before committing to this path — check the SST changelog or open
  an issue if the build fails with an unsupported version error.

- **`next.config.ts` import side effect**: The `initOpenNextCloudflareForDev()`
  dynamic import must be removed. It is a no-op in production but will throw
  after uninstalling the package.

- **Image optimization**: The Cloudflare `IMAGES` binding is gone. AWS
  CloudFront does not optimize images natively — SST's `sst.aws.Nextjs` uses a
  Lambda-based image optimizer that ships with OpenNext, so `next/image` will
  work without any changes.

- **Server action / cookie behavior**: SST targets Node.js Lambda, not the
  Edge runtime, so Node-native APIs (`fs`, `crypto`, etc.) are available.
  No runtime constraints to audit.

- **Cold starts**: Lambda cold starts are typically 300–800 ms on first
  request after a period of inactivity. Acceptable for a personal site.

- **DNS cutover risk**: If you need to create a new hosted zone and move
  nameservers, copy all existing DNS records first. SST only writes
  `remember.ketseba.com` — it will not rebuild records for email, other
  subdomains, or root domain.
