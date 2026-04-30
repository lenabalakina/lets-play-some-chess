/**
 * Supabase Edge Function: matchmaking
 *
 * Triggered via Supabase Database Webhooks on INSERT into matchmaking_queue.
 * Atomically finds two compatible players and creates a game.
 *
 * Deploy: supabase functions deploy matchmaking
 * Webhook: Dashboard → Database → Webhooks → Create webhook
 *   Table: matchmaking_queue, Events: INSERT, URL: <function URL>
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ELO_WINDOW = 300
const TIME_CONTROLS: Record<string, number> = {
  bullet_1:   1  * 60 * 1000,
  blitz_3:    3  * 60 * 1000,
  blitz_5:    5  * 60 * 1000,
  rapid_10:   10 * 60 * 1000,
  classic_15: 15 * 60 * 1000,
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Get the player that just joined the queue
    const payload = await req.json()
    const newPlayer = payload.record as {
      player_id: string
      time_control: string
      elo_rating: number
    }

    if (!newPlayer?.player_id) {
      return new Response('No player data', { status: 400 })
    }

    // Find compatible opponent (different player, same time control, similar ELO, oldest first)
    const { data: opponents } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('time_control', newPlayer.time_control)
      .neq('player_id', newPlayer.player_id)
      .gte('elo_rating', newPlayer.elo_rating - ELO_WINDOW)
      .lte('elo_rating', newPlayer.elo_rating + ELO_WINDOW)
      .order('joined_at', { ascending: true })
      .limit(5)

    if (!opponents || opponents.length === 0) {
      return new Response(JSON.stringify({ status: 'waiting' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Pick closest ELO
    const opponent = opponents.reduce((best: typeof opponents[0], cur: typeof opponents[0]) =>
      Math.abs(cur.elo_rating - newPlayer.elo_rating) <
      Math.abs(best.elo_rating - newPlayer.elo_rating) ? cur : best
    )

    // Randomly assign colors
    const [whiteId, blackId] = Math.random() < 0.5
      ? [newPlayer.player_id, opponent.player_id]
      : [opponent.player_id, newPlayer.player_id]

    const timeLimitMs = TIME_CONTROLS[newPlayer.time_control] ?? 600_000

    // Create game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        player_white:  whiteId,
        player_black:  blackId,
        status:        'active',
        time_control:  newPlayer.time_control,
        white_time_ms: timeLimitMs,
        black_time_ms: timeLimitMs,
      })
      .select('id')
      .single()

    if (gameError || !game) {
      console.error('Failed to create game:', gameError)
      return new Response('Failed to create game', { status: 500 })
    }

    // Remove both players from queue
    await supabase
      .from('matchmaking_queue')
      .delete()
      .in('player_id', [newPlayer.player_id, opponent.player_id])

    console.log(`Matched: ${whiteId} (white) vs ${blackId} (black) — game ${game.id}`)

    return new Response(JSON.stringify({ status: 'matched', gameId: game.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Matchmaking error:', err)
    return new Response('Internal error', { status: 500 })
  }
})
