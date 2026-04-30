'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Clock, Flag, Handshake, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { GameResultColor } from '@/features/chess/types/chess.types'
import type { Color } from '@/features/chess/types/chess.types'
import { createClient } from '@/lib/supabase/client'

type EndReason = 'checkmate' | 'timeout' | 'resign' | 'draw' | 'stalemate' | 'opponent_resigned'

interface Props {
  open:        boolean
  result:      GameResultColor | null
  myColor:     Color
  reason:      EndReason
  myUsername:  string
  oppUsername: string
  myElo:       number          // ELO before the game
  userId:      string
  onNewGame:   () => void
  onDashboard: () => void
}

const REASON_ICON: Record<EndReason, React.ComponentType<{ className?: string }>> = {
  checkmate:        Trophy,
  timeout:          Clock,
  resign:           Flag,
  opponent_resigned: Flag,
  draw:             Handshake,
  stalemate:        Handshake,
}

const REASON_LABEL: Record<EndReason, string> = {
  checkmate:        'by checkmate',
  timeout:          'on time',
  resign:           'by resignation',
  opponent_resigned: 'opponent resigned',
  draw:             'by agreement',
  stalemate:        'by stalemate',
}

export function GameResultModal({
  open, result, myColor, reason, myUsername, oppUsername, myElo, userId, onNewGame, onDashboard,
}: Props) {
  const [newElo, setNewElo] = useState<number | null>(null)

  // Fetch updated ELO from DB after game ends
  useEffect(() => {
    if (!open || !userId) return
    const supabase = createClient()
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('elo_rating')
        .eq('id', userId)
        .single()
      if (data) setNewElo((data as { elo_rating: number }).elo_rating)
    }, 1200)  // small delay for ELO update to propagate
    return () => clearTimeout(timer)
  }, [open, userId])

  if (!result) return null

  const myResultColor: GameResultColor = myColor === 'w' ? 'white' : 'black'
  const iWon   = result === myResultColor
  const isDraw = result === 'draw'
  const iLost  = !iWon && !isDraw

  const eloDelta = newElo !== null ? newElo - myElo : null

  const ReasonIcon = REASON_ICON[reason]

  const titleText    = isDraw ? 'Draw' : iWon ? 'Victory!' : 'Defeat'
  const titleColor   = isDraw ? 'text-slate-300' : iWon ? 'text-emerald-300' : 'text-red-400'
  const glowColor    = isDraw ? 'rgba(148,163,184,0.2)' : iWon ? 'rgba(52,211,153,0.25)' : 'rgba(239,68,68,0.2)'
  const borderColor  = isDraw ? 'border-slate-600/50' : iWon ? 'border-emerald-500/40' : 'border-red-800/40'

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm"
            onClick={onDashboard}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 30 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className={`glass-panel rounded-2xl p-8 w-full max-w-sm border ${borderColor} pointer-events-auto`}
              style={{ boxShadow: `0 0 80px ${glowColor}` }}
            >
              {/* Title */}
              <div className="text-center mb-6">
                <motion.h2
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`text-4xl font-black tracking-tight ${titleColor} mb-2`}
                  style={iWon ? { textShadow: '0 0 30px rgba(52,211,153,0.6)' } : undefined}
                >
                  {titleText}
                </motion.h2>

                <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                  <ReasonIcon className="w-3.5 h-3.5" />
                  <span>{REASON_LABEL[reason]}</span>
                </div>
              </div>

              {/* Players */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-center justify-between mb-6 px-2"
              >
                <div className={`text-center ${iWon ? 'opacity-100' : 'opacity-50'}`}>
                  <p className="text-white font-semibold text-sm">{myUsername}</p>
                  <p className="text-slate-500 text-xs">{myColor === 'w' ? 'White' : 'Black'}</p>
                </div>

                <div className="text-slate-600 font-bold text-lg">vs</div>

                <div className={`text-center ${iLost ? 'opacity-100' : 'opacity-50'}`}>
                  <p className="text-white font-semibold text-sm">{oppUsername}</p>
                  <p className="text-slate-500 text-xs">{myColor === 'w' ? 'Black' : 'White'}</p>
                </div>
              </motion.div>

              {/* ELO change */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-slate-900/60 rounded-xl p-4 mb-6 text-center border border-slate-800/50"
              >
                <p className="text-slate-500 text-xs font-semibold tracking-widest uppercase mb-2">ELO Rating</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-slate-400 font-mono text-lg">{myElo}</span>
                  <span className="text-slate-600">→</span>
                  {newElo !== null ? (
                    <>
                      <span className="text-white font-mono text-lg font-bold">{newElo}</span>
                      {eloDelta !== null && eloDelta !== 0 && (
                        <span className={`flex items-center gap-0.5 text-sm font-bold ${eloDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {eloDelta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {eloDelta > 0 ? '+' : ''}{eloDelta}
                        </span>
                      )}
                      {eloDelta === 0 && (
                        <span className="flex items-center gap-0.5 text-sm text-slate-400">
                          <Minus className="w-3.5 h-3.5" /> 0
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-600 text-sm animate-pulse">loading…</span>
                  )}
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex gap-3"
              >
                <button
                  onClick={onNewGame}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold tracking-wider
                    bg-cyan-500/20 text-cyan-300 border border-cyan-500/60
                    hover:bg-cyan-500/30 hover:border-cyan-400/80
                    shadow-[0_0_15px_rgba(6,182,212,0.2)]
                    transition-all"
                >
                  New Game
                </button>
                <button
                  onClick={onDashboard}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold tracking-wider
                    bg-slate-800/60 text-slate-300 border border-slate-700
                    hover:border-slate-500 transition-all"
                >
                  Dashboard
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
