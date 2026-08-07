-- Prevent concurrent submissions for the same turn from appending duplicate plies.
CREATE UNIQUE INDEX IF NOT EXISTS idx_moves_unique_game_move_number
  ON public.moves (game_id, move_number);
