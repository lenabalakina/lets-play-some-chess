-- Private code-based rooms (no auth required). Accessed via service role from API routes only.
CREATE TABLE IF NOT EXISTS public.private_rooms (
  code              TEXT PRIMARY KEY,
  fen               TEXT NOT NULL,
  turn              TEXT NOT NULL CHECK (turn IN ('w', 'b')),
  white             TEXT,
  black             TEXT,
  status            TEXT NOT NULL CHECK (status IN ('waiting', 'playing', 'finished')),
  winner            TEXT CHECK (winner IN ('w', 'b', 'draw') OR winner IS NULL),
  moves             JSONB NOT NULL DEFAULT '[]'::jsonb,
  messages          JSONB NOT NULL DEFAULT '[]'::jsonb,
  draw_offered_by   TEXT CHECK (draw_offered_by IN ('w', 'b') OR draw_offered_by IS NULL),
  white_time_ms     INTEGER NOT NULL DEFAULT 600000,
  black_time_ms     INTEGER NOT NULL DEFAULT 600000,
  clock_started_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_private_rooms_last_activity ON public.private_rooms(last_activity_at);

ALTER TABLE public.private_rooms ENABLE ROW LEVEL SECURITY;
