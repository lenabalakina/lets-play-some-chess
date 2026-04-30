'use client'

import { useState } from 'react'
import { GameLayout } from '@/components/game/GameLayout'
import type { AiLevel } from '@/features/ai/useStockfish'

const LEVELS: { id: AiLevel; label: string; desc: string; emoji: string; color: string }[] = [
  {
    id:    'easy',
    label: 'Easy',
    desc:  'Casual play — makes mistakes, great for beginners',
    emoji: '🐣',
    color: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300',
  },
  {
    id:    'intermediate',
    label: 'Intermediate',
    desc:  'Solid strategy, but still beatable with good play',
    emoji: '⚔️',
    color: 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300',
  },
  {
    id:    'hard',
    label: 'Hard',
    desc:  'Near-perfect engine — only the best survive',
    emoji: '💀',
    color: 'border-purple-500/60 bg-purple-500/10 text-purple-300',
  },
]

export default function AIGamePage() {
  const [chosen, setChosen] = useState<AiLevel | null>(null)

  if (chosen) {
    return (
      <GameLayout
        me={{ username: 'YOU', elo: 1200 }}
        opponent={{ username: `AI · ${chosen.charAt(0).toUpperCase() + chosen.slice(1)}`, elo: chosen === 'easy' ? 800 : chosen === 'intermediate' ? 1400 : 2400 }}
        initialAi={true}
        initialAiLevel={chosen}
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#070d1a] flex flex-col items-center justify-center p-6 text-white">
      <div className="text-center mb-12">
        <div className="text-6xl mb-4">🤖</div>
        <h1 className="text-3xl font-black tracking-widest neon-text mb-2">PLAY VS AI</h1>
        <p className="text-slate-400 text-sm">Choose your difficulty to begin</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        {LEVELS.map(l => (
          <button
            key={l.id}
            onClick={() => setChosen(l.id)}
            className={`
              flex items-center gap-4 p-5 rounded-2xl border-2 text-left
              transition-all duration-150 hover:scale-[1.02] hover:shadow-lg
              ${l.color}
            `}
          >
            <span className="text-3xl">{l.emoji}</span>
            <div>
              <div className="font-black text-lg tracking-wide">{l.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{l.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <a href="/" className="mt-10 text-slate-600 hover:text-slate-400 text-sm transition-colors">
        ← Back to home
      </a>
    </div>
  )
}
