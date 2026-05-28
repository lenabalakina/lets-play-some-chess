'use server'

import { createClient } from '@/lib/supabase/server'
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

export async function saveGame(params: SaveGameParams) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const lastFen = params.moveHistory.at(-1)?.fen
      ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

    // Save game record
    await supabase.from('games').insert({
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

    // Update user stats (read-then-write is fine for a small app)
    const { data: profile } = await supabase
      .from('users')
      .select('wins, losses, draws, games_played')
      .eq('id', user.id)
      .single()

    if (!profile) return

    const isWin  = params.result === 'white'
    const isDraw = params.result === 'draw'

    await supabase.from('users').update({
      games_played: profile.games_played + 1,
      wins:         isWin  ? profile.wins  + 1 : profile.wins,
      losses:       !isWin && !isDraw ? profile.losses + 1 : profile.losses,
      draws:        isDraw ? profile.draws + 1 : profile.draws,
    }).eq('id', user.id)
  } catch {
    // Fire-and-forget — never crash the game over a stat save
  }
}
