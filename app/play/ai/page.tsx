'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GameLayout } from '@/components/game/GameLayout'
import { PawnIcon } from '@/components/ui/PawnIcon'
import type { AiLevel } from '@/features/ai/useStockfish'

interface Level {
  id: AiLevel
  label: string
  sublabel: string
  elo: string
  desc: string
  accent: string
  border: string
  tag: string
}

const LEVELS: Level[] = [
  {
    id:       'easy',
    label:    'Beginner',
    sublabel: 'ELO ~800',
    elo:      '800',
    desc:     'Makes mistakes. Great for learning the game and building confidence.',
    accent:   '#10b981',
    border:   'rgba(16,185,129,0.2)',
    tag:      'EASY',
  },
  {
    id:       'intermediate',
    label:    'Intermediate',
    sublabel: 'ELO ~1400',
    elo:      '1400',
    desc:     'Solid strategy. Beatable with careful play. A real test of your game.',
    accent:   '#06b6d4',
    border:   'rgba(6,182,212,0.2)',
    tag:      'MEDIUM',
  },
  {
    id:       'hard',
    label:    'Master',
    sublabel: 'ELO ~2400',
    elo:      '2400',
    desc:     'Near-perfect engine play. Ruthless, relentless, unforgiving.',
    accent:   '#a855f7',
    border:   'rgba(168,85,247,0.2)',
    tag:      'HARD',
  },
]

export default function AIGamePage() {
  const [chosen, setChosen] = useState<AiLevel | null>(null)

  if (chosen) {
    const level = LEVELS.find(l => l.id === chosen)!
    return (
      <GameLayout
        me={{ username: 'YOU', elo: 1200 }}
        opponent={{ username: `Stockfish · ${level.label}`, elo: parseInt(level.elo) }}
        initialAi={true}
        initialAiLevel={chosen}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col text-white">
      {/* Header */}
      <header className="game-header flex items-center justify-between px-6 md:px-10 h-14 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <PawnIcon size={16} />
          <span
            className="hidden sm:block font-bold text-white/70 group-hover:text-white/95 transition-colors duration-200"
            style={{ fontSize: '10px', letterSpacing: '0.17em', textTransform: 'uppercase' }}
          >
            Let&apos;s Play Some Chess
          </span>
        </Link>
        <Link
          href="/"
          className="font-semibold text-slate-500 hover:text-slate-300 transition-colors duration-200"
          style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          ← Back
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Title block */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(168,85,247,0.07)',
              border: '1px solid rgba(168,85,247,0.18)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#c084fc',
            }}
          >
            AI Training
          </div>

          <h1
            className="font-black tracking-tight text-white mb-2"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
          >
            Choose Your Opponent
          </h1>

          <p style={{ fontSize: '13px', color: 'rgba(100,116,139,0.8)', letterSpacing: '0.04em' }}>
            Powered by Stockfish — the world&apos;s strongest chess engine
          </p>
        </div>

        {/* Difficulty cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {LEVELS.map(level => (
            <button
              key={level.id}
              onClick={() => setChosen(level.id)}
              className="mode-card group relative flex flex-col p-6 rounded-2xl text-left overflow-hidden border"
              style={{
                background: 'rgba(5,12,28,0.85)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderColor: level.border,
              }}
            >
              {/* Top shimmer */}
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-60 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(to right, transparent, ${level.accent}70, transparent)` }}
              />

              {/* ELO indicator */}
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 font-black"
                style={{ background: `${level.accent}18`, color: level.accent, fontSize: '11px', letterSpacing: '0.04em' }}
              >
                {level.elo}
              </div>

              <h3 className="font-black text-white mb-0.5" style={{ fontSize: '16px' }}>
                {level.label}
              </h3>
              <span
                className="block mb-3"
                style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: `${level.accent}90` }}
              >
                {level.tag}
              </span>
              <p style={{ fontSize: '12px', lineHeight: 1.6, color: 'rgba(100,116,139,0.7)' }}>
                {level.desc}
              </p>

              {/* Bottom CTA */}
              <div
                className="mt-5 flex items-center gap-1.5 font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: level.accent }}
              >
                Play Now →
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}
