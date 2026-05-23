'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  Globe, Bot, Users, Swords, Trophy, CalendarDays,
  ArrowRight, Zap, Shield, Star,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const HeroBoard3D = dynamic(
  () => import('./HeroBoard3D').then(m => ({ default: m.HeroBoard3D })),
  { ssr: false }
)

interface GameMode {
  icon: LucideIcon
  title: string
  tag: string
  desc: string
  accent: string
  href: string
  live?: boolean
}

const GAME_MODES: GameMode[] = [
  {
    icon: Globe, title: 'Online Match', tag: 'MULTIPLAYER',
    desc: 'Real-time play against anyone, anywhere. Private rooms or open games.',
    accent: '#06b6d4', href: '/play/online', live: true,
  },
  {
    icon: Trophy, title: 'Ranked Arena', tag: 'COMPETITIVE',
    desc: 'Rated games with full ELO tracking. Earn your rank, climb the global ladder.',
    accent: '#f59e0b', href: '/play/online',
  },
  {
    icon: Bot, title: 'AI Training', tag: 'STOCKFISH',
    desc: '8 difficulty levels — ELO 800 to 2400+. The world\'s strongest engine, on demand.',
    accent: '#a855f7', href: '/play/ai',
  },
  {
    icon: CalendarDays, title: 'Daily Puzzle', tag: 'DAILY',
    desc: 'A fresh tactical challenge every 24 hours. Sharpen your pattern recognition.',
    accent: '#10b981', href: '/', live: true,
  },
  {
    icon: Users, title: 'Private Room', tag: 'INVITE ONLY',
    desc: 'Create a room, share the code. Your board, your rules, your time control.',
    accent: '#0ea5e9', href: '/play/online',
  },
  {
    icon: Swords, title: '3D Themes', tag: 'VISUAL',
    desc: 'Neon · Void · Ember · Arctic. Play in immersive 3D with dynamic board lighting.',
    accent: '#f43f5e', href: '/play/local',
  },
]

interface Feature { icon: LucideIcon; label: string; sub: string; color: string }
const FEATURES: Feature[] = [
  { icon: Zap,    label: 'Stockfish Engine', sub: "World's strongest AI",  color: '#f59e0b' },
  { icon: Trophy, label: 'ELO Ranking',       sub: 'Track your progress',  color: '#06b6d4' },
  { icon: Shield, label: 'Free Forever',      sub: 'No paywall, no catch', color: '#10b981' },
  { icon: Star,   label: '3D Board Themes',   sub: 'Neon · Void · Arctic', color: '#a855f7' },
]

const TICKER = [
  { dot: '#34d399', label: 'Online Multiplayer Live' },
  { dot: '#06b6d4', label: "Morphy's Opera Game · Replaying" },
  { dot: '#f59e0b', label: 'Ranked Season Active' },
  { dot: '#a855f7', label: 'Stockfish Engine Ready' },
  { dot: '#10b981', label: 'Daily Puzzle Available' },
  { dot: '#0ea5e9', label: 'Private Rooms · No Account Needed' },
  { dot: '#f43f5e', label: 'Full 3D Board Themes Unlocked' },
  { dot: '#34d399', label: 'Free Forever · No Paywall Ever' },
]

