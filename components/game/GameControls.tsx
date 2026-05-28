'use client'

import { Flag, Handshake, Settings, Zap } from 'lucide-react'

interface Props {
  onResign:   () => void
  onDraw:     () => void
  onSettings: () => void
  onNewGame:  () => void
  disabled?:  boolean
}

export function GameControls({ onResign, onDraw, onSettings, onNewGame, disabled }: Props) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 px-2 md:gap-3 md:py-4 md:px-4">
      <button
        onClick={onResign}
        disabled={disabled}
        className="flex items-center gap-1 px-2.5 py-3 rounded-lg text-xs font-bold tracking-wider
          bg-red-900/30 text-red-400 border border-red-800/50
          hover:bg-red-800/40 hover:border-red-600/60 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#070d1a]
          disabled:opacity-40 disabled:cursor-not-allowed transition-all
          md:gap-2 md:px-4"
      >
        <Flag className="w-3.5 h-3.5 shrink-0" />
        <span>RESIGN</span>
      </button>

      <button
        onClick={onDraw}
        disabled={disabled}
        className="flex items-center gap-1 px-2.5 py-3 rounded-lg text-xs font-bold tracking-wider
          bg-slate-800/60 text-slate-300 border border-slate-700
          hover:bg-slate-700/60 hover:border-slate-500
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#070d1a]
          disabled:opacity-40 disabled:cursor-not-allowed transition-all
          md:gap-2 md:px-4"
      >
        <Handshake className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline">½ </span>DRAW
      </button>

      <button
        onClick={onSettings}
        className="flex items-center gap-1 px-2.5 py-3 rounded-lg text-xs font-bold tracking-wider
          bg-slate-800/60 text-slate-300 border border-slate-700
          hover:bg-slate-700/60 hover:border-slate-500
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#070d1a]
          transition-all md:gap-2 md:px-4"
      >
        <Settings className="w-3.5 h-3.5 shrink-0" />
        <span>SETTINGS</span>
      </button>

      <button
        onClick={onNewGame}
        className="flex items-center gap-1 px-2.5 py-3 rounded-lg text-xs font-bold tracking-wider
          bg-cyan-500/20 text-cyan-300 border border-cyan-500/60
          hover:bg-cyan-500/30 hover:border-cyan-400/80
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#070d1a]
          shadow-[0_0_12px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.35)]
          transition-all md:gap-2 md:px-4"
      >
        <Zap className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden xs:inline">NEW </span>GAME
      </button>
    </div>
  )
}
