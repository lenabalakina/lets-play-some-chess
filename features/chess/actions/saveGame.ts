'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdminClient } from '@/lib/supabase/admin'
import type { MoveRecord } from '@/features/chess/types/chess.types'

interface SaveGameParams {
  result:        'white' | 'black' | 'draw'
  reason:        'checkmate' | 'resign' | 'draw' | 'timeout' | 'stalemate'
  moveHistory:   MoveRecord[]
  timeControl:   string
  whiteTimeLeft: number
  blackTimeLeft: number
  isAiGame:      boolean
  aiLevel?:      'easy' | 'intermediate' | 'hard'
  theme:         string
}

const AI_DIFFICULTY: Record<string, number> = { easy: 5, intermediate: 8, hard: 20 }
const AI_ELO:        Record<string, number> = { easy: 800, intermediate: 1400, hard: 2200 }

function calcNewElo(myElo: number, oppElo: number, score: 0 | 0.5 | 1, gamesPlayed: number): number {
  const K        = gamesPlayed < 30 ? 32 : gamesPlayed < 100 ? 24 : 16
  const expected = 1 / (1 + Math.pow(10, (oppElo - myElo) / 400))
  return Math.max(100, Math.round(myElo + K * (score - expected)))
}

export async function saveGame(params: SaveGameParams) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const writeDb = requireAdminClient()

    const lastFen = params.moveHistory.at(-1)?.fen
      ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    await writeDb.from('games').insert({
      player_white:  user.id,
      player_black:  null,
      fen:           lastFen,
      moves:         params.moveHistory as unknown as import('@/lib/supabase/types').Json,
      status:        'completed' as const,
      result:        params.result,
      time_control:  params.timeControl,
      white_time_ms: params.whiteTimeLeft,
      black_time_ms: params.blackTimeLeft,
      is_ai_game:    params.isAiGame,
      ai_difficulty: AI_DIFFICULTY[params.aiLevel ?? 'easy'] ?? 10,
      board_theme:   params.theme,
    })

    const { data: profile } = await writeDb
      .from('users')
      .select('wins, losses, draws, games_played, elo_rating')
      .eq('id', user.id)
      .single()

    // If no profile row exists yet (e.g. trigger didn't fire), create one with defaults
    const p = profile ?? { wins: 0, losses: 0, draws: 0, games_played: 0, elo_rating: 1200 }
    if (!profile) {
      await writeDb.from('users').upsert({
        id: user.id,
        username: user.email?.split('@')[0] ?? 'player',
        elo_rating: 1200,
      })
    }

    const isWin  = params.result === 'white'
    const isDraw = params.result === 'draw'

    // Only recalculate ELO for AI games — local pass-and-play has no real opponent
    let newElo = p.elo_rating
    if (params.isAiGame) {
      const aiElo = AI_ELO[params.aiLevel ?? 'easy']
      const score: 0 | 0.5 | 1 = isWin ? 1 : isDraw ? 0.5 : 0
      newElo = calcNewElo(p.elo_rating, aiElo, score, p.games_played)
    }

    await writeDb.from('users').update({
      games_played: p.games_played + 1,
      wins:         isWin  ? p.wins  + 1 : p.wins,
      losses:       !isWin && !isDraw ? p.losses + 1 : p.losses,
      draws:        isDraw ? p.draws + 1 : p.draws,
      elo_rating:   newElo,
    }).eq('id', user.id)
  } catch {
    // Fire-and-forget — never crash the game over a stat save
  }
}
