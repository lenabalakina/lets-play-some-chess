# Online room persistence (Supabase)

Private code rooms (`/play/online`) need Supabase to survive Vercel serverless cold starts and multiple instances.

## 1. Environment variables

**Quick setup (recommended):**

```bash
npm run configure:supabase
```

This prompts for your Supabase URL, anon key, and service role key, writes `.env.local`, and generates `CRON_SECRET`.

Keys are in **Supabase → Project Settings → API**: https://supabase.com/dashboard/project/_/settings/api

Copy the same four variables to **Vercel → Project → Settings → Environment Variables** (Production + Preview).

## 2. Run migrations

In **Supabase → SQL Editor**, paste and run **`supabase/setup-all.sql`** (all migrations in one file).

Or run individually: `001_initial_schema.sql`, `002_phase5.sql`, `003_private_rooms.sql`.

Then enable **Realtime** for tables `moves` and `games`: Dashboard → Database → Replication.

## 3. Verify

```bash
npm run setup:rooms
```

Expected: `Room persistence is ready.`

After deploy:

```bash
curl https://your-app.vercel.app/api/room/health
```

Expected: `{ "ok": true, "persistence": "supabase" }`

## 4. Operations

- **Daily cleanup**: Vercel cron calls `/api/cron/purge-rooms` once per day (Hobby plan limit; requires `CRON_SECRET` in production).
- **Health check**: `GET /api/room/health` — reports `memory_only`, `migration_required`, or `supabase`.
- **General DB ping**: `GET /api/keepalive` — checks `games` + `private_rooms`.

Without `SUPABASE_SERVICE_ROLE_KEY`, rooms work in-memory only and multiplayer will be unstable in production.
