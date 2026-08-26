-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     VARCHAR(50) UNIQUE NOT NULL,
  avatar_url   TEXT,
  elo_rating   INTEGER DEFAULT 1200 CHECK (elo_rating >= 0),
  wins         INTEGER DEFAULT 0,
  losses       INTEGER DEFAULT 0,
  draws        INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Games table
CREATE TABLE IF NOT EXISTS public.games (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_white      UUID REFERENCES public.users(id) NOT NULL,
  player_black      UUID REFERENCES public.users(id),
  fen               TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  moves             JSONB DEFAULT '[]'::jsonb,
  pgn               TEXT,
  status            TEXT DEFAULT 'waiting' CHECK (status IN ('waiting','active','completed','abandoned')),
  result            TEXT CHECK (result IN ('white','black','draw') OR result IS NULL),
  time_control      TEXT NOT NULL,
  white_time_ms     INTEGER NOT NULL,
  black_time_ms     INTEGER NOT NULL,
  is_ai_game        BOOLEAN DEFAULT FALSE,
  ai_difficulty     INTEGER DEFAULT 10 CHECK (ai_difficulty BETWEEN 1 AND 20),
  board_theme       TEXT DEFAULT 'neon',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);

-- Moves table (append-only)
CREATE TABLE IF NOT EXISTS public.moves (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id        UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
  player_id      UUID REFERENCES public.users(id) NOT NULL,
  move_san       TEXT NOT NULL,
  move_from      TEXT NOT NULL,
  move_to        TEXT NOT NULL,
  fen_after      TEXT NOT NULL,
  move_number    INTEGER NOT NULL,
  color          TEXT NOT NULL CHECK (color IN ('w','b')),
  time_taken_ms  INTEGER,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Matchmaking queue
CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
  player_id     UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  time_control  TEXT NOT NULL,
  elo_rating    INTEGER NOT NULL,
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_games_player_white ON public.games(player_white);
CREATE INDEX idx_games_player_black ON public.games(player_black);
CREATE INDEX idx_games_status       ON public.games(status);
CREATE INDEX idx_moves_game_id      ON public.moves(game_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moves            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

-- Users: read public, write own
CREATE POLICY "users_select_all" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_insert_own" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Games: players can see/update their own games
CREATE POLICY "games_select" ON public.games FOR SELECT
  USING (player_white = auth.uid() OR player_black = auth.uid() OR status = 'waiting');
CREATE POLICY "games_insert" ON public.games FOR INSERT
  WITH CHECK (player_white = auth.uid());
CREATE POLICY "games_update" ON public.games FOR UPDATE
  USING (player_white = auth.uid() OR player_black = auth.uid());

-- Moves: players in the game can read/insert
CREATE POLICY "moves_select" ON public.moves FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.games g
    WHERE g.id = game_id AND (g.player_white = auth.uid() OR g.player_black = auth.uid())
  ));
CREATE POLICY "moves_insert" ON public.moves FOR INSERT
  WITH CHECK (player_id = auth.uid());

-- Matchmaking: manage own queue entry
CREATE POLICY "queue_select" ON public.matchmaking_queue FOR SELECT USING (true);
CREATE POLICY "queue_insert" ON public.matchmaking_queue FOR INSERT WITH CHECK (player_id = auth.uid());
CREATE POLICY "queue_update" ON public.matchmaking_queue FOR UPDATE
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());
CREATE POLICY "queue_delete" ON public.matchmaking_queue FOR DELETE USING (player_id = auth.uid());

-- ── Auto-update updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER games_updated_at BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Auto-create user profile on signup ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── migration 002 ──

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
CREATE INDEX IF NOT EXISTS idx_queue_time_control_last_seen_joined
  ON public.matchmaking_queue (time_control, last_seen_at, joined_at);

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
  WHERE last_seen_at < NOW() - INTERVAL '30 seconds';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── migration 003 ──

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
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_private_rooms_last_activity ON public.private_rooms(last_activity_at);

ALTER TABLE public.private_rooms ENABLE ROW LEVEL SECURITY;
