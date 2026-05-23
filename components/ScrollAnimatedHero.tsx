'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Globe, Bot } from 'lucide-react'

const HeroBoard3D = dynamic(
  () => import('./HeroBoard3D').then(m => ({ default: m.HeroBoard3D })),
  { ssr: false }
)

const TRUST = [
  'Stockfish Engine',
  '3D Board',
  'Online Multiplayer',
  'Free to Play',
]

export function ScrollAnimatedHero() {
  return (
    <>

      {/* ════════════════════════════════════════════════════════ HERO */}
      <section className="relative overflow-hidden pt-24 pb-10 lg:pt-0 lg:pb-0 lg:h-screen lg:max-h-[1000px] flex flex-col lg:flex-row lg:items-stretch">

        {/* Atmosphere */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div
            className="absolute right-0 top-0 bottom-0 w-3/4"
            style={{ background: 'radial-gradient(ellipse 75% 65% at 88% 35%, rgba(6,182,212,0.13) 0%, transparent 60%)' }}
          />
          <div
            className="absolute left-0 bottom-0 w-1/2 h-3/4"
            style={{ background: 'radial-gradient(ellipse 65% 55% at 5% 95%, rgba(168,85,247,0.07) 0%, transparent 55%)' }}
          />
        </div>

        {/* ── Left: copy ── */}
        <div className="relative z-10 flex-[1.05] flex flex-col items-center lg:items-start lg:justify-center text-center lg:text-left px-6 md:px-10 lg:pl-16 lg:pr-8 py-4 lg:py-20">

          {/* Headline */}
          <h1
            className="lp-fade-1 font-black tracking-tight leading-[0.88] mb-6"
            style={{ fontSize: 'clamp(3.2rem, 5.2vw, 5.75rem)' }}
          >
            <span className="text-white">The board</span>
            <br />
            <span style={{
              background: 'linear-gradient(100deg, #a5f3fc 0%, #22d3ee 40%, #818cf8 82%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              is set.
            </span>
          </h1>

          {/* Description */}
          <p
            className="lp-fade-2 mb-10 max-w-[380px]"
            style={{ fontSize: '15px', lineHeight: 1.75, color: 'rgba(148,163,184,0.7)' }}
          >
            Premium 3D chess. Play online, challenge Stockfish, or invite a friend. Free, forever.
          </p>

          {/* CTAs — 2 only */}
          <div className="lp-fade-3 flex flex-col sm:flex-row gap-3">
            <Link
              href="/play/online"
              className="btn-game-primary flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-black text-slate-950 bg-cyan-500 hover:bg-cyan-400"
              style={{
                fontSize: '13px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                boxShadow: '0 0 24px rgba(6,182,212,0.28), 0 2px 8px rgba(0,0,0,0.35)',
              }}
            >
              <Globe className="w-4 h-4 shrink-0" />
              Play Online
            </Link>
            <Link
              href="/play/ai"
              className="btn-game-primary flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-slate-300 hover:text-white transition-colors"
              style={{
                fontSize: '13px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Bot className="w-4 h-4 shrink-0" />
              vs Stockfish
            </Link>
          </div>

          <p
            className="lp-fade-3 mt-5 text-center lg:text-left"
            style={{ fontSize: '11px', color: 'rgba(100,116,139,0.38)', letterSpacing: '0.04em' }}
          >
            No account needed &mdash;{' '}
            <Link
              href="/register"
              className="hover:opacity-75 transition-opacity"
              style={{ color: 'rgba(34,211,238,0.48)' }}
            >
              create one free
            </Link>
            {' '}to track your rating
          </p>
        </div>

        {/* ── Right: 3D board ── */}
        <div className="lp-fade-4 relative flex-1 flex items-center justify-center px-6 lg:px-8 pb-8 lg:pb-0 min-h-0">

          {/* Atmospheric glow — composites through the transparent canvas */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-0 lp-blob"
              style={{ background: 'radial-gradient(ellipse 70% 65% at 50% 50%, rgba(6,182,212,0.11) 0%, transparent 65%)' }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse 44% 42% at 46% 62%, rgba(168,85,247,0.07) 0%, transparent 56%)' }}
            />
          </div>

          {/* Square container — prevents cropping at any viewport */}
          <div className="lp-board-float lp-hero-board relative">
            <HeroBoard3D />
          </div>
        </div>

      </section>

      {/* ════════════════════════════════════════════════════ TRUST BAR */}
      <div className="border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-3xl mx-auto px-6 py-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5">
          {TRUST.map((item, i) => (
            <span key={item} className="flex items-center gap-6">
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: 'rgba(100,116,139,0.48)',
                }}
              >
                {item}
              </span>
              {i < TRUST.length - 1 && (
                <span
                  className="hidden sm:block w-px h-3"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                />
              )}
            </span>
          ))}
        </div>
      </div>

    </>
  )
}
