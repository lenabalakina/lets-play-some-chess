'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Globe, Bot, Users, Swords, Trophy, CalendarDays } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const HeroBoard3D = dynamic(() => import('./HeroBoard3D').then(m => ({ default: m.HeroBoard3D })), { ssr: false })

interface GameMode {
  icon: LucideIcon
  title: string
  tag: string
  desc: string
  accent: string
  href: string
}

const GAME_MODES: GameMode[] = [
  { icon: Globe,        title: 'Online Match', tag: 'LIVE',        desc: 'Real-time play against anyone.',    accent: '#06b6d4', href: '/play/online' },
  { icon: Trophy,       title: 'Ranked Arena', tag: 'COMPETITIVE', desc: 'Rated games. Climb the ladder.',    accent: '#f59e0b', href: '/play/online' },
  { icon: Bot,          title: 'AI Training',  tag: 'STOCKFISH',   desc: '8 levels — beginner to master.',   accent: '#a855f7', href: '/play/ai' },
  { icon: CalendarDays, title: 'Daily Puzzle', tag: 'DAILY',       desc: 'One puzzle. New every 24 hours.',  accent: '#10b981', href: '/' },
  { icon: Users,        title: 'Private Room', tag: 'INVITE',      desc: 'Your room, your code, your rules.', accent: '#0ea5e9', href: '/play/online' },
  { icon: Swords,       title: '3D Themes',    tag: 'VISUAL',      desc: 'Neon · Void · Ember · Arctic.',    accent: '#f43f5e', href: '/play/local' },
]

const PLATFORM_FEATURES = ['Stockfish Engine', 'Ranked Matchmaking', '8 AI Levels', 'Daily Puzzles', 'Free Forever']

export function ScrollAnimatedHero() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row items-center gap-8 px-6 md:px-14 pt-28 pb-16">

        {/* Left: copy */}
        <div className="flex-[1.1] flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl mx-auto lg:mx-0">

          {/* Live pill */}
          <div
            className="lp-fade-1 inline-flex items-center gap-2 mb-7 px-3.5 py-1.5 rounded-full"
            style={{
              background: 'rgba(16,185,129,0.07)',
              border: '1px solid rgba(16,185,129,0.18)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#34d399',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 lp-dot" />
            Live Now
          </div>

          {/* Headline */}
          <h1
            className="lp-fade-2 font-black tracking-tight leading-[0.92] mb-5"
            style={{ fontSize: 'clamp(2.8rem, 5.5vw, 5.25rem)' }}
          >
            <span className="text-white/85">SO, YOU&apos;RE READY</span>
            <br />
            <span
              style={{
                background: 'linear-gradient(98deg, #a5f3fc 0%, #22d3ee 45%, #38bdf8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              FOR SOME CHESS?
            </span>
          </h1>

          {/* Platform feature line */}
          <div className="lp-fade-3 flex flex-wrap justify-center lg:justify-start items-center gap-x-3 gap-y-1.5 mb-9">
            {PLATFORM_FEATURES.map((f, i) => (
              <span key={f} className="flex items-center gap-3">
                {i > 0 && (
                  <span className="inline-block w-0.5 h-0.5 rounded-full bg-slate-700" />
                )}
                <span style={{ fontSize: '10.5px', fontWeight: 600, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.75)' }}>
                  {f}
                </span>
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="lp-fade-4 flex flex-col gap-3 w-full max-w-[340px]">
            <Link
              href="/play/online"
              className="lp-glow btn-game-primary flex items-center justify-center gap-2.5 w-full px-8 py-[14px] rounded-xl font-black text-slate-950 bg-cyan-500 hover:bg-cyan-400"
              style={{ fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
            >
              <Globe className="w-4 h-4 shrink-0" />
              Play Online
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/play/ai"
                className="btn-game-primary flex items-center justify-center gap-2 px-4 py-[13px] rounded-xl font-bold text-slate-300 hover:text-white transition-colors duration-200"
                style={{
                  fontSize: '12px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(100,116,139,0.22)',
                }}
              >
                <Bot className="w-3.5 h-3.5 shrink-0" /> VS AI
              </Link>
              <Link
                href="/play/local"
                className="btn-game-primary flex items-center justify-center gap-2 px-4 py-[13px] rounded-xl font-bold text-slate-500 hover:text-slate-300 transition-colors duration-200"
                style={{
                  fontSize: '12px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  background: 'rgba(255,255,255,0.015)',
                  border: '1px solid rgba(100,116,139,0.1)',
                }}
              >
                <Users className="w-3.5 h-3.5 shrink-0" /> Local
              </Link>
            </div>
          </div>
        </div>

        {/* Right: 3D board */}
        <div
          className="lp-fade-5 relative flex-1 w-full"
          style={{ height: 'min(64vh, 580px)', minHeight: 340 }}
        >
          {/* Atmospheric glow composites through the transparent canvas tiles */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 72% 62% at 50% 56%, rgba(6,182,212,0.058) 0%, transparent 68%)',
            }}
          />
          <HeroBoard3D />
        </div>

      </section>

      {/* ── Game modes ────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-14 pb-24">

        <div className="flex items-center gap-4 mb-8 max-w-4xl">
          <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.4)' }}>
            Game Modes
          </span>
          <div className="flex-1 h-px max-w-xs" style={{ background: 'rgba(255,255,255,0.04)' }} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-4xl">
          {GAME_MODES.map((mode) => (
            <Link
              key={mode.title}
              href={mode.href}
              className="game-card group relative rounded-xl p-5 overflow-hidden border border-white/[0.05] hover:border-white/[0.09] block"
              style={{
                background: 'rgba(5,12,28,0.85)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
            >
              {/* Hover top shimmer */}
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(to right, transparent 0%, ${mode.accent}55 50%, transparent 100%)` }}
              />

              {/* Icon container */}
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
                style={{ background: `${mode.accent}18` }}
              >
                <mode.icon className="w-[17px] h-[17px]" style={{ color: mode.accent }} />
              </div>

              <h3 className="font-bold text-white mb-0.5" style={{ fontSize: '13px' }}>
                {mode.title}
              </h3>
              <span
                className="block mb-2.5"
                style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: `${mode.accent}75` }}
              >
                {mode.tag}
              </span>
              <p style={{ fontSize: '12px', lineHeight: 1.55, color: 'rgba(100,116,139,0.6)' }}>
                {mode.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
