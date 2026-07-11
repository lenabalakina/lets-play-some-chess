// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any
import type { Game } from '@/lib/supabase/types'

export async function getGame(db: DB, gameId: string) {
  const { data, error } = await db
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single() as { data: Game | null; error: unknown }
  if (error) return null
  return data
}

export async function createGame(db: DB, params: {
  playerWhite:  string
  playerBlack:  string
  timeControl:  string
  timeLimitMs:  number
  isAiGame?:    boolean
}) {
  const { data, error } = await db
    .from('games')
    .insert({
      player_white:  params.playerWhite,
      player_black:  params.playerBlack,
      status:        'active',
      time_control:  params.timeControl,
      white_time_ms: params.timeLimitMs,
      black_time_ms: params.timeLimitMs,
      is_ai_game:    params.isAiGame ?? false,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data as { id: string }
}

export async function updateGameState(db: DB, gameId: string, params: {
  fen:          string
  moves:        unknown[]
  whiteTimeMs:  number
  blackTimeMs:  number
}) {
  const { error } = await db
    .from('games')
    .update({
      fen:           params.fen,
      moves:         params.moves,
      white_time_ms: params.whiteTimeMs,
      black_time_ms: params.blackTimeMs,
    })
    .eq('id', gameId)

  if (error) throw new Error(error.message)
}

export async function completeGame(db: DB, gameId: string, result: 'white' | 'black' | 'draw') {
  const { error } = await db
    .from('games')
    .update({
      status:       'completed',
      result,
      completed_at: new Date().toISOString(),
      draw_offered_by: null,
    })
    .eq('id', gameId)

  if (error) throw new Error(error.message)
}

export async function setDrawOffer(db: DB, gameId: string, userId: string): Promise<boolean> {
  const { data, error } = await db
    .from('games')
    .update({ draw_offered_by: userId })
    .eq('id', gameId)
    .eq('status', 'active')
    .is('draw_offered_by', null)
    .select('id')
    .maybeSingle() as { data: { id: string } | null; error: { message: string } | null }

  if (error) throw new Error(error.message)
  return !!data
}

export async function clearDrawOffer(db: DB, gameId: string, offeredBy: string): Promise<boolean> {
  const { data, error } = await db
    .from('games')
    .update({ draw_offered_by: null })
    .eq('id', gameId)
    .eq('status', 'active')
    .eq('draw_offered_by', offeredBy)
    .select('id')
    .maybeSingle() as { data: { id: string } | null; error: { message: string } | null }

  if (error) throw new Error(error.message)
  return !!data
}

export async function completeAcceptedDraw(db: DB, gameId: string, offeredBy: string): Promise<boolean> {
  const { data, error } = await db
    .from('games')
    .update({
      status:          'completed',
      result:          'draw',
      completed_at:    new Date().toISOString(),
      draw_offered_by: null,
    })
    .eq('id', gameId)
    .eq('status', 'active')
    .eq('draw_offered_by', offeredBy)
    .select('id')
    .maybeSingle() as { data: { id: string } | null; error: { message: string } | null }

  if (error) throw new Error(error.message)
  return !!data
}

export async function getPlayerProfile(db: DB, userId: string): Promise<{
  elo_rating: number; games_played: number; wins: number; losses: number; draws: number
} | null> {
  const { data } = await db
    .from('users')
    .select('elo_rating, games_played, wins, losses, draws')
    .eq('id', userId)
    .single()
  return data ?? null
}

export async function updatePlayerStats(db: DB, userId: string, params: {
  newElo:    number
  result:    'win' | 'loss' | 'draw'
}) {
  // Supabase doesn't support increment expressions in update directly,
  // so we fetch first and add 1.
  const { data: current } = await db
    .from('users')
    .select('wins, losses, draws, games_played')
    .eq('id', userId)
    .single()

  if (!current) return

  const update: Record<string, number> = {
    elo_rating:   params.newElo,
    games_played: (current.games_played ?? 0) + 1,
    wins:         (current.wins   ?? 0) + (params.result === 'win'  ? 1 : 0),
    losses:       (current.losses ?? 0) + (params.result === 'loss' ? 1 : 0),
    draws:        (current.draws  ?? 0) + (params.result === 'draw' ? 1 : 0),
  }

  await db.from('users').update(update).eq('id', userId)
}
