'use client'

import { Settings2, X, Bot } from 'lucide-react'
import type { BoardTheme, TimeControl } from '@/features/chess/types/chess.types'
import type { AiLevel } from '@/features/ai/useStockfish'

const THEMES: { id: BoardTheme; label: string; dot: string }[] = [
  { id: 'neon',   label: 'NEON',   dot: '#06b6d4' },
  { id: 'void',   label: 'VOID',   dot: '#8b5cf6' },
  { id: 'ember',  label: 'EMBER',  dot: '#f97316' },
  { id: 'arctic', label: 'ARCTIC', dot: '#94e2d5' },
]

const TIME_CONTROLS: { id: TimeControl; label: string; sub: string }[] = [
  { id: 'blitz_3',    label: '3M',  sub: 'Blitz'   },
  { id: 'blitz_5',    label: '5M',  sub: 'Blitz'   },
  { id: 'rapid_10',   label: '10M', sub: 'Rapid'   },
  { id: 'classic_15', label: '15M', sub: 'Classic' },
]

const AI_LEVELS: { id: AiLevel; label: string; desc: string }[] = [
  { id: 'easy',         label: 'Easy',         desc: 'Plays random-ish moves' },
  { id: 'intermediate', label: 'Intermediate',  desc: 'Solid, makes mistakes' },
  { id: 'hard',         label: 'Hard',          desc: 'Near-perfect play' },
]

interface Props {
  theme:       BoardTheme
  timeControl: TimeControl
  coordinates: boolean
  view3D:      boolean
  aiEnabled:   boolean
  aiLevel:     AiLevel
  onTheme:     (t: BoardTheme) => void
  onTime:      (t: TimeControl) => void
  onCoords:    (v: boolean) => void
  on3D:        (v: boolean) => void
  onAI:        (v: boolean) => void
  onAILevel:   (l: AiLevel) => void
  onClose:     () => void
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-300 text-xs">{label}</span>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500
          ${value ? 'bg-cyan-500' : 'bg-slate-700'}`}
      >
        <span className={`
          absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm
          transition-transform duration-200 ease-in-out
          ${value ? 'translate-x-5' : 'translate-x-0'}
        `} />
      </button>
    </div>
  )
}

export function TweaksPanel({
  theme, timeControl, coordinates, view3D, aiEnabled, aiLevel,
  onTheme, onTime, onCoords, on3D, onAI, onAILevel, onClose,
}: Props) {
  return (
    <div className="glass-panel rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-bold tracking-widest text-white uppercase">Settings</span>
        </div>
        <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Board Theme */}
      <div className="space-y-2">
        <p className="text-slate-500 text-[10px] font-semibold tracking-widest uppercase">Board Theme</p>
        <div className="grid grid-cols-2 gap-1.5">
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => onTheme(t.id)}
              className={`
                flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all
                ${theme === t.id
                  ? 'bg-slate-700 text-white border border-slate-500'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-800 hover:border-slate-600 hover:text-slate-300'
                }
              `}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.dot }} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Control */}
      <div className="space-y-2">
        <p className="text-slate-500 text-[10px] font-semibold tracking-widest uppercase">Time Control</p>
        <div className="grid grid-cols-2 gap-1.5">
          {TIME_CONTROLS.map(t => (
            <button
              key={t.id}
              onClick={() => onTime(t.id)}
              className={`
                py-1.5 px-2 rounded-lg text-xs font-bold transition-all
                ${timeControl === t.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-800 hover:border-slate-600 hover:text-slate-300'
                }
              `}
            >
              {t.label}
              <span className={`block text-[9px] font-normal mt-0.5 ${timeControl === t.id ? 'text-cyan-600' : 'text-slate-600'}`}>
                {t.sub}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Opponent */}
      <div className="space-y-2 pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-1.5 mb-1">
          <Bot className="w-3 h-3 text-slate-400" />
          <p className="text-slate-500 text-[10px] font-semibold tracking-widest uppercase">AI Opponent</p>
        </div>
        <Toggle label="Play vs AI" value={aiEnabled} onChange={onAI} />
        {aiEnabled && (
          <div className="flex gap-1 pt-1">
            {AI_LEVELS.map(l => (
              <button
                key={l.id}
                onClick={() => onAILevel(l.id)}
                title={l.desc}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all
                  ${aiLevel === l.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60'
                    : 'bg-slate-800/50 text-slate-500 border border-slate-800 hover:text-slate-300 hover:border-slate-600'
                  }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toggles */}
      <div className="space-y-3 border-t border-slate-800/60 pt-2">
        <Toggle label="3D Board"    value={view3D}      onChange={on3D}     />
        <Toggle label="Coordinates" value={coordinates}  onChange={onCoords} />
      </div>
    </div>
  )
}
