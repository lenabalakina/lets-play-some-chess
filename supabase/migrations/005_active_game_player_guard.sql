-- Prevent matchmaking races from creating more than one active ranked game
-- for the same player. Both the Server Action poller and optional Supabase
-- webhook can attempt to match the same queued players concurrently.

CREATE OR REPLACE FUNCTION public.prevent_multiple_active_ranked_games()
RETURNS TRIGGER AS $$
DECLARE
  first_player  TEXT;
  second_player TEXT;
BEGIN
  IF NEW.status <> 'active' OR NEW.player_black IS NULL THEN
    RETURN NEW;
  END IF;

  first_player  := LEAST(NEW.player_white::TEXT, NEW.player_black::TEXT);
  second_player := GREATEST(NEW.player_white::TEXT, NEW.player_black::TEXT);

  -- Serialize inserts/updates that share either player before checking.
  PERFORM pg_advisory_xact_lock(hashtextextended(first_player, 0));
  IF second_player <> first_player THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(second_player, 0));
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.games g
    WHERE g.status = 'active'
      AND g.id <> NEW.id
      AND (
        g.player_white IN (NEW.player_white, NEW.player_black)
        OR g.player_black IN (NEW.player_white, NEW.player_black)
      )
  ) THEN
    RAISE EXCEPTION 'player already has an active game'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS games_single_active_player ON public.games;
CREATE TRIGGER games_single_active_player
  BEFORE INSERT OR UPDATE OF player_white, player_black, status
  ON public.games
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND NEW.player_black IS NOT NULL)
  EXECUTE FUNCTION public.prevent_multiple_active_ranked_games();
