-- Persist private-room clocks so online time controls survive refreshes and serverless restarts.
ALTER TABLE public.private_rooms
  ADD COLUMN IF NOT EXISTS white_time_ms INTEGER NOT NULL DEFAULT 600000,
  ADD COLUMN IF NOT EXISTS black_time_ms INTEGER NOT NULL DEFAULT 600000,
  ADD COLUMN IF NOT EXISTS clock_started_at TIMESTAMPTZ;
