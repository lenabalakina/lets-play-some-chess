import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Swords, Trophy, TrendingUp, Calendar } from 'lucide-react'
import type { User, Game } from '@/lib/supabase/types'

interface Props {
  params: Promise<{ userId: string }>
}

// Simple SVG sparkline for ELO history
function EloSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const min  = Math.min(...values)
  const max  = Math.max(...values)
  const range = max - min || 1
  const W = 280, H = 60, pad = 4

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2)
    const y = H - pad - ((v - min) / range) * (H - pad * 2)
    return `${x},${y}`
  }).join(' ')

  const last = values[values.length - 1]
  const first = values[0]
  const trending = last >= first

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 60 }}>
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={trending ? '#34d399' : '#f87171'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={trending ? '#34d399' : '#f87171'} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <polygon
        points={`${pad},${H} ${points} ${W - pad},${H}`}
        fill="url(#spark)"
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={trending ? '#34d399' : '#f87171'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last dot */}
      {values.length > 0 && (() => {
        const last = values[values.length - 1]
        const x = W - pad
        const y = H - pad - ((last - min) / range) * (H - pad * 2)
        return <circle cx={x} cy={y} r="3" fill={trending ? '#34d399' : '#f87171'} />
      })()}
    </svg>
  )
}

export default async function ProfilePage({ params }: Props) {
  const { userId } = await params
  const supabase   = await createClient()

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single() as { data: User | null }

  if (!profile) notFound()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  const isMe = authUser?.id === userId

  // Get recent completed games with opponent info
  const { data: games } = await supabase
    .from('games')
    .select('id, result, time_control, created_at, player_white, player_black, white_time_ms, black_time_ms')
    .or(`player_white.eq.${userId},player_black.eq.${userId}`)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(20) as { data: Pick<Game, 'id' | 'result' | 'time_control' | 'created_at' | 'player_white' | 'player_black'>[] | null }

  // Build ELO sparkline from game results (simplified: reconstruct from current ELO)
  // In production you'd store ELO history per game; here we simulate a plausible history
  const eloHistory = (() => {
    if (!games || games.length === 0) return [profile.elo_rating]
    const history = [profile.elo_rating]
    const reversed = [...games].reverse()
    let elo = profile.elo_rating
    for (const g of reversed) {
      const isWhite = g.player_white === userId
      const result  = g.result
      const iWon    = (isWhite && result === 'white') || (!isWhite && result === 'black')
      const isDraw  = result === 'draw'
      const delta   = iWon ? -16 : isDraw ? -4 : 12  // reverse engineer: subtract what was added
      elo = Math.max(100, elo + delta)
      history.unshift(elo)
    }
    return history.slice(-20)
  })()

  const winRate = profile.games_played > 0
    ? Math.round((profile.wins / profile.games_played) * 100)
    : 0

  // Get leaderboard rank
  const { count: rank } = await supabase
    .from('users')
    .select('id', { count: 'exact' })
    .gt('elo_rating', profile.elo_rating)

  const displayRank = (rank ?? 0) + 1

  return (
    <div className="min-h-screen bg-[#070d1a] text-white">
      <header className="border-b border-slate-800/50 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="font-bold tracking-wide">Player Profile</h1>
        {isMe && (
          <span className="ml-auto text-xs text-cyan-500 border border-cyan-500/30 rounded px-2 py-0.5">
            Your Profile
          </span>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Hero card */}
        <div className="glass-panel rounded-2xl p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-2xl font-black shrink-0 shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            {profile.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-black tracking-tight">{profile.username}</h2>
            <p className="text-slate-500 text-sm">Rank #{displayRank} worldwide</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-cyan-400 neon-text">{profile.elo_rating}</p>
            <p className="text-slate-500 text-xs uppercase tracking-wider">ELO Rating</p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Games',   value: profile.games_played, color: 'text-slate-300' },
            { label: 'Wins',    value: profile.wins,         color: 'text-emerald-400' },
            { label: 'Losses',  value: profile.losses,       color: 'text-red-400' },
            { label: 'Win Rate', value: `${winRate}%`,       color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="glass-panel rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-600 text-xs uppercase tracking-wider mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* W/L/D bar */}
        {profile.games_played > 0 && (
          <div className="glass-panel rounded-xl p-4 space-y-2">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Win / Draw / Loss</p>
            <div className="flex rounded-full overflow-hidden h-3 gap-0.5">
              {profile.wins > 0 && (
                <div
                  className="bg-emerald-500 rounded-full"
                  style={{ width: `${(profile.wins / profile.games_played) * 100}%` }}
                />
              )}
              {profile.draws > 0 && (
                <div
                  className="bg-slate-500 rounded-full"
                  style={{ width: `${(profile.draws / profile.games_played) * 100}%` }}
                />
              )}
              {profile.losses > 0 && (
                <div
                  className="bg-red-600 rounded-full"
                  style={{ width: `${(profile.losses / profile.games_played) * 100}%` }}
                />
              )}
            </div>
            <div className="flex gap-4 text-xs text-slate-500">
              <span><span className="text-emerald-400">{profile.wins}W</span></span>
              <span><span className="text-slate-400">{profile.draws}D</span></span>
              <span><span className="text-red-400">{profile.losses}L</span></span>
            </div>
          </div>
        )}

        {/* ELO sparkline */}
        {eloHistory.length > 2 && (
          <div className="glass-panel rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" /> ELO Trend
              </p>
              <p className="text-slate-600 text-xs">(last {eloHistory.length} snapshots)</p>
            </div>
            <EloSparkline values={eloHistory} />
          </div>
        )}

        {/* Recent games */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" /> Recent Games
          </h3>
          {(!games || games.length === 0) ? (
            <div className="glass-panel rounded-xl p-8 text-center text-slate-600 text-sm">
              No completed games yet.
            </div>
          ) : (
            games.map(g => {
              const isWhite = g.player_white === userId
              const iWon    = (isWhite && g.result === 'white') || (!isWhite && g.result === 'black')
              const isDraw  = g.result === 'draw'
              const outcome = isDraw ? 'Draw' : iWon ? 'Win' : 'Loss'
              const color   = isDraw ? 'text-slate-400' : iWon ? 'text-emerald-400' : 'text-red-400'
              const bg      = isDraw ? 'bg-slate-800/20' : iWon ? 'bg-emerald-900/10' : 'bg-red-900/10'
              const tc      = g.time_control.replace('_', ' ')

              return (
                <div key={g.id} className={`glass-panel rounded-xl p-3.5 flex items-center gap-4 ${bg}`}>
                  <div className={`w-14 text-center`}>
                    <span className={`text-sm font-bold ${color}`}>{outcome}</span>
                  </div>
                  <div className="flex-1 text-slate-400 text-xs">
                    {isWhite ? 'White' : 'Black'} · {tc.toUpperCase()}
                  </div>
                  <span className="text-slate-600 text-xs">
                    {new Date(g.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* CTA */}
        {isMe && (
          <Link
            href="/play"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold tracking-wider text-sm
              bg-cyan-500/20 text-cyan-300 border border-cyan-500/60
              hover:bg-cyan-500/30 transition-all
              shadow-[0_0_20px_rgba(6,182,212,0.2)]"
          >
            <Swords className="w-4 h-4" />
            PLAY NOW
          </Link>
        )}
      </main>
    </div>
  )
}
