# Supabase Setup (Web + Expo)

This app supports Supabase for auth (Google OAuth and email/password). Configure it safely by following these steps.

## Do not expose server creds
- Do not put your Postgres connection string or database password in the web/Expo client.
- Do not expose the Supabase `service_role` key in client apps.

## Web (Vite) configuration
- Required in `.env.local`:
  - `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<anon public key>`
- Optional:
  - `VITE_BACKEND_URL=https://your.api` (only if you have a live API; otherwise the app uses mock services)

The client is initialized in `src/services/supabaseClient.ts` and only activates when both vars are set.

## Expo (React Native) configuration
Use publishable env vars and React Native storage/URL polyfills.

Example `utils/supabase.ts` (Expo project):

```ts
import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, processLock } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  }
)
```

In `app.json` or `app.config.ts`:

```json
{
  "expo": {
    "extra": {
      "EXPO_PUBLIC_SUPABASE_URL": "https://<project-ref>.supabase.co",
      "EXPO_PUBLIC_SUPABASE_KEY": "<anon public key>"
    }
  }
}
```

For Google OAuth on mobile, configure deep link redirect and pass `redirectTo` to `signInWithOAuth`.

## Database access from clients: RLS
If clients read/write tables, enable RLS and add policies.

Example for `todos`:

```sql
alter table public.todos enable row level security;

create policy "Read own todos" on public.todos
  for select using ( auth.uid() = user_id );

create policy "Insert own todos" on public.todos
  for insert with check ( auth.uid() = user_id );

create policy "Update own todos" on public.todos
  for update using ( auth.uid() = user_id );
```

## Server-side access: Transaction Pooler
Use the pooler from servers (not from web/Expo). Prefer port 6543 (PgBouncer transaction pooling); use 5432 for direct connections (migrations).

Examples (server-only env):

```bash
# Shared connection pooler
DATABASE_URL="postgresql://postgres.<project-ref>:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct via pooler host (migrations)
DIRECT_URL="postgresql://postgres.<project-ref>:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# If using dedicated pooler on the project host
# DATABASE_URL="postgres://postgres:[PASSWORD]@db.<project-ref>.supabase.co:6543/postgres?pgbouncer=true"
# DIRECT_URL="postgres://postgres:[PASSWORD]@db.<project-ref>.supabase.co:5432/postgres"
```

Node example:

```js
import pg from 'pg'
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const { rows } = await pool.query('select now()')
```

## Key rotation & safety
- If secrets were shared, rotate the Postgres password in Supabase settings.
- Optionally rotate the anon key in Project Settings → API.
- Treat anon key as public, but keep it in env vars and out of commits.

## Quick test (web)
After setting `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`:

```bash
npm run dev
```

The login screen supports Google sign-in (when enabled in Supabase). The app falls back to mock services if no backend URL is provided.

## TLS/SSL (Root CA) for server connections
Supabase recommends TLS for Postgres connections. Most environments already trust the required CAs. If your platform requires a custom CA, use the provided `prod-ca-2021.crt` on the server side only.

Important: never ship CA files or DB credentials in the web or Expo client.

Options:
- Add `sslmode=require` (or `verify-full`) to your `DATABASE_URL` when supported.
- Provide the CA via env and load it in your server code.
- For Prisma/psql, use `PGSSLROOTCERT` or a connection parameter.

Examples
1) Node.js with `pg` (server only)
```js
import pg from 'pg'
import fs from 'node:fs'

const ssl = process.env.PGSSLROOTCERT
  ? { ca: process.env.PGSSLROOTCERT, rejectUnauthorized: true }
  : { rejectUnauthorized: true }

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL, // include ?pgbouncer=true&sslmode=require
  ssl,
})
```

Alternatively, base64 encode the CA and decode at runtime:
```sh
# locally
base64 -w0 prod-ca-2021.crt > prod-ca-2021.crt.b64
# store as secret: PGSSLROOTCERT_BASE64
```
```js
const ca = Buffer.from(process.env.PGSSLROOTCERT_BASE64 || '', 'base64').toString('utf8')
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { ca, rejectUnauthorized: true } })
```

2) Prisma (server only)
```
DATABASE_URL="postgresql://...:6543/postgres?pgbouncer=true&sslmode=require"
```
If your runtime needs a CA file, point to it via env:
```
PGSSLROOTCERT=/path/to/prod-ca-2021.crt
```

3) psql (admin/migrations)
```sh
export PGSSLROOTCERT=/path/to/prod-ca-2021.crt
psql "postgresql://...:6543/postgres?pgbouncer=true&sslmode=verify-full"
```

4) GitHub Actions (CI) — write CA to a file
```yaml
- name: Write PG SSL root cert
  if: ${{ secrets.PGSSLROOTCERT_BASE64 != '' }}
  run: |
    echo "$PGSSLROOTCERT_BASE64" | base64 -d > prod-ca-2021.crt
    echo "PGSSLROOTCERT=$PWD/prod-ca-2021.crt" >> $GITHUB_ENV
  env:
    PGSSLROOTCERT_BASE64: ${{ secrets.PGSSLROOTCERT_BASE64 }}
```
