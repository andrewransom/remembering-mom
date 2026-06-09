# Runbook

## Build

```bash
npm run build
```

## Test

```bash
npm run lint
```

## Run Dev

```bash
npm run dev
```

App runs at:

```txt
http://localhost:3076
```

## Publish to AWS

First time only, set secrets for the production stage:

```bash
read -rsp "Supabase URL: " value; printf '\n'; printf '%s' "$value" | npx sst secret set SupabaseUrl --stage production
read -rsp "Supabase anon key: " value; printf '\n'; printf '%s' "$value" | npx sst secret set SupabaseAnonKey --stage production
read -rsp "Supabase service role key: " value; printf '\n'; printf '%s' "$value" | npx sst secret set SupabaseServiceRoleKey --stage production
openssl rand -base64 32 | npx sst secret set PreviewCookieSecret --stage production
unset value
```

Do not pass real secrets inline in shell commands; they can be written to shell
history.

Deploy:

```bash
npm run deploy
```
