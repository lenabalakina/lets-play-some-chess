'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Clock, Flag, Handshake, TrendingUp, TrendingDown, Minus, RotateCcw, LayoutDashboard, Zap } from 'lucide-react'
import type { GameResultColor, Color } from '@/features/chess/types/chess.types'
import { createClient } from '@/lib/supabase/client'

type EndReason = 'checkmate' | 'timeout' | 'resign' | 'draw' | 'stalemate' | 'opponent_resigned'

interface Props {
  open:         boolean
  result:       GameResultColor | null
  myColor:      Color
  reason:       EndReason
  myUsername:   string
  oppUsername:  string
  myElo:        number
  userId:       string
  onNewGame:    () => void
  onDashboard:  () => void
  onRematch?:   () => void
}

const REASON_ICON: Record<EndReason, React.ComponentType<{ className?: string }>> = {
  checkmate:         Trophy,
  timeout:           Clock,
  resign:            Flag,
  opponent_resigned: Flag,
  draw:              Handshake,
  stalemate:         Handshake,
}

const REASON_LABEL: Record<EndReason, string> = {
  checkmate:         'by checkmate',
  timeout:           'on time',
  resign:            'by resignation',
  opponent_resigned: 'opponent resigned',
  draw:              'by agreement',
  stalemate:         'by stalemate',
}

async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default
  const colors = ['#06b6d4', '#8b5cf6', '#22d3ee', '#a78bfa', '#ffffff']

  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.55 },
    colors,
    scalar: 1.1,
  })
  setTimeout(() => confetti({
    particleCount: 60,
    spread: 60,
    origin: { x: 0.2, y: 0.6 },
    colors,
    angle: 60,
  }), 200)
  setTimeout(() => confetti({
    particleCount: 60,
    spread: 60,
    origin: { x: 0.8, y: 0.6 },
    colors,
    angle: 120,
  }), 350)
}

export function GameResultModal({
  open, result, myColor, reason, myUsername, oppUsername,
  myElo, userId, onNewGame, onDashboard, onRematch,
}: Props) {
  const [newElo, setNewElo] = useState<number | null>(null)
  const firedRef = useRef(false)

  const myResultColor: GameResultColor = myColor === 'w' ? 'white' : 'black'
  const iWon   = result === myResultColor
  const isDraw = result === 'draw'
  const iLost  = !iWon && !isDraw

  // Fetch updated ELO
  useEffect(() => {
    if (!open || !userId) return
    setNewElo(null)
    firedRef.current = false
    const supabase = createClient()
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('elo_rating')
        .eq('id', userId)
        .single()
      if (data) setNewElo((data as { elo_rating: number }).elo_rating)
    }, 1200)
    return () => clearTimeout(timer)
  }, [open, userId])

  // Confetti on win
  useEffect(() => {
    if (open && iWon && !firedRef.current) {
      firedRef.current = true
      setTimeout(fireConfetti, 400)
    }
  }, [open, iWon])

  if (!result) return null

  const eloDelta = newElo !== null ? newElo - myElo : null

  const ReasonIcon  = REASON_ICON[reason]
  const titleText   = isDraw ? 'Draw' : iWon ? 'Victory!' : 'Defeat'
  const titleColor  = isDraw ? 'text-slate-300' : iWon ? 'text-emerald-300' : 'text-red-400'
  const glowColor   = isDraw ? 'rgba(148,163,184,0.15)' : iWon ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.2)'
  const borderColor = isDraw ? 'border-slate-600/40' : iWon ? 'border-emerald-500/40' : 'border-red-800/40'
  const emoji       = isDraw ? '🤝' : iWon ? '🏆' : '💀'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.75, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className={`glass-panel rounded-2xl w-full max-w-sm border ${borderColor} pointer-events-auto overflow-hidden`}
              style={{ boxShadow: `0 0 80px ${glowColor}, 0 25px 60px rgba(0,0,0,0.5)` }}
            >
              {/* Top colour strip */}
              <div className={`h-1.5 w-full ${iWon ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : isDraw ? 'bg-gradient-to-r from-slate-500 to-slate-400' : 'bg-gradient-to-r from-red-600 to-rose-500'}`} />

              <div className="p-6 sm:p-8">
                {/* Emoji + title */}
                <motion.div
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center mb-5"
                >
                  <div className="text-5xl mb-3 select-none">{emoji}</div>
                  <h2 className={`text-4xl font-black tracking-tight ${titleColor}`}
                    style={iWon ? { textShadow: '0 0 30px rgba(52,211,153,0.7)' } : undefined}>
                    {titleText}
                  </h2>
                  <div className="flex items-center justify-center gap-1.5 text-slate-400 text-sm mt-2">
                    <ReasonIcon className="w-3.5 h-3.5" />
                    {REASON_LABEL[reason]}
                  </div>
                </motion.div>

                {/* Players */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center justify-between mb-5 px-1"
                >
                  <div className={`text-center flex-1 ${iWon ? 'opacity-100' : 'opacity-40'}`}>
                    <p className="text-white font-bold text-sm truncate">{myUsername}</p>
                    <p className="text-slate-500 text-xs">{myColor === 'w' ? 'White' : 'Black'}</p>
                  </div>
                  <div className="text-slate-600 font-bold px-3">vs</div>
                  <div className={`text-center flex-1 ${iLost ? 'opacity-100' : 'opacity-40'}`}>
                    <p className="text-white font-bold text-sm truncate">{oppUsername}</p>
                    <p className="text-slate-500 text-xs">{myColor === 'w' ? 'Black' : 'White'}</p>
                  </div>
                </motion.div>

                {/* ELO */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl p-4 mb-5 text-center border border-slate-800/60 bg-slate-900/50"
                >
                  <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase mb-2">ELO Rating</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-slate-400 font-mono text-xl">{myElo}</span>
                    <span className="text-slate-600 text-lg">→</span>
                    {newElo !== null ? (
                      <>
                        <span className="text-white font-mono text-xl font-black">{newElo}</span>
                        {eloDelta !== null && eloDelta !== 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.5 }}
                            className={`flex items-center gap-0.5 text-base font-black ${eloDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}
                          >
                            {eloDelta > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {eloDelta > 0 ? '+' : ''}{eloDelta}
                          </motion.span>
                        )}
                        {eloDelta === 0 && (
                          <span className="flex items-center gap-0.5 text-sm text-slate-500">
                            <Minus className="w-3.5 h-3.5" /> 0
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-600 text-sm animate-pulse">updating…</span>
                    )}
                  </div>
                </motion.div>

                {/* Buttons */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="flex flex-col gap-2"
                >
                  {/* Rematch — prominent if available */}
                  {onRematch && (
                    <button
                      onClick={onRematch}
                      className="w-full py-3 rounded-xl text-sm font-black tracking-wider
                        bg-cyan-500 hover:bg-cyan-400 text-slate-950
                        shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]
                        transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      REMATCH
                    </button>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={onNewGame}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold tracking-wider
                        bg-cyan-500/15 text-cyan-300 border border-cyan-500/50
                        hover:bg-cyan-500/25 hover:border-cyan-400/70 transition-all
                        flex items-center justify-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      New Game
                    </button>
                    <button
                      onClick={onDashboard}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold tracking-wider
                        bg-slate-800/60 text-slate-300 border border-slate-700
                        hover:border-slate-500 transition-all
                        flex items-center justify-center gap-1.5"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      Dashboard
                    </button>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
