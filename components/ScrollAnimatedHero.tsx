'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Globe, Bot, Users, CalendarDays, Trophy, Zap } from 'lucide-react'

const HeroBoard3D = dynamic(() => import('./HeroBoard3D').then(m => ({ default: m.HeroBoard3D })), { ssr: false })

interface Props {
  stats:      { players: number; games: number }
  topPlayers: { username: string; elo_rating: number; wins: number }[]
}

const MEDALS = ['🥇', '🥈', '🥉']

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function ScrollAnimatedHero({ stats, topPlayers }: Props) {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row items-center gap-8 px-6 md:px-14 pt-28 pb-16">

        {/* Left: copy */}
        <div className="flex-[1.1] flex flex-col items-center lg:items-start text-center lg:text-left max-w-xl mx-auto lg:mx-0">

          {/* Live pill */}
          <div
            className="lp-fade-1 inline-flex items-center gap-2 mb-7 px-3.5 py-1.5 rounded-full"
            style={{
              background: 'rgba(16,185,129,0.07)',
              border: '1px solid rgba(16,185,129,0.18)',
              fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.15em', textTransform: 'uppercase', color: '#34d399',
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

          {/* Live stats */}
          <div className="lp-fade-3 flex items-center gap-4 mb-8">
            {stats.players > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white tabular-nums">{fmt(stats.players)}</span>
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.6)' }}>
                  Players
                </span>
              </div>
            )}
            {stats.players > 0 && stats.games > 0 && (
              <div className="w-px h-6 bg-slate-800" />
            )}
            {stats.games > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white tabular-nums">{fmt(stats.games)}</span>
                <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.6)' }}>
                  Games Played
                </span>
              </div>
            )}
          </div>

          {/* Primary CTA */}
          <div className="lp-fade-4 flex flex-col gap-3 w-full max-w-[340px]">
            <Link
              href="/play/online"
              className="lp-glow group relative flex items-center justify-center gap-2.5 w-full px-8 py-[15px] rounded-xl font-black text-slate-950 overflow-hidden"
              style={{
                fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                boxShadow: '0 0 30px rgba(6,182,212,0.35), 0 0 60px rgba(6,182,212,0.12), 0 4px 16px rgba(0,0,0,0.5)',
              }}
            >
              {/* Shimmer sweep on hover */}
              <span
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)',
                  backgroundSize: '200% 100%',
                }}
              />
              <Globe className="w-4 h-4 shrink-0 relative z-10" />
              <span className="relative z-10">Play Online Now</span>
              <span
                className="relative z-10 ml-1 px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest"
                style={{ background: 'rgba(0,0,0,0.25)', color: 'rgba(255,255,255,0.9)' }}
              >
                FREE
              </span>
            </Link>

            <div className="grid grid-cols-3 gap-2">
              {[
                { href: '/play/ai',    Icon: Bot,          label: 'VS AI'    },
                { href: '/play/local', Icon: Users,        label: 'Local'    },
                { href: '/puzzles',    Icon: CalendarDays, label: 'Puzzles'  },
              ].map(({ href, Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center justify-center gap-1.5 px-3 py-[11px] rounded-xl font-bold text-slate-400 hover:text-white transition-all duration-200"
                  style={{
                    fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(100,116,139,0.15)',
                  }}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right: 3D board */}
        <div
          className="lp-fade-5 relative flex-1 w-full"
          style={{ height: 'min(64vh, 580px)', minHeight: 340 }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 72% 62% at 50% 56%, rgba(6,182,212,0.058) 0%, transparent 68%)' }}
          />
          <HeroBoard3D />
        </div>
      </section>

      {/* ── FEATURED: ONLINE PLAY ────────────────────────────────────── */}
      <section className="px-6 md:px-14 pb-6">
        <Link
          href="/play/online"
          className="group relative block rounded-2xl overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, rgba(6,182,212,0.07) 0%, rgba(59,130,246,0.05) 100%)',
            border: '1px solid rgba(6,182,212,0.15)',
          }}
        >
          {/* Animated top border */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, #06b6d4 30%, #3b82f6 60%, #8b5cf6 80%, transparent 100%)',
              opacity: 0.8,
            }}
          />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-6 py-6 md:px-10 md:py-8">
            <div className="flex items-center gap-5">
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <Globe className="w-7 h-7" style={{ color: '#06b6d4' }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-black text-white text-xl tracking-tight">Online Match</h2>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', color: '#34d399' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(148,163,184,0.75)', lineHeight: 1.5 }}>
                  Challenge a friend with a room code, or jump into a live game. Real-time chess, zero download.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span
                className="px-6 py-3 rounded-xl font-black text-slate-950 transition-all duration-200 group-hover:scale-105"
                style={{
                  fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  boxShadow: '0 0 20px rgba(6,182,212,0.25)',
                }}
              >
                Play Now
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* ── FOUR MODE CARDS ──────────────────────────────────────────── */}
      <section className="px-6 md:px-14 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              icon: Bot,
              title: 'VS Stockfish',
              tag: 'AI ENGINE',
              desc: 'Train against 3 difficulty levels powered by Stockfish.',
              accent: '#a855f7',
              href: '/play/ai',
            },
            {
              icon: Users,
              title: 'Local Game',
              tag: 'PASS & PLAY',
              desc: 'Two players, one board. No account needed.',
              accent: '#0ea5e9',
              href: '/play/local',
            },
            {
              icon: CalendarDays,
              title: 'Daily Puzzle',
              tag: 'BRAIN TRAINING',
              desc: "Lichess's puzzle of the day. A new challenge every 24 hours.",
              accent: '#10b981',
              href: '/puzzles',
            },
            {
              icon: Trophy,
              title: 'Leaderboard',
              tag: 'RANKED',
              desc: 'See who dominates the ELO ladder. Can you reach the top?',
              accent: '#f59e0b',
              href: '/leaderboard',
            },
          ].map((mode) => (
            <Link
              key={mode.title}
              href={mode.href}
              className="game-card group relative rounded-xl p-5 overflow-hidden block cursor-pointer transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                background: 'rgba(5,12,28,0.85)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {/* Hover glow top shimmer */}
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `linear-gradient(to right, transparent 0%, ${mode.accent}55 50%, transparent 100%)` }}
              />
              {/* Hover bg glow */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"
                style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${mode.accent}0a 0%, transparent 70%)` }}
              />

              <div
                className="relative w-9 h-9 rounded-lg flex items-center justify-center mb-4 transition-all duration-200 group-hover:scale-110"
                style={{ background: `${mode.accent}18` }}
              >
                <mode.icon className="w-[17px] h-[17px]" style={{ color: mode.accent }} />
              </div>

              <h3 className="relative font-bold text-white mb-0.5 group-hover:text-white transition-colors" style={{ fontSize: '13px' }}>
                {mode.title}
              </h3>
              <span
                className="relative block mb-2.5"
                style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: `${mode.accent}75` }}
              >
                {mode.tag}
              </span>
              <p className="relative" style={{ fontSize: '11.5px', lineHeight: 1.55, color: 'rgba(100,116,139,0.6)' }}>
                {mode.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── TOP PLAYERS ──────────────────────────────────────────────── */}
      {topPlayers.length > 0 && (
        <section className="px-6 md:px-14 pb-20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.4)' }}>
                Top Players
              </span>
              <div className="h-px w-16" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
            <Link
              href="/leaderboard"
              style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.4)' }}
              className="hover:text-slate-300 transition-colors"
            >
              Full Board →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {topPlayers.map((p, i) => (
              <div
                key={p.username}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{
                  background: i === 0 ? 'rgba(245,158,11,0.06)' : 'rgba(5,12,28,0.7)',
                  border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)'}`,
                }}
              >
                <span className="text-xl shrink-0">{MEDALS[i]}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white text-sm truncate">{p.username}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(100,116,139,0.6)', letterSpacing: '0.05em' }}>{p.wins} wins</p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className="font-black tabular-nums"
                    style={{ fontSize: '15px', color: i === 0 ? '#f59e0b' : '#94a3b8' }}
                  >
                    {p.elo_rating}
                  </p>
                  <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.4)' }}>ELO</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="px-6 md:px-14 pb-20 text-center">
        <div
          className="max-w-xl mx-auto rounded-2xl px-8 py-10"
          style={{
            background: 'rgba(5,12,28,0.9)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p
            className="font-black mb-2 text-white"
            style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.01em' }}
          >
            Your move.
          </p>
          <p className="text-slate-500 mb-7" style={{ fontSize: '14px' }}>
            Free forever. No download. Just chess.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="group relative inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-black text-slate-950 overflow-hidden"
              style={{
                fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                boxShadow: '0 0 24px rgba(6,182,212,0.3)',
              }}
            >
              <Zap className="w-4 h-4 shrink-0" />
              Create Free Account
            </Link>
            <Link
              href="/play/online"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl font-bold text-slate-300 hover:text-white transition-all duration-200"
              style={{
                fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(100,116,139,0.18)',
              }}
            >
              <Globe className="w-4 h-4 shrink-0" />
              Play as Guest
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
