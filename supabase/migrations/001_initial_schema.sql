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
