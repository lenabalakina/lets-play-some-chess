/**
 * Supabase Edge Function: check-timeouts
 *
 * Runs on a cron schedule to detect expired game clocks and record results.
 * Schedule: every 30 seconds via Supabase Cron (pg_cron).
 *
 * Deploy:  supabase functions deploy check-timeouts
 * Cron SQL (run in SQL editor):
 *   SELECT cron.schedule('check-timeouts', '30 seconds',
 *     $$SELECT net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/check-timeouts',
 *       headers := '{"Authorization": "Bearer <anon-key>"}'::jsonb
 *     )$$
 *   );
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TimedOutGame {
  game_id: string
  loser: string
}

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  )

  // Call the detect function from migration 002
  const { data: timedOut, error } = await supabase.rpc('detect_timed_out_games')
  if (error) {
    console.error('detect_timed_out_games error:', error)
    return new Response('Error detecting timeouts', { status: 500 })
  }

  const games = (timedOut ?? []) as TimedOutGame[]
  if (games.length === 0) {
    return new Response(JSON.stringify({ resolved: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let resolved = 0
  for (const { game_id, loser } of games) {
    const result = loser === 'w' ? 'black' : 'white'

    const { error: updateError } = await supabase
      .from('games')
      .update({
        status:       'completed',
        result,
        completed_at: new Date().toISOString(),
      })
      .eq('id', game_id)
      .eq('status', 'active')   // guard against double-completion

    if (!updateError) {
      // ELO update — fetch both players
      const { data: game } = await supabase
        .from('games')
        .select('player_white, player_black')
        .eq('id', game_id)
        .single()

      if (game?.player_white && game?.player_black) {
        await updateElo(supabase, game.player_white, game.player_black, result as 'white' | 'black' | 'draw')
      }
      resolved++
    }
  }

  console.log(`Resolved ${resolved} timed-out game(s)`)
  return new Response(JSON.stringify({ resolved }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

async function updateElo(
  supabase: ReturnType<typeof createClient>,
  whiteId: string,
  blackId: string,
  result: 'white' | 'black' | 'draw'
) {
  const [{ data: wp }, { data: bp }] = await Promise.all([
    supabase.from('users').select('elo_rating, games_played, wins, losses, draws').eq('id', whiteId).single(),
    supabase.from('users').select('elo_rating, games_played, wins, losses, draws').eq('id', blackId).single(),
  ])
  if (!wp || !bp) return

  const k = (gp: number) => gp < 5 ? 40 : gp < 30 ? 20 : 10
  const exp = (a: number, b: number) => 1 / (1 + Math.pow(10, (b - a) / 400))
  const sc  = (r: 'win'|'loss'|'draw') => r === 'win' ? 1 : r === 'draw' ? 0.5 : 0

  const wr = result === 'white' ? 'win' : result === 'draw' ? 'draw' : 'loss'
  const br = result === 'black' ? 'win' : result === 'draw' ? 'draw' : 'loss'

  const wDelta = Math.round(k(wp.games_played) * (sc(wr) - exp(wp.elo_rating, bp.elo_rating)))
  const bDelta = Math.round(k(bp.games_played) * (sc(br) - exp(bp.elo_rating, wp.elo_rating)))

  await Promise.all([
    supabase.from('users').update({
      elo_rating:   Math.max(100, wp.elo_rating + wDelta),
      games_played: wp.games_played + 1,
      wins:   wp.wins   + (wr === 'win'  ? 1 : 0),
      losses: wp.losses + (wr === 'loss' ? 1 : 0),
      draws:  wp.draws  + (wr === 'draw' ? 1 : 0),
    }).eq('id', whiteId),
    supabase.from('users').update({
      elo_rating:   Math.max(100, bp.elo_rating + bDelta),
      games_played: bp.games_played + 1,
      wins:   bp.wins   + (br === 'win'  ? 1 : 0),
      losses: bp.losses + (br === 'loss' ? 1 : 0),
      draws:  bp.draws  + (br === 'draw' ? 1 : 0),
    }).eq('id', blackId),
  ])
}
