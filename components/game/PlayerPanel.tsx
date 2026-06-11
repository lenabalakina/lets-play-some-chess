'use client'

import Link from 'next/link'
import { Globe, Trophy, Bot, CalendarDays, Users, Layers } from 'lucide-react'
import { formatTime } from '@/features/chess/hooks/useTimer'
import type { Color } from '@/features/chess/types/chess.types'

interface PlayerInfo {
  username: string
  elo:      number
  color:    Color
}

interface Props {
  player:    PlayerInfo
  opponent:  PlayerInfo
  whiteMs:   number
  blackMs:   number
  turn:      Color
  isGameOver: boolean
}

const MODES = [
  { icon: Globe,        title: 'Online',  tag: 'LIVE',        accent: '#06b6d4', href: '/play/online' },
  { icon: Trophy,       title: 'Ranked',  tag: 'ELO',         accent: '#f59e0b', href: '/leaderboard' },
  { icon: Bot,          title: 'AI',      tag: 'STOCKFISH',   accent: '#d8b4fe', href: '/play/ai'     },
  { icon: CalendarDays, title: 'Puzzle',  tag: 'DAILY',       accent: '#10b981', href: '/puzzles'      },
  { icon: Users,        title: 'Private', tag: 'INVITE',      accent: '#0ea5e9', href: '/play/online' },
  { icon: Layers,       title: '3D',      tag: 'THEMES',      accent: '#f43f5e', href: '/play/3d'  },
]

function Avatar({ username, size = 'md' }: { username: string; size?: 'md' | 'sm' }) {
  const initials = username.slice(0, 2).toUpperCase()
  const s = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  return (
    <div className={`${s} rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center font-bold text-white shrink-0`}>
      {initials}
    </div>
  )
}

function TimerBlock({ ms, isActive, color }: { ms: number; isActive: boolean; color: Color }) {
  const low = ms < 30_000
  return (
    <div className={`
      font-mono text-3xl font-bold tracking-widest transition-colors
      ${isActive && low  ? 'text-red-400 animate-pulse' : ''}
      ${isActive && !low ? (color === 'w' ? 'text-cyan-300' : 'text-purple-300') : 'text-slate-500'}
    `}>
      {formatTime(ms)}
    </div>
  )
}

export function PlayerPanel({ player, opponent, whiteMs, blackMs, turn, isGameOver }: Props) {
  const myMs   = player.color === 'w' ? whiteMs : blackMs
  const oppMs  = opponent.color === 'w' ? whiteMs : blackMs
  const myActive  = !isGameOver && turn === player.color
  const oppActive = !isGameOver && turn === opponent.color

  return (
    <div className="flex flex-col flex-1 justify-between p-4 min-h-0 overflow-hidden">
      {/* Opponent (top) */}
      <div className="glass-panel rounded-xl p-4 space-y-3 shrink-0">
        <div className="flex items-center gap-3">
          <Avatar username={opponent.username} />
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{opponent.username}</p>
            <p className="text-slate-400 text-xs">ELO {opponent.elo}</p>
          </div>
        </div>
        <TimerBlock ms={oppMs} isActive={oppActive} color={opponent.color} />
        {oppActive && (
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-purple-400 to-transparent rounded motion-safe:animate-pulse" />
        )}
      </div>

      {/* Game modes — 2×3 compact cards */}
      <div className="flex-1 flex flex-col justify-center py-3 min-h-0">
        <p className="text-[10px] font-bold tracking-widest text-slate-600 uppercase mb-2 px-1">Game Modes</p>
        <div className="grid grid-cols-2 gap-1.5">
          {MODES.map(m => (
            <Link
              key={m.title}
              href={m.href}
              className="game-card relative flex items-center gap-1.5 px-2 py-2 rounded-xl border border-white/[0.04] bg-[rgba(5,12,28,0.6)] hover:border-white/[0.09] overflow-hidden group"
            >
              <div
                className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: `linear-gradient(to right, transparent, ${m.accent}55, transparent)` }}
              />
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${m.accent}18` }}
              >
                <m.icon className="w-3 h-3" style={{ color: m.accent }} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-white leading-none truncate">{m.title}</p>
                <p className="text-[10px] font-bold tracking-widest mt-0.5 truncate" style={{ color: `${m.accent}80` }}>{m.tag}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Me (bottom) */}
      <div className="glass-panel rounded-xl p-4 space-y-3 shrink-0">
        <TimerBlock ms={myMs} isActive={myActive} color={player.color} />
        {myActive && (
          <div className="space-y-1">
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent rounded motion-safe:animate-pulse" />
            <p className="text-cyan-400 text-xs font-semibold tracking-widest uppercase text-center">Your Move</p>
          </div>
        )}
        <div className="flex items-center gap-3">
          <Avatar username={player.username} />
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{player.username}</p>
            <p className="text-slate-400 text-xs">ELO {player.elo}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
