'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Flag, Handshake, TrendingUp, TrendingDown, Minus, RotateCcw, LayoutDashboard, Zap, Trophy } from 'lucide-react'
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

const WIN_MESSAGES = [
  'ABSOLUTELY LEGENDARY',
  'YOU ARE UNSTOPPABLE',
  'CHESS MASTER',
  'PURE GENIUS',
  'UTTERLY MAGNIFICENT',
  'THE CROWD GOES WILD',
]

const SPARKLES = ['✨','⭐','💫','🌟','✨','💎','⭐','🌟','💫','✨']

async function fireConfetti() {
  const confetti = (await import('canvas-confetti')).default
  const gold    = ['#FFD700', '#FFA500', '#FFE066', '#FFF8DC', '#FFEC6E']
  const magic   = ['#c084fc', '#818cf8', '#38bdf8', '#34d399', '#f472b6', '#ffffff']
  const all     = [...gold, ...magic]

  // Instant big center burst
  confetti({ particleCount: 180, spread: 120, origin: { y: 0.5 }, colors: all, scalar: 1.4, zIndex: 9999 })

  // Side cannons
  setTimeout(() => {
    confetti({ particleCount: 120, angle: 55, spread: 60, origin: { x: 0, y: 0.7 }, colors: all, zIndex: 9999 })
    confetti({ particleCount: 120, angle: 125, spread: 60, origin: { x: 1, y: 0.7 }, colors: all, zIndex: 9999 })
  }, 250)

  // Star rain from top
  setTimeout(() => confetti({
    particleCount: 100, spread: 160, origin: { y: 0 },
    shapes: ['star'], colors: gold, scalar: 1.8, gravity: 0.5, zIndex: 9999,
  }), 500)

  // Continuous fireworks for 4 seconds
  const end = Date.now() + 4000
  ;(function frame() {
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.75 }, colors: all, zIndex: 9999 })
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.75 }, colors: all, zIndex: 9999 })
    if (Date.now() < end) requestAnimationFrame(frame)
  }())

  // Big explosion at 1.5s
  setTimeout(() => {
    confetti({ particleCount: 200, spread: 180, origin: { x: 0.5, y: 0.4 }, shapes: ['star'], colors: gold, scalar: 1.6, zIndex: 9999 })
  }, 1500)

  // Gold glitter shower at 2.5s
  setTimeout(() => confetti({
    particleCount: 150, spread: 200, origin: { y: 0 },
    gravity: 0.4, scalar: 0.7, colors: gold, zIndex: 9999,
  }), 2500)
}

