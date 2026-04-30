'use client'

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

function Avatar({ username, size = 'md' }: { username: string; size?: 'md' | 'sm' }) {
  const initials = username.slice(0, 2).toUpperCase()
  const s = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs'
  return (
    <div className={`${s} rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-white shrink-0`}>
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
    <div className="flex flex-col flex-1 justify-between p-4">
      {/* Opponent (top) */}
      <div className="glass-panel rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar username={opponent.username} />
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{opponent.username}</p>
            <p className="text-slate-400 text-xs">ELO {opponent.elo}</p>
          </div>
        </div>
        <TimerBlock ms={oppMs} isActive={oppActive} color={opponent.color} />
        {oppActive && (
          <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded animate-pulse" />
        )}
      </div>

      {/* Center info */}
      <div className="text-center">
        <p className="text-slate-500 text-xs font-medium tracking-widest uppercase">Pass &amp; Play</p>
      </div>

      {/* Me (bottom) */}
      <div className="glass-panel rounded-xl p-4 space-y-3">
        <TimerBlock ms={myMs} isActive={myActive} color={player.color} />
        {myActive && (
          <div className="space-y-1">
            <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent rounded animate-pulse" />
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
