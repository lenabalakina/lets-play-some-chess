'use client'

import { Eye, Swords, CloudFog } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type Difficulty = 'vision' | 'classic' | 'shadow'

const MODES: {
  id:      Difficulty
  name:    string
  tag:     string
  desc:    string
  Icon:    LucideIcon
  accent:  string
}[] = [
  {
    id:     'vision',
    name:   'Vision',
    tag:    'GUIDED',
    desc:   'Legal moves shown as dots',
    Icon:   Eye,
    accent: '#34d399',
  },
  {
    id:     'classic',
    name:   'Classic',
    tag:    'STANDARD',
    desc:   'No hints — pure chess',
    Icon:   Swords,
    accent: '#06b6d4',
  },
  {
    id:     'shadow',
    name:   'Shadow',
    tag:    'FOG OF WAR',
    desc:   "Enemy pieces vanish from squares you can't attack",
    Icon:   CloudFog,
    accent: '#a855f7',
  },
]

interface Props {
  value:    Difficulty
  onChange: (d: Difficulty) => void
}

export function DifficultyPanel({ value, onChange }: Props) {
  return (
    <div className="px-3 py-3 space-y-2">
      <p className="text-[9px] font-bold tracking-widest text-slate-600 uppercase px-1 mb-2">
        Difficulty
      </p>
      {MODES.map(m => {
        const active = m.id === value
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            className={`
              game-card w-full relative rounded-xl p-3 overflow-hidden border text-left transition-all duration-200
              ${active
                ? 'border-white/10 bg-[rgba(5,12,28,0.95)]'
                : 'border-white/[0.04] bg-[rgba(5,12,28,0.6)] hover:border-white/[0.08]'
              }
            `}
            style={active ? { boxShadow: `0 0 0 1px ${m.accent}30, 0 4px 20px rgba(0,0,0,0.4)` } : undefined}
          >
            {/* Top shimmer on active */}
            {active && (
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(to right, transparent 0%, ${m.accent}66 50%, transparent 100%)` }}
              />
            )}

            <div className="flex items-start gap-2.5">
              {/* Icon */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: `${m.accent}18` }}
              >
                <m.Icon className="w-3.5 h-3.5" style={{ color: m.accent }} />
              </div>

              <div className="min-w-0">
                <p className="font-bold text-white text-xs leading-none mb-0.5">{m.name}</p>
                <p
                  className="text-[8px] font-bold tracking-widest uppercase mb-1.5"
                  style={{ color: `${m.accent}90` }}
                >
                  {m.tag}
                </p>
                <p className="text-[10px] leading-snug" style={{ color: 'rgba(100,116,139,0.6)' }}>
                  {m.desc}
                </p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
