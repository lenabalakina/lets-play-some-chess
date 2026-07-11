'use server'

import { Chess } from 'chess.js'
import { createClient } from '@/lib/supabase/server'
import {
  getGame,
  updateGameState,
  completeGame,
  setDrawOffer,
  clearDrawOffer,
  completeAcceptedDraw,
  getPlayerProfile,
  updatePlayerStats,
} from '@/server/database/queries/games'
import { insertMove } from '@/server/database/queries/moves'
import { calculateElo } from '@/features/rating/eloCalculator'
import { validate, recordMoveSchema, gameIdSchema } from '@/lib/validate'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

interface MoveResult {
  error?:      string
  san?:        string
  fen?:        string
  isGameOver?: boolean
  result?:     'white' | 'black' | 'draw'
}

interface DrawOfferResult {
  error?:    string
  offered?:  boolean
}

interface AcceptDrawResult {
  error?:    string
  accepted?: boolean
}

export async function recordMove(
  gameId:      string,
  from:        string,
  to:          string,
  promotion:   string | undefined,
  timeTakenMs: number
): Promise<MoveResult> {
  // Input validation
  const v = validate(recordMoveSchema, { gameId, from, to, promotion, timeTakenMs })
  if ('error' in v) return { error: v.error }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Rate limit: max 30 moves per 10 seconds per user
  const rl = await checkRateLimit({ supabase, userId: user.id, ...RATE_LIMITS.RECORD_MOVE })
  if (!rl.allowed) return { error: 'Too many moves. Slow down.' }

  const game = await getGame(supabase, gameId)
  if (!game) return { error: 'Game not found' }
  if (game.status !== 'active') return { error: 'Game is not active' }

  // Validate user is a player
  const isWhite = game.player_white === user.id
  const isBlack = game.player_black === user.id
  if (!isWhite && !isBlack) return { error: 'Not a player in this game' }

  // Server-side move validation
  const chess = new Chess(game.fen)
  const currentTurn = chess.turn()
  const expectedTurn = isWhite ? 'w' : 'b'
  if (currentTurn !== expectedTurn) return { error: 'Not your turn' }

  let moveResult
  try {
    moveResult = chess.move({ from, to, promotion: promotion ?? 'q' })
  } catch {
    return { error: 'Illegal move' }
  }
  if (!moveResult) return { error: 'Illegal move' }

  // Update timers
  const newWhiteMs = isWhite
    ? Math.max(0, game.white_time_ms - timeTakenMs)
    : game.white_time_ms
  const newBlackMs = isBlack
    ? Math.max(0, game.black_time_ms - timeTakenMs)
    : game.black_time_ms

  const currentMoves = Array.isArray(game.moves) ? game.moves : []
  const moveNumber   = currentMoves.length + 1

  // Persist move
  await insertMove(supabase, {
    gameId,
    playerId:    user.id,
    moveSan:     moveResult.san,
    moveFrom:    from,
    moveTo:      to,
    fenAfter:    chess.fen(),
    moveNumber,
    color:       moveResult.color as 'w' | 'b',
    timeTakenMs,
  })

  // Check game-over conditions
  const isGameOver = chess.isGameOver()
  let result: 'white' | 'black' | 'draw' | undefined

  if (isGameOver) {
    if (chess.isCheckmate()) {
      result = chess.turn() === 'w' ? 'black' : 'white'
    } else {
      result = 'draw'  // stalemate, insufficient material, 50-move, etc.
    }
  } else if (newWhiteMs <= 0) {
    result = 'black'
  } else if (newBlackMs <= 0) {
    result = 'white'
  }

  if (result) {
    await completeGame(supabase, gameId, result)
    await applyEloUpdate(supabase, game.player_white, game.player_black!, result)
  } else {
    await updateGameState(supabase, gameId, {
      fen:         chess.fen(),
      moves:       [...currentMoves, { san: moveResult.san, from, to }],
      whiteTimeMs: newWhiteMs,
      blackTimeMs: newBlackMs,
    })
  }

  return {
    san:        moveResult.san,
    fen:        chess.fen(),
    isGameOver: !!result,
    result,
  }
}