export function GameResultModal({
  open, result, myColor, reason, myUsername, oppUsername,
  myElo, userId, onNewGame, onDashboard, onRematch,
}: Props) {
  const [newElo, setNewElo] = useState<number | null>(null)
  const firedRef = useRef(false)
  const [winMsg] = useState(() => WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)])

  const myResultColor: GameResultColor = myColor === 'w' ? 'white' : 'black'
  const iWon   = result === myResultColor
  const isDraw = result === 'draw'
  const iLost  = !iWon && !isDraw

  useEffect(() => {
    if (!open || !userId) return
    setNewElo(null)
    firedRef.current = false
    const supabase = createClient()
    const timer = setTimeout(async () => {
      const { data } = await supabase.from('users').select('elo_rating').eq('id', userId).single()
      if (data) setNewElo((data as { elo_rating: number }).elo_rating)
    }, 1200)
    return () => clearTimeout(timer)
  }, [open, userId])

  useEffect(() => {
    if (open && iWon && !firedRef.current) {
      firedRef.current = true
      setTimeout(fireConfetti, 300)
    }
  }, [open, iWon])

  if (!result) return null

  const eloDelta    = newElo !== null ? newElo - myElo : null
  const ReasonIcon  = REASON_ICON[reason]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — magical purple tint on win */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 backdrop-blur-sm"
            style={{ background: iWon ? 'rgba(10,1,30,0.88)' : 'rgba(0,0,0,0.82)' }}
          />

          {/* Floating background sparkles behind modal (win only) */}
          {iWon && SPARKLES.map((s, i) => (
            <motion.span
              key={i}
              className="fixed z-50 select-none pointer-events-none text-2xl"
              style={{ left: `${5 + i * 9}%`, top: `${15 + (i % 3) * 20}%` }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.3, 0.9, 0.3],
                scale: [0.8, 1.2, 0.8],
                rotate: [0, 30, -30, 0],
              }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
            >
              {s}
            </motion.span>
          ))}

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 60 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-sm pointer-events-auto overflow-hidden rounded-2xl relative"
              style={iWon ? {
                background: 'linear-gradient(160deg, #0e0030 0%, #110040 40%, #0a001f 100%)',
                boxShadow: '0 0 0 1px rgba(192,132,252,0.5), 0 0 60px rgba(168,85,247,0.4), 0 0 120px rgba(251,191,36,0.2), 0 30px 80px rgba(0,0,0,0.8)',
              } : {
                background: '#0d1829',
                border: `1px solid ${isDraw ? 'rgba(100,116,139,0.4)' : 'rgba(239,68,68,0.3)'}`,
                boxShadow: `0 0 60px ${isDraw ? 'rgba(148,163,184,0.1)' : 'rgba(239,68,68,0.15)'}, 0 25px 60px rgba(0,0,0,0.6)`,
              }}
            >

              {/* Animated rainbow top border (win only) */}
              {iWon && (
                <motion.div
                  className="absolute top-0 left-0 right-0 h-[3px] z-10"
                  animate={{ backgroundPosition: ['0% 50%', '200% 50%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  style={{
                    background: 'linear-gradient(90deg, #ffd700, #ff6bcb, #818cf8, #38bdf8, #34d399, #ffd700, #ff6bcb)',
                    backgroundSize: '300% 300%',
                  }}
                />
              )}

              {/* Plain top strip (loss/draw) */}
              {!iWon && (
                <div className={`h-1.5 w-full ${isDraw ? 'bg-gradient-to-r from-slate-500 to-slate-400' : 'bg-gradient-to-r from-red-600 to-rose-500'}`} />
              )}

              <div className="p-6 sm:p-8 pt-7">

                {iWon ? (
                  /* ── MAGICAL WIN HEADER ── */
                  <div className="text-center mb-6 relative">

                    {/* Orbiting stars around crown */}
                    {[0,1,2,3,4,5].map(i => (
                      <motion.span
                        key={i}
                        className="absolute text-base select-none pointer-events-none"
                        style={{ left: '50%', top: '28px' }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: 'linear', delay: i * 0.4 }}
                      >
                        <motion.span
                          className="block"
                          style={{ transform: `translateX(${42 + i * 4}px)` }}
                          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25 }}
                        >
                          {['✨','⭐','💫','🌟','✨','💎'][i]}
                        </motion.span>
                      </motion.span>
                    ))}

                    {/* Crown — big, glowing, bouncing */}
                    <motion.div
                      className="text-7xl mb-3 select-none relative z-10"
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                    >
                      <motion.span
                        className="inline-block"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ filter: 'drop-shadow(0 0 20px gold) drop-shadow(0 0 40px rgba(255,215,0,0.6))' }}
                      >
                        👑
                      </motion.span>
                    </motion.div>

                    {/* VICTORY — shimmering gold text */}
                    <motion.h2
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'spring', delay: 0.25, stiffness: 250 }}
                      className="text-5xl font-black tracking-tight leading-none mb-1"
                      style={{
                        background: 'linear-gradient(90deg, #ffd700 0%, #fff5a0 30%, #ffd700 50%, #ffaa00 70%, #ffd700 100%)',
                        backgroundSize: '200% 100%',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.6))',
                      }}
                    >
                      VICTORY!
                    </motion.h2>

                    {/* Hype message */}
                    <motion.p
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                      className="font-black tracking-[0.2em] text-[10px] uppercase mt-2"
                      style={{ color: '#c084fc', textShadow: '0 0 10px rgba(192,132,252,0.6)' }}
                    >
                      ✦ {winMsg} ✦
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mt-2"
                    >
                      <ReasonIcon className="w-3 h-3" />
                      {REASON_LABEL[reason]}
                    </motion.div>
                  </div>

                ) : (
                  /* ── LOSS / DRAW HEADER ── */
                  <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-center mb-5"
                  >
                    <div className="text-5xl mb-3 select-none">{isDraw ? '🤝' : '💀'}</div>
                    <h2 className={`text-4xl font-black tracking-tight ${isDraw ? 'text-slate-300' : 'text-red-400'}`}>
                      {isDraw ? 'Draw' : 'Defeat'}
                    </h2>
                    <div className="flex items-center justify-center gap-1.5 text-slate-400 text-sm mt-2">
                      <ReasonIcon className="w-3.5 h-3.5" />
                      {REASON_LABEL[reason]}
                    </div>
                  </motion.div>
                )}

                {/* Players */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-between mb-4 px-1"
                >
                  <div className={`text-center flex-1 transition-opacity ${iWon ? 'opacity-100' : 'opacity-40'}`}>
                    <p className="text-white font-bold text-sm truncate">{myUsername}</p>
                    <p className="text-slate-500 text-xs">{myColor === 'w' ? 'White' : 'Black'}</p>
                  </div>
                  <div className="text-slate-600 font-bold px-3 text-sm">vs</div>
                  <div className={`text-center flex-1 transition-opacity ${iLost ? 'opacity-100' : 'opacity-40'}`}>
                    <p className="text-white font-bold text-sm truncate">{oppUsername}</p>
                    <p className="text-slate-500 text-xs">{myColor === 'w' ? 'Black' : 'White'}</p>
                  </div>
                </motion.div>

                {/* ELO */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="rounded-xl p-4 mb-5 text-center"
                  style={iWon ? {
                    background: 'rgba(251,191,36,0.06)',
                    border: '1px solid rgba(251,191,36,0.25)',
                    boxShadow: '0 0 20px rgba(251,191,36,0.1)',
                  } : {
                    background: 'rgba(15,23,42,0.6)',
                    border: '1px solid rgba(51,65,85,0.5)',
                  }}
                >
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-2"
                    style={{ color: iWon ? 'rgba(251,191,36,0.7)' : 'rgba(100,116,139,0.8)' }}>
                    ELO Rating
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-slate-400 font-mono text-xl">{myElo}</span>
                    <span className="text-slate-600 text-lg">→</span>
                    {newElo !== null ? (
                      <>
                        <span className="font-mono text-2xl font-black"
                          style={iWon ? { color: '#ffd700', textShadow: '0 0 10px rgba(255,215,0,0.5)' } : { color: 'white' }}>
                          {newElo}
                        </span>
                        {eloDelta !== null && eloDelta !== 0 && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.6 }}
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
                  transition={{ delay: 0.55 }}
                  className="flex flex-col gap-2"
                >
                  {onRematch && (
                    <button
                      onClick={onRematch}
                      className="w-full py-3 rounded-xl text-sm font-black tracking-wider transition-all flex items-center justify-center gap-2"
                      style={iWon ? {
                        background: 'linear-gradient(90deg, #a855f7, #6366f1)',
                        boxShadow: '0 0 20px rgba(168,85,247,0.4)',
                        color: 'white',
                      } : {
                        background: '#06b6d4',
                        color: '#020617',
                      }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      REMATCH
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={onNewGame}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 border"
                      style={iWon ? {
                        background: 'rgba(251,191,36,0.1)',
                        borderColor: 'rgba(251,191,36,0.35)',
                        color: '#fbbf24',
                      } : {
                        background: 'rgba(6,182,212,0.1)',
                        borderColor: 'rgba(6,182,212,0.4)',
                        color: '#67e8f9',
                      }}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      New Game
                    </button>
                    <button
                      onClick={onDashboard}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold tracking-wider
                        bg-slate-800/60 text-slate-300 border border-slate-700
                        hover:border-slate-500 transition-all flex items-center justify-center gap-1.5"
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
