'use client'

import { motion } from 'framer-motion'

export type Difficulty = 'vision' | 'classic' | 'shadow'

const MODES: {
  id:       Difficulty
  name:     string
  icon:     string
  tagline:  string
  color:    string
  glow:     string
  desc:     string
}[] = [
  {
    id:      'vision',
    name:    'VISION',
    icon:    '👁️',
    tagline: 'See every move',
    color:   'text-emerald-300',
    glow:    'border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_12px_rgba(52,211,153,0.2)]',
    desc:    'Legal moves shown as dots',
  },
  {
    id:      'classic',
    name:    'CLASSIC',
    icon:    '⚔️',
    tagline: 'Know your moves',
    color:   'text-cyan-300',
    glow:    'border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.2)]',
    desc:    'No hints — pure chess',
  },
  {
    id:      'shadow',
    name:    'SHADOW',
    icon:    '🌑',
    tagline: 'Fog of War',
    color:   'text-purple-300',
    glow:    'border-purple-500/60 bg-purple-500/10 shadow-[0_0_12px_rgba(168,85,247,0.25)]',
    desc:    "Enemy pieces vanish from squares you can't attack",
  },
]

interface Props {
  value:    Difficulty
  onChange: (d: Difficulty) => void
}

export function DifficultyPanel({ value, onChange }: Props) {
  return (
    <div className="px-3 py-3 space-y-1.5">
      <p className="text-[9px] font-bold tracking-widest text-slate-600 uppercase px-1 mb-2">
        Difficulty
      </p>
      {MODES.map(m => {
        const active = m.id === value
        return (
          <motion.button
            key={m.id}
            onClick={() => onChange(m.id)}
            whileTap={{ scale: 0.97 }}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left
              transition-all duration-200
              ${active
                ? m.glow
                : 'border-slate-800/60 bg-transparent hover:border-slate-700 hover:bg-slate-800/30'
              }
            `}
          >
            <span className="text-base leading-none shrink-0">{m.icon}</span>
            <div className="min-w-0">
              <p className={`text-xs font-black tracking-wider ${active ? m.color : 'text-slate-400'}`}>
                {m.name}
              </p>
              <p className={`text-[9px] truncate ${active ? 'text-slate-400' : 'text-slate-600'}`}>
                {m.tagline}
              </p>
            </div>
            {active && (
              <motion.div
                layoutId="diff-dot"
                className="ml-auto w-1.5 h-1.5 rounded-full bg-current shrink-0"
              />
            )}
          </motion.button>
        )
      })}
    </div>
  )
}
