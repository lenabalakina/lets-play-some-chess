-- Track actively searching clients so abandoned ranked queue rows cannot be matched.
ALTER TABLE public.matchmaking_queue
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.matchmaking_queue
SET last_seen_at = joined_at
WHERE last_seen_at IS NULL;

ALTER TABLE public.matchmaking_queue
  ALTER COLUMN last_seen_at SET DEFAULT NOW(),
  ALTER COLUMN last_seen_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'matchmaking_queue'
      AND policyname = 'queue_update'
  ) THEN
    CREATE POLICY "queue_update" ON public.matchmaking_queue FOR UPDATE
      USING (player_id = auth.uid())
      WITH CHECK (player_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_queue_time_control_last_seen_joined
  ON public.matchmaking_queue (time_control, last_seen_at, joined_at);

CREATE OR REPLACE FUNCTION public.cleanup_stale_queue()
RETURNS void AS $$
BEGIN
  DELETE FROM public.matchmaking_queue
  WHERE last_seen_at < NOW() - INTERVAL '30 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
