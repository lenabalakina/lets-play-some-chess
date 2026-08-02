-- ── Ranked write hardening ──────────────────────────────────────────────────
-- Browser clients can read public/ranked data, but authoritative game state,
-- move logs, and rating statistics must only be mutated by trusted server code.

REVOKE INSERT, UPDATE, DELETE ON public.games FROM authenticated;
GRANT SELECT ON public.games TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.moves FROM authenticated;
GRANT SELECT ON public.moves TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.users FROM authenticated;
GRANT SELECT ON public.users TO authenticated;
GRANT INSERT (id, username, avatar_url) ON public.users TO authenticated;
GRANT UPDATE (username, avatar_url) ON public.users TO authenticated;

DROP POLICY IF EXISTS "games_update" ON public.games;
CREATE POLICY "games_no_client_update" ON public.games FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "moves_insert" ON public.moves;
CREATE POLICY "moves_no_client_insert" ON public.moves FOR INSERT
  WITH CHECK (false);
