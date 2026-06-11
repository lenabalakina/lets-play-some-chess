# Online room persistence (Supabase)

Private code rooms (`/play/online`) need Supabase to survive Vercel serverless cold starts and multiple instances.

## 1. Environment variables

Copy `.env.local.example` to `.env.local` and set:

| Variable | Where |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same |
| `SUPABASE_SERVICE_ROLE_KEY` | same (server-only, never expose to client) |
| `CRON_SECRET` | Any long random string (Vercel production only) |

In **Vercel → Project → Settings → Environment Variables**, add the same four for **Production** and **Preview**.

## 2. Run migrations

In **Supabase → SQL Editor**, run in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_phase5.sql`
3. `supabase/migrations/003_private_rooms.sql`

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

- **Hourly cleanup**: Vercel cron calls `/api/cron/purge-rooms` (requires `CRON_SECRET` in production).
- **Health check**: `GET /api/room/health` — reports `memory_only`, `migration_required`, or `supabase`.
- **General DB ping**: `GET /api/keepalive` — checks `games` + `private_rooms`.

Without `SUPABASE_SERVICE_ROLE_KEY`, rooms work in-memory only and multiplayer will be unstable in production.
