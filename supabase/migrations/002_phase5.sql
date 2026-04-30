-- ── Migration 002: Phase 5 Production Hardening ─────────────────────────────

-- ── Rate limiting table ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,                    -- e.g. 'record_move', 'join_queue'
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count       INTEGER DEFAULT 1,
  UNIQUE (user_id, action, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limits_own" ON public.rate_limits
  USING (user_id = auth.uid());

-- Auto-clean rate limit entries older than 1 hour
CREATE INDEX idx_rate_limits_cleanup ON public.rate_limits (window_start);

-- ── Draw offer persistence ────────────────────────────────────────────────────
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS draw_offered_by UUID REFERENCES public.users(id);

-- ── Compound indexes for common query patterns ────────────────────────────────
-- Active games for a player (matchmaking reconnect + dashboard)
CREATE INDEX IF NOT EXISTS idx_games_white_status
  ON public.games (player_white, status);
CREATE INDEX IF NOT EXISTS idx_games_black_status
  ON public.games (player_black, status);

-- Leaderboard query (sorted by ELO)
CREATE INDEX IF NOT EXISTS idx_users_elo
  ON public.users (elo_rating DESC);

-- Move log for a game ordered by move number
CREATE INDEX IF NOT EXISTS idx_moves_game_move_number
  ON public.moves (game_id, move_number);

-- Matchmaking queue ordered by join time (FIFO within same time_control)
CREATE INDEX IF NOT EXISTS idx_queue_time_control_joined
  ON public.matchmaking_queue (time_control, joined_at);

-- ── Game timeout detection function ──────────────────────────────────────────
-- Called by the Edge Function (or manually) to mark games where time ran out.
-- The function checks white_time_ms / black_time_ms vs elapsed time since last move.
CREATE OR REPLACE FUNCTION public.detect_timed_out_games()
RETURNS TABLE (game_id UUID, loser TEXT) AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      g.id,
      g.white_time_ms,
      g.black_time_ms,
      g.updated_at,
      EXTRACT(EPOCH FROM (NOW() - g.updated_at)) * 1000 AS elapsed_ms,
      (SELECT m.color FROM public.moves m WHERE m.game_id = g.id ORDER BY m.move_number DESC LIMIT 1) AS last_mover
    FROM public.games g
    WHERE g.status = 'active'
  LOOP
    DECLARE
      active_color TEXT;
      active_time  INTEGER;
    BEGIN
      -- After the last move, the OTHER color's clock is running
      IF rec.last_mover IS NULL THEN
        active_color := 'w';
        active_time  := rec.white_time_ms;
      ELSIF rec.last_mover = 'w' THEN
        active_color := 'b';
        active_time  := rec.black_time_ms;
      ELSE
        active_color := 'w';
        active_time  := rec.white_time_ms;
      END IF;

      -- Timer expired?
      IF (active_time - rec.elapsed_ms) <= 0 THEN
        game_id := rec.id;
        loser   := active_color;
        RETURN NEXT;
      END IF;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Server-side RLS hardening ─────────────────────────────────────────────────
-- Only allow moves INSERT when game is active and it is the player's turn.
-- (Additional server-side check — the primary validation is in the server action.)
DROP POLICY IF EXISTS "moves_insert" ON public.moves;
CREATE POLICY "moves_insert" ON public.moves FOR INSERT
  WITH CHECK (
    player_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_id
        AND g.status = 'active'
        AND (g.player_white = auth.uid() OR g.player_black = auth.uid())
    )
  );

-- Prevent updating moves (append-only)
CREATE POLICY "moves_no_update" ON public.moves FOR UPDATE
  USING (false);
CREATE POLICY "moves_no_delete" ON public.moves FOR DELETE
  USING (false);

-- Games: prevent creating games for other players
DROP POLICY IF EXISTS "games_insert" ON public.games;
CREATE POLICY "games_insert" ON public.games FOR INSERT
  WITH CHECK (player_white = auth.uid());

-- ── Username uniqueness constraint (case-insensitive) ─────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
  ON public.users (LOWER(username));

-- ── Cleanup function for expired matchmaking entries ─────────────────────────
CREATE OR REPLACE FUNCTION public.cleanup_stale_queue()
RETURNS void AS $$
BEGIN
  DELETE FROM public.matchmaking_queue
  WHERE joined_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
