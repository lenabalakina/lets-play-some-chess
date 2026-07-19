-- Server-authoritative clocks for private code-based rooms.
ALTER TABLE public.private_rooms
  ADD COLUMN IF NOT EXISTS white_ms INTEGER NOT NULL DEFAULT 600000,
  ADD COLUMN IF NOT EXISTS black_ms INTEGER NOT NULL DEFAULT 600000,
  ADD COLUMN IF NOT EXISTS clock_started_at TIMESTAMPTZ;

UPDATE public.private_rooms
SET clock_started_at = COALESCE(clock_started_at, last_activity_at)
WHERE status = 'playing';
