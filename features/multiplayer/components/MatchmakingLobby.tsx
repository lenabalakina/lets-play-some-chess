'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Zap, X, Clock, Users } from 'lucide-react'
import { useMatchmaking } from '../hooks/useMatchmaking'
import type { TimeControl } from '@/features/chess/types/chess.types'
import Link from 'next/link'

const TIME_OPTIONS: { id: TimeControl; label: string; sublabel: string; icon: boolean }[] = [
  { id: 'bullet_1',   label: '1 min',   sublabel: 'BULLET',  icon: true },
  { id: 'blitz_3',    label: '3 min',   sublabel: 'BLITZ',   icon: true },
  { id: 'blitz_5',    label: '5 min',   sublabel: 'BLITZ',   icon: true },
  { id: 'rapid_10',   label: '10 min',  sublabel: 'RAPID',   icon: false },
  { id: 'classic_15', label: '15 min',  sublabel: 'CLASSIC', icon: false },
]

function formatSearchTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`
}

interface Props {
  username: string
  elo: number
}

export function MatchmakingLobby({ username, elo }: Props) {
  const { state, timeControl, setTimeControl, searchSeconds, error, startSearching, cancelSearch } = useMatchmaking()

  return (
    <div className="min-h-screen bg-[#070d1a] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-xl">♟</span>
          <span className="font-bold tracking-wide neon-text">LET&apos;S PLAY SOME CHESS</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-slate-400">{username}</span>
            <span className="ml-2 text-cyan-400 font-mono font-bold">{elo}</span>
          </div>
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">
              {state === 'searching' ? (
                <span className="neon-text">Finding Opponent...</span>
              ) : (
                <span>Find a Match</span>
              )}
            </h1>
            <p className="text-slate-400 text-sm">
              {state === 'searching'
                ? `Searching for ${formatSearchTime(searchSeconds)} · ELO ±300`
                : 'Choose your time control and play'}
            </p>
          </div>

          {/* Searching animation */}
          <AnimatePresence>
            {state === 'searching' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-4 py-6"
              >
                {/* Pulsing board icon */}
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.8, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full bg-cyan-500/20"
                    style={{ width: 80, height: 80 }}
                  />
                  <div className="w-20 h-20 rounded-full glass-panel flex items-center justify-center">
                    <span className="text-4xl text-cyan-300">♟</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Users className="w-4 h-4" />
                  <span>Looking for a player around ELO {elo}</span>
                </div>

                <motion.div
                  className="flex gap-1"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-cyan-400"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Time control selector (hidden while searching) */}
          <AnimatePresence>
            {state !== 'searching' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-panel rounded-2xl p-5 space-y-4"
              >
                <p className="text-slate-400 text-xs font-semibold tracking-widest uppercase">
                  Time Control
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {TIME_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setTimeControl(opt.id)}
                      className={`
                        flex flex-col items-center gap-1 p-3 rounded-xl text-center transition-all
                        ${timeControl === opt.id
                          ? 'bg-cyan-500/20 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                          : 'bg-slate-800/60 border border-slate-700 hover:border-slate-500'
                        }
                      `}
                    >
                      {opt.icon && <Zap className={`w-3 h-3 ${timeControl === opt.id ? 'text-cyan-400' : 'text-slate-500'}`} />}
                      {!opt.icon && <Clock className={`w-3 h-3 ${timeControl === opt.id ? 'text-cyan-400' : 'text-slate-500'}`} />}
                      <span className={`text-sm font-bold ${timeControl === opt.id ? 'text-cyan-300' : 'text-slate-300'}`}>
                        {opt.label}
                      </span>
                      <span className={`text-[9px] font-semibold tracking-widest ${timeControl === opt.id ? 'text-cyan-500' : 'text-slate-600'}`}>
                        {opt.sublabel}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {state === 'searching' ? (
              <button
                onClick={cancelSearch}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold tracking-wider
                  bg-slate-800/60 text-slate-300 border border-slate-700
                  hover:bg-slate-700/60 hover:border-slate-500 transition-all"
              >
                <X className="w-4 h-4" />
                CANCEL SEARCH
              </button>
            ) : (
              <button
                onClick={startSearching}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold tracking-wider
                  bg-cyan-500 text-slate-950 hover:bg-cyan-400
                  shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_50px_rgba(6,182,212,0.6)]
                  transition-all"
              >
                <Zap className="w-4 h-4" />
                FIND MATCH
              </button>
            )}

            {state !== 'searching' && (
              <Link
                href="/play/local"
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold tracking-wider text-sm
                  border border-slate-700 text-slate-400
                  hover:border-slate-500 hover:text-slate-200 transition-all"
              >
                LOCAL
              </Link>
            )}
          </div>

          {/* Pass-and-play hint */}
          {state !== 'searching' && (
            <p className="text-center text-slate-600 text-xs">
              Want to play on the same screen?{' '}
              <Link href="/play/local" className="text-slate-400 hover:text-slate-300 underline underline-offset-2">
                Pass &amp; Play
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
