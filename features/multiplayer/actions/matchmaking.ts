'use server'

import { createClient } from '@/lib/supabase/server'
import { createGame } from '@/server/database/queries/games'
import { TIME_CONTROL_MS } from '@/features/chess/types/chess.types'
import type { TimeControl } from '@/features/chess/types/chess.types'
import { findActiveGameForUser } from '../matchmakingActiveGame'

const ELO_WINDOW = 300  // match players within ±300 ELO

export async function joinQueue(timeControl: TimeControl): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('users')
    .select('elo_rating')
    .eq('id', user.id)
    .single()

  // Upsert in case player re-joins queue
  const { error } = await supabase
    .from('matchmaking_queue')
    .upsert({
      player_id:    user.id,
      time_control: timeControl,
      elo_rating:   profile?.elo_rating ?? 1200,
    }, { onConflict: 'player_id' })

  if (error) return { error: error.message }
  return {}
}

export async function leaveQueue(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('matchmaking_queue').delete().eq('player_id', user.id)
}

/**
 * Attempt to match the current user with a waiting opponent.
 * Returns the game ID if matched, null if still waiting.
 * This is called by the client on a polling interval.
 */
export async function attemptMatch(): Promise<{ gameId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get current player's queue entry
  const { data: myEntry } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('player_id', user.id)
    .single()

  if (!myEntry) {
    return findActiveGameForUser(supabase, user.id)
  }

  // Find the best opponent: same time control, closest ELO, not self
  const { data: opponents } = await supabase
    .from('matchmaking_queue')
    .select('*')
    .eq('time_control', myEntry.time_control)
    .neq('player_id', user.id)
    .gte('elo_rating', myEntry.elo_rating - ELO_WINDOW)
    .lte('elo_rating', myEntry.elo_rating + ELO_WINDOW)
    .order('joined_at', { ascending: true })
    .limit(5)

  if (!opponents || opponents.length === 0) return null

  // Pick closest ELO opponent
  const opponent = opponents.reduce((best, cur) =>
    Math.abs(cur.elo_rating - myEntry.elo_rating) <
    Math.abs(best.elo_rating - myEntry.elo_rating) ? cur : best
  )

  // Randomly assign colors
  const [whiteId, blackId] = Math.random() < 0.5
    ? [user.id, opponent.player_id]
    : [opponent.player_id, user.id]

  const timeLimitMs = TIME_CONTROL_MS[myEntry.time_control as TimeControl]

  // Create game (this may race — let Supabase constraints handle duplicates)
  let game: { id: string }
  try {
    game = await createGame(supabase, {
      playerWhite: whiteId,
      playerBlack: blackId,
      timeControl: myEntry.time_control,
      timeLimitMs,
    })
  } catch {
    // Another call already created the game — check if we're already in one
    return findActiveGameForUser(supabase, user.id)
  }

  // Remove both players from queue
  await supabase
    .from('matchmaking_queue')
    .delete()
    .in('player_id', [user.id, opponent.player_id])

  return { gameId: game.id }
}

/**
 * Check if the current user is already in an active game
 * (used on page load to rejoin an in-progress game).
 */
export async function getActiveGame(): Promise<{ gameId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return findActiveGameForUser(supabase, user.id)
}
