'use client'

import { Flag, Handshake, Settings, Plus, Zap } from 'lucide-react'

interface Props {
  onResign:  () => void
  onDraw:    () => void
  onSettings: () => void
  onNewGame: () => void
  disabled?: boolean
}

export function GameControls({ onResign, onDraw, onSettings, onNewGame, disabled }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 py-4 px-4">
      <button
        onClick={onResign}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider
          bg-red-900/30 text-red-400 border border-red-800/50
          hover:bg-red-800/40 hover:border-red-600/60 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)]
          disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <Flag className="w-3.5 h-3.5" />
        RESIGN
      </button>

      <button
        onClick={onDraw}
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider
          bg-slate-800/60 text-slate-300 border border-slate-700
          hover:bg-slate-700/60 hover:border-slate-500
          disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        <Handshake className="w-3.5 h-3.5" />
        ½ DRAW
      </button>

      <button
        onClick={onSettings}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider
          bg-slate-800/60 text-slate-300 border border-slate-700
          hover:bg-slate-700/60 hover:border-slate-500 transition-all"
      >
        <Settings className="w-3.5 h-3.5" />
        SETTINGS
      </button>

      <button
        onClick={onNewGame}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wider
          bg-cyan-500/20 text-cyan-300 border border-cyan-500/60
          hover:bg-cyan-500/30 hover:border-cyan-400/80
          shadow-[0_0_12px_rgba(6,182,212,0.2)] hover:shadow-[0_0_20px_rgba(6,182,212,0.35)]
          transition-all"
      >
        <Zap className="w-3.5 h-3.5" />
        NEW GAME
      </button>
    </div>
  )
}
