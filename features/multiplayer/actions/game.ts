'use server'

import { Chess } from 'chess.js'
import { createClient } from '@/lib/supabase/server'
import {
  getGame,
  updateGameState,
  completeGame,
  getPlayerProfile,
  updatePlayerStats,
  setDrawOffer,
  completeAcceptedDraw,
} from '@/server/database/queries/games'
import { insertMove } from '@/server/database/queries/moves'
import { calculateElo } from '@/features/rating/eloCalculator'
import { validate, recordMoveSchema, gameIdSchema } from '@/lib/validate'
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import { validateDrawAcceptanceRequest, validateDrawOfferRequest } from '@/features/multiplayer/drawOffers'

interface MoveResult {
  error?:      string
  san?:        string
  fen?:        string
  isGameOver?: boolean
  result?:     'white' | 'black' | 'draw'
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

export async function offerDraw(gameId: string): Promise<{ error?: string }> {
  const v = validate(gameIdSchema, { gameId })
  if ('error' in v) return { error: v.error }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const game = await getGame(supabase, gameId)
  if (!game) return { error: 'Game not found' }

  const drawError = validateDrawOfferRequest(game, user.id)
  if (drawError) return { error: drawError }

  const offered = await setDrawOffer(supabase, gameId, user.id)
  if (!offered) return { error: 'Draw offer no longer available' }
  return {}
}

export async function acceptDraw(gameId: string): Promise<{ error?: string }> {
  const v = validate(gameIdSchema, { gameId })
  if ('error' in v) return { error: v.error }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const game = await getGame(supabase, gameId)
  if (!game) return { error: 'Game not found' }

  const drawError = validateDrawAcceptanceRequest(game, user.id)
  if (drawError) return { error: drawError }

  const accepted = await completeAcceptedDraw(supabase, gameId, game.draw_offered_by!)
  if (!accepted) return { error: 'Draw offer no longer available' }
  if (game.player_black) {
    await applyEloUpdate(supabase, game.player_white, game.player_black, 'draw')
  }
  return {}
}

async function applyEloUpdate(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