export function ScrollAnimatedHero() {
  return (
    <>

      {/* ════════════════════════════════════════════════════════ HERO */}
      <section className="relative overflow-hidden pt-24 pb-10 lg:pt-0 lg:pb-0 lg:h-screen lg:max-h-[1000px] flex flex-col lg:flex-row lg:items-stretch">

        {/* Hero atmosphere */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
          <div className="absolute right-0 top-0 bottom-0 w-3/4"
            style={{ background: 'radial-gradient(ellipse 75% 65% at 88% 35%, rgba(6,182,212,0.14) 0%, transparent 60%)' }}
          />
          <div className="absolute left-0 bottom-0 w-1/2 h-3/4"
            style={{ background: 'radial-gradient(ellipse 65% 55% at 5% 95%, rgba(168,85,247,0.08) 0%, transparent 55%)' }}
          />
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(ellipse 40% 30% at 50% 50%, rgba(6,182,212,0.03) 0%, transparent 60%)' }}
          />
        </div>

        {/* ── Left column: copy ── */}
        <div className="relative z-10 flex-[1.05] flex flex-col items-center lg:items-start lg:justify-center text-center lg:text-left px-6 md:px-10 lg:pl-16 lg:pr-8 py-4 lg:py-20">

          {/* Live badge */}
          <div
            className="lp-fade-1 inline-flex items-center gap-2 mb-7 px-3.5 py-1.5 rounded-full"
            style={{
              background: 'rgba(16,185,129,0.07)',
              border: '1px solid rgba(16,185,129,0.2)',
              fontSize: '10px', fontWeight: 700, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: '#34d399',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 lp-dot" />
            Live Now
          </div>

          {/* Headline */}
          <h1
            className="lp-fade-2 font-black tracking-tight leading-[0.88] mb-5"
            style={{ fontSize: 'clamp(2.8rem, 4.8vw, 5.25rem)' }}
          >
            <span className="text-white">SO, YOU&apos;RE READY</span>
            <br />
            <span style={{
              background: 'linear-gradient(100deg, #a5f3fc 0%, #22d3ee 38%, #818cf8 78%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              FOR SOME CHESS?
            </span>
          </h1>

          {/* Sub-headline */}
          <p
            className="lp-fade-3 mb-8 max-w-[400px]"
            style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(148,163,184,0.7)' }}
          >
            Premium online chess, free forever. Ranked matches, Stockfish AI, private rooms, and immersive 3D board themes — all in one platform.
          </p>

          {/* Feature pills */}
          <div className="lp-fade-3 flex flex-wrap justify-center lg:justify-start gap-2 mb-10">
            {['Stockfish Engine', 'Ranked ELO', '3D Themes', 'Free Forever', 'Daily Puzzles'].map(f => (
              <span
                key={f}
                className="px-3 py-1 rounded-full"
                style={{
                  fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'rgba(100,116,139,0.65)',
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                }}
              >{f}</span>
            ))}
          </div>

          {/* CTAs */}
          <div className="lp-fade-4 flex flex-col gap-3 w-full max-w-[360px]">
            <Link
              href="/play/online"
              className="lp-glow btn-game-primary flex items-center justify-center gap-2.5 w-full px-8 py-4 rounded-xl font-black text-slate-950 bg-cyan-500 hover:bg-cyan-400"
              style={{ fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
            >
              <Globe className="w-4 h-4 shrink-0" />
              Play Online
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/play/ai"
                className="btn-game-primary flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-slate-300 hover:text-white transition-colors"
                style={{
                  fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase',
                  background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.22)',
                }}
              >
                <Bot className="w-3.5 h-3.5 shrink-0" /> VS AI
              </Link>
              <Link
                href="/play/local"
                className="btn-game-primary flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-slate-500 hover:text-slate-300 transition-colors"
                style={{
                  fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase',
                  background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <Users className="w-3.5 h-3.5 shrink-0" /> Local
              </Link>
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(100,116,139,0.4)', letterSpacing: '0.03em' }}>
              No account needed &mdash;{' '}
              <Link
                href="/register"
                className="hover:opacity-80 transition-opacity"
                style={{ color: 'rgba(34,211,238,0.55)' }}
              >
                create one free
              </Link>
              {' '}to track your rating
            </p>
          </div>
        </div>

        {/* ── Right column: 3D board ── */}
        <div className="lp-fade-5 relative flex-1 flex items-center justify-center px-6 lg:px-8 pb-8 lg:pb-0 min-h-0">

          {/* Atmospheric glow layers — composite through the transparent canvas tiles */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
            <div
              className="absolute inset-0 lp-blob"
              style={{ background: 'radial-gradient(ellipse 70% 65% at 50% 50%, rgba(6,182,212,0.11) 0%, transparent 65%)' }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse 44% 42% at 46% 62%, rgba(168,85,247,0.07) 0%, transparent 56%)' }}
            />
            <div
              className="absolute bottom-0 left-0 right-0 h-2/5"
              style={{ background: 'radial-gradient(ellipse 85% 70% at 50% 100%, rgba(6,182,212,0.06) 0%, transparent 65%)' }}
            />
          </div>

          {/* Board — square container prevents cropping, float gives life */}
          <div className="lp-board-float lp-hero-board relative">
            <HeroBoard3D />
          </div>
        </div>

      </section>

      {/* ═══════════════════════════════════════ LIVE ACTIVITY TICKER */}
      <div
        className="relative overflow-hidden border-y"
        style={{
          borderColor: 'rgba(255,255,255,0.045)',
          background: 'linear-gradient(to right, rgba(6,182,212,0.025), rgba(168,85,247,0.015), rgba(6,182,212,0.025))',
        }}
      >
        <div className="py-3 flex lp-ticker">
          {[...TICKER, ...TICKER].map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-2.5 px-7 shrink-0"
              style={{
                fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.14em',
                textTransform: 'uppercase', color: 'rgba(100,116,139,0.45)',
              }}
            >
              <span className="w-1 h-1 rounded-full shrink-0 lp-dot" style={{ background: item.dot }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════ GAME MODES */}
      <section className="relative px-6 md:px-14 py-24 overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 55% 60% at 80% 55%, rgba(168,85,247,0.045) 0%, transparent 65%)' }}
        />

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Section header */}
          <div className="mb-14">
            <div
              className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'rgba(100,116,139,0.45)',
              }}
            >
              Game Modes
            </div>
            <h2
              className="font-black text-white tracking-tight"
              style={{ fontSize: 'clamp(1.85rem, 3.2vw, 2.6rem)', lineHeight: 1.1 }}
            >
              Every way to play.
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(100,116,139,0.5)', marginTop: '0.45rem' }}>
              Choose your format and get on the board.
            </p>
          </div>

          {/* Cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GAME_MODES.map((mode) => (
              <Link
                key={mode.title}
                href={mode.href}
                className="lp-card group relative rounded-2xl overflow-hidden block"
                style={{ background: 'rgba(4,10,24,0.92)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {/* Accent top stripe */}
                <div
                  className="h-[2px] transition-opacity duration-300 opacity-40 group-hover:opacity-100"
                  style={{ background: `linear-gradient(to right, transparent, ${mode.accent}, transparent)` }}
                />

                {/* Hover: colored border + top glow */}
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    boxShadow: `inset 0 0 0 1px ${mode.accent}35`,
                    background: `radial-gradient(ellipse 90% 50% at 50% 0%, ${mode.accent}0d 0%, transparent 65%)`,
                  }}
                />

                <div className="relative z-10 p-6">
                  {/* Icon + live badge */}
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                      style={{ background: `${mode.accent}15`, border: `1px solid ${mode.accent}28` }}
                    >
                      <mode.icon className="w-[18px] h-[18px]" style={{ color: mode.accent }} />
                    </div>
                    {mode.live && (
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.22)' }}
                      >
                        <span className="w-1 h-1 rounded-full bg-emerald-400 lp-dot" />
                        <span style={{ fontSize: '7.5px', fontWeight: 800, letterSpacing: '0.16em', color: '#34d399' }}>LIVE</span>
                      </div>
                    )}
                  </div>

                  <h3 className="font-black text-white mb-1" style={{ fontSize: '15px', letterSpacing: '-0.01em' }}>
                    {mode.title}
                  </h3>
                  <p
                    className="mb-4"
                    style={{ fontSize: '8.5px', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: `${mode.accent}80` }}
                  >
                    {mode.tag}
                  </p>
                  <p style={{ fontSize: '13px', lineHeight: 1.6, color: 'rgba(100,116,139,0.62)' }}>
                    {mode.desc}
                  </p>

                  {/* Play arrow — fades in on hover */}
                  <div
                    className="mt-5 flex items-center gap-1.5 font-bold opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200"
                    style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: mode.accent }}
                  >
                    Play Now <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════ PLATFORM FEATURES BAR */}
      <section
        className="px-6 md:px-14 py-16 border-t"
        style={{ borderColor: 'rgba(255,255,255,0.045)' }}
      >
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {FEATURES.map(f => (
            <div key={f.label} className="flex flex-col items-center text-center gap-3 group">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${f.color}12`, border: `1px solid ${f.color}25` }}
              >
                <f.icon className="w-5 h-5" style={{ color: f.color }} />
              </div>
              <div>
                <p className="font-bold text-white" style={{ fontSize: '13px', letterSpacing: '-0.01em' }}>{f.label}</p>
                <p style={{ fontSize: '12px', color: 'rgba(100,116,139,0.5)', marginTop: '2px' }}>{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════ AI CHALLENGE PROMO */}
      <section className="px-6 md:px-14 pt-8 pb-24">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/play/ai"
            className="lp-card group relative block rounded-3xl overflow-hidden"
            style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)' }}
          >
            {/* Right-side purple atmosphere */}
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
              <div
                className="absolute right-0 top-0 bottom-0 w-2/3"
                style={{ background: 'radial-gradient(ellipse 80% 100% at 95% 50%, rgba(168,85,247,0.15) 0%, transparent 65%)' }}
              />
            </div>

            {/* Top accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[1.5px] opacity-60 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(to right, transparent, rgba(168,85,247,0.65) 50%, transparent)' }}
            />

            {/* Hover border glow */}
            <div
              className="absolute inset-0 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ boxShadow: 'inset 0 0 0 1px rgba(168,85,247,0.38)' }}
            />

            <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div>
                <div
                  className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.22)',
                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em',
                    textTransform: 'uppercase', color: '#c084fc',
                  }}
                >
                  <Bot className="w-3 h-3" />
                  Stockfish AI Training
                </div>

                <h3
                  className="font-black text-white tracking-tight mb-3"
                  style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', lineHeight: 1.1 }}
                >
                  Challenge Stockfish.<br />
                  <span style={{ color: '#c084fc' }}>How far can you go?</span>
                </h3>

                <p style={{ fontSize: '14px', color: 'rgba(148,163,184,0.62)', maxWidth: '400px', lineHeight: 1.65 }}>
                  8 difficulty levels from ELO 800 beginner to near-perfect engine play. No account needed. Train your tactics, build your game.
                </p>
              </div>

              <div
                className="shrink-0 flex items-center gap-2.5 px-7 py-4 rounded-2xl font-black transition-all duration-200 group-hover:bg-purple-500/25"
                style={{
                  fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase',
                  background: 'rgba(168,85,247,0.14)', border: '1px solid rgba(168,85,247,0.32)',
                  color: '#c084fc',
                }}
              >
                Train Now <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </div>
      </section>

    </>
  )
}