export async function resignGame(gameId: string): Promise<{ error?: string }> {
  const v = validate(gameIdSchema, { gameId })
  if ('error' in v) return { error: v.error }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const game = await getGame(supabase, gameId)
  if (!game) return { error: 'Game not found' }
  if (game.status !== 'active') return { error: 'Game is not active' }

  const isWhite = game.player_white === user.id
  if (!isWhite && game.player_black !== user.id) return { error: 'Not a player' }

  const result = isWhite ? 'black' : 'white'
  await completeGame(supabase, gameId, result)
  if (game.player_black) {
    await applyEloUpdate(supabase, game.player_white, game.player_black, result)
  }
  return {}
}

export async function offerDraw(gameId: string): Promise<DrawOfferResult> {
  const v = validate(gameIdSchema, { gameId })
  if ('error' in v) return { error: v.error }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const game = await getGame(supabase, gameId)
  if (!game) return { error: 'Game not found' }
  if (game.status !== 'active') return { error: 'Game not active' }

  const isWhite = game.player_white === user.id
  const isBlack = game.player_black === user.id
  if (!isWhite && !isBlack) return { error: 'Not a player' }
  if (!game.player_black) return { error: 'No opponent to offer a draw' }

  const pendingOfferBy = game.draw_offered_by
  if (pendingOfferBy === user.id) return { error: 'Draw already offered' }
  if (pendingOfferBy) return { error: 'Opponent already offered a draw' }

  const offered = await setDrawOffer(supabase, gameId, user.id)
  return offered
    ? { offered: true }
    : { error: 'Draw offer changed. Please refresh and try again.' }
}

export async function acceptDraw(gameId: string): Promise<AcceptDrawResult> {
  const v = validate(gameIdSchema, { gameId })
  if ('error' in v) return { error: v.error }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const game = await getGame(supabase, gameId)
  if (!game) return { error: 'Game not found' }
  if (game.status !== 'active') return { error: 'Game not active' }

  const isWhite = game.player_white === user.id
  const isBlack = game.player_black === user.id
  if (!isWhite && !isBlack) return { error: 'Not a player' }
  if (!game.player_black) return { error: 'No opponent to accept a draw from' }

  const pendingOfferBy = game.draw_offered_by
  if (!pendingOfferBy) {
    return { error: 'No draw offer to accept' }
  }

  if (pendingOfferBy === user.id) return { error: 'Draw already offered' }
  if (pendingOfferBy !== game.player_white && pendingOfferBy !== game.player_black) {
    return { error: 'Invalid draw offer' }
  }

  const completed = await completeAcceptedDraw(supabase, gameId, pendingOfferBy)
  if (!completed) return { error: 'Draw offer is no longer available' }
  if (game.player_black) {
    await applyEloUpdate(supabase, game.player_white, game.player_black, 'draw')
  }
  return { accepted: true }
}

export async function declineDraw(gameId: string): Promise<{ error?: string }> {
  const v = validate(gameIdSchema, { gameId })
  if ('error' in v) return { error: v.error }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const game = await getGame(supabase, gameId)
  if (!game) return { error: 'Game not found' }
  if (game.status !== 'active') return { error: 'Game not active' }

  const isWhite = game.player_white === user.id
  const isBlack = game.player_black === user.id
  if (!isWhite && !isBlack) return { error: 'Not a player' }
  if (!game.draw_offered_by || game.draw_offered_by === user.id) {
    return { error: 'No draw offer to decline' }
  }

  const cleared = await clearDrawOffer(supabase, gameId, game.draw_offered_by)
  return cleared ? {} : { error: 'Draw offer is no longer available' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function applyEloUpdate(
  supabase: any,
  whiteId: string,
  blackId: string,
  result: 'white' | 'black' | 'draw'
) {
  const [whiteProfile, blackProfile] = await Promise.all([
    getPlayerProfile(supabase, whiteId),
    getPlayerProfile(supabase, blackId),
  ])
  if (!whiteProfile || !blackProfile) return

  const eloUpdate = calculateElo(
    whiteProfile.elo_rating ?? 1200,
    blackProfile.elo_rating ?? 1200,
    whiteProfile.games_played ?? 0,
    blackProfile.games_played ?? 0,
    result
  )

  await Promise.all([
    updatePlayerStats(supabase, whiteId, {
      newElo:  eloUpdate.whiteNewElo,
      result:  result === 'white' ? 'win' : result === 'draw' ? 'draw' : 'loss',
    }),
    updatePlayerStats(supabase, blackId, {
      newElo:  eloUpdate.blackNewElo,
      result:  result === 'black' ? 'win' : result === 'draw' ? 'draw' : 'loss',
    }),
  ])
}
