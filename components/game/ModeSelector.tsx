'use client'

import { Zap, Clock } from 'lucide-react'

export type GameMode = 'bullet' | 'blitz' | 'rapid' | 'classic'

const MODES: { id: GameMode; label: string; time: string; icon: 'zap' | 'clock' }[] = [
  { id: 'bullet',  label: 'BULLET',  time: '1 min',  icon: 'zap' },
  { id: 'blitz',   label: 'BLITZ',   time: '3 min',  icon: 'zap' },
  { id: 'rapid',   label: 'RAPID',   time: '10 min', icon: 'zap' },
  { id: 'classic', label: 'CLASSIC', time: '15 min', icon: 'clock' },
]

interface Props {
  activeMode: GameMode
  onChange:   (mode: GameMode) => void
}

export function ModeSelector({ activeMode, onChange }: Props) {
  return (
    <div className="flex items-center gap-1">
      {MODES.map(m => {
        const active = m.id === activeMode
        const Icon   = m.icon === 'zap' ? Zap : Clock
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider
              transition-all duration-200
              ${active
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 border border-transparent hover:text-slate-200 hover:border-slate-600'
              }
            `}
          >
            <Icon className="w-3 h-3" />
            {m.label}
            <span className={`text-[10px] font-normal ${active ? 'text-cyan-500' : 'text-slate-600'}`}>
              {m.time}
            </span>
          </button>
        )
      })}
    </div>
  )
}
