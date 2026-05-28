'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Globe, Bot, Users, CalendarDays } from 'lucide-react'

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
          <div className="lp-fade-4 w-full max-w-[340px]">
            <Link
              href="/play/online"
              className="lp-glow group relative flex items-center justify-center gap-2.5 w-full px-8 py-[15px] rounded-xl font-black text-white overflow-hidden"
              style={{
                fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase',
                background: '#06b6d4',
                boxShadow: '0 0 30px rgba(6,182,212,0.4), 0 4px 16px rgba(0,0,0,0.5)',
              }}
            >
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'rgba(255,255,255,0.08)' }} />
              <Globe className="w-4 h-4 shrink-0 relative z-10" />
              <span className="relative z-10">Play Online Now</span>
            </Link>
          </div>
        </div>

        {/* Right: 3D board */}
        <div className="lp-fade-5 relative flex-1 w-full" style={{ height: 'min(64vh, 580px)', minHeight: 340 }}>
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 72% 62% at 50% 56%, rgba(6,182,212,0.058) 0%, transparent 68%)' }} />
          <HeroBoard3D />
        </div>
      </section>

      {/* ── GAME MODES ───────────────────────────────────────────────── */}
      <section className="px-6 md:px-14 pb-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

          <Link href="/play/ai" className="group relative rounded-2xl p-6 overflow-hidden block cursor-pointer"
            style={{ background: 'linear-gradient(145deg, rgba(168,85,247,0.08) 0%, rgba(5,12,28,0.9) 100%)', border: '1px solid rgba(168,85,247,0.15)' }}>
            <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(to right, transparent, rgba(168,85,247,0.7), transparent)' }} />
            <div className="text-5xl mb-4 select-none">♟</div>
            <h3 className="font-black text-white text-base mb-1">VS Stockfish</h3>
            <p className="text-[9px] font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(168,85,247,0.7)' }}>AI ENGINE</p>
            <p style={{ fontSize: '12px', color: 'rgba(100,116,139,0.6)', lineHeight: 1.5 }}>Train against the world's strongest chess engine. 3 difficulty levels.</p>
          </Link>

          <Link href="/play/local" className="group relative rounded-2xl p-6 overflow-hidden block cursor-pointer"
            style={{ background: 'linear-gradient(145deg, rgba(14,165,233,0.08) 0%, rgba(5,12,28,0.9) 100%)', border: '1px solid rgba(14,165,233,0.15)' }}>
            <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(to right, transparent, rgba(14,165,233,0.7), transparent)' }} />
            <div className="text-5xl mb-4 select-none">♙♟</div>
            <h3 className="font-black text-white text-base mb-1">Local Game</h3>
            <p className="text-[9px] font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(14,165,233,0.7)' }}>PASS & PLAY</p>
            <p style={{ fontSize: '12px', color: 'rgba(100,116,139,0.6)', lineHeight: 1.5 }}>Two players, one screen. Sit down and play. No account needed.</p>
          </Link>

          <Link href="/puzzles" className="group relative rounded-2xl p-6 overflow-hidden block cursor-pointer"
            style={{ background: 'linear-gradient(145deg, rgba(16,185,129,0.08) 0%, rgba(5,12,28,0.9) 100%)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(to right, transparent, rgba(16,185,129,0.7), transparent)' }} />
            <div className="text-5xl mb-4 select-none">🧩</div>
            <h3 className="font-black text-white text-base mb-1">Daily Puzzle</h3>
            <p className="text-[9px] font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(16,185,129,0.7)' }}>EVERY DAY</p>
            <p style={{ fontSize: '12px', color: 'rgba(100,116,139,0.6)', lineHeight: 1.5 }}>One tactical puzzle, refreshed daily. From Lichess's massive database.</p>
          </Link>

          <Link href="/leaderboard" className="group relative rounded-2xl p-6 overflow-hidden block cursor-pointer"
            style={{ background: 'linear-gradient(145deg, rgba(245,158,11,0.08) 0%, rgba(5,12,28,0.9) 100%)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(to right, transparent, rgba(245,158,11,0.7), transparent)' }} />
            <div className="text-5xl mb-4 select-none">🏆</div>
            <h3 className="font-black text-white text-base mb-1">Leaderboard</h3>
            <p className="text-[9px] font-bold tracking-widest uppercase mb-3" style={{ color: 'rgba(245,158,11,0.7)' }}>RANKED ELO</p>
            <p style={{ fontSize: '12px', color: 'rgba(100,116,139,0.6)', lineHeight: 1.5 }}>See who sits at the top. Play AI games to earn your rating.</p>
          </Link>

        </div>
      </section>

      {/* ── TOP PLAYERS ──────────────────────────────────────────────── */}
      {topPlayers.length > 0 && (
        <section className="px-6 md:px-14 pb-24">
          <div className="flex items-center justify-between mb-4">
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.4)' }}>Top Players</span>
            <Link href="/leaderboard" className="hover:text-slate-300 transition-colors"
              style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.4)' }}>
              Full list →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {topPlayers.map((p, i) => (
              <div key={p.username} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: i === 0 ? 'rgba(245,158,11,0.05)' : 'rgba(5,12,28,0.7)', border: `1px solid ${i === 0 ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)'}` }}>
                <span className="text-xl shrink-0">{MEDALS[i]}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white text-sm truncate">{p.username}</p>
                  <p style={{ fontSize: '10px', color: 'rgba(100,116,139,0.5)' }}>{p.wins} wins</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-black tabular-nums" style={{ fontSize: '15px', color: i === 0 ? '#f59e0b' : '#94a3b8' }}>{p.elo_rating}</p>
                  <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.35)' }}>ELO</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
