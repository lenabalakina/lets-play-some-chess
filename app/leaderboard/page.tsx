import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Trophy, TrendingUp, ArrowLeft } from 'lucide-react'
import type { User } from '@/lib/supabase/types'

const MEDALS = ['🥇', '🥈', '🥉']

function rankBadge(rank: number): string {
  if (rank <= 3) return MEDALS[rank - 1]
  return `#${rank}`
}

function rankColor(rank: number): string {
  if (rank === 1) return 'text-amber-400'
  if (rank === 2) return 'text-slate-300'
  if (rank === 3) return 'text-amber-600'
  return 'text-slate-500'
}

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const { data: players } = await supabase
    .from('users')
    .select('id, username, elo_rating, wins, losses, draws, games_played')
    .order('elo_rating', { ascending: false })
    .limit(50) as { data: Pick<User, 'id' | 'username' | 'elo_rating' | 'wins' | 'losses' | 'draws' | 'games_played'>[] | null }

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-[#070d1a] text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h1 className="font-bold tracking-wide">Global Leaderboard</h1>
        </div>
        <span className="text-slate-600 text-sm ml-auto">Top {players?.length ?? 0} players</span>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Top 3 podium */}
        {players && players.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2nd */}
            <div className="flex flex-col items-center pt-6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center font-bold text-lg mb-2">
                {players[1].username.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-slate-200 font-semibold text-sm truncate max-w-full">{players[1].username}</p>
              <p className="text-slate-400 text-xs font-mono">{players[1].elo_rating}</p>
              <div className="mt-2 w-full h-16 bg-slate-700/40 rounded-t-lg border border-slate-700/60 flex items-center justify-center">
                <span className="text-2xl">🥈</span>
              </div>
            </div>
            {/* 1st */}
            <div className="flex flex-col items-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center font-bold text-lg mb-2 shadow-[0_0_20px_rgba(251,191,36,0.4)]">
                {players[0].username.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-white font-semibold text-sm truncate max-w-full">{players[0].username}</p>
              <p className="text-amber-400 text-xs font-mono font-bold">{players[0].elo_rating}</p>
              <div className="mt-2 w-full h-24 bg-amber-900/20 rounded-t-lg border border-amber-700/40 flex items-center justify-center">
                <span className="text-3xl">🥇</span>
              </div>
            </div>
            {/* 3rd */}
            <div className="flex flex-col items-center pt-10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center font-bold text-sm mb-2">
                {players[2].username.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-slate-300 font-semibold text-sm truncate max-w-full">{players[2].username}</p>
              <p className="text-slate-400 text-xs font-mono">{players[2].elo_rating}</p>
              <div className="mt-2 w-full h-10 bg-amber-900/10 rounded-t-lg border border-amber-900/30 flex items-center justify-center">
                <span className="text-xl">🥉</span>
              </div>
            </div>
          </div>
        )}

        {/* Full table */}
        <div className="glass-panel rounded-xl overflow-hidden">
          <div className="grid grid-cols-[48px_1fr_80px_80px_80px] gap-0 px-4 py-2.5 border-b border-slate-800/50">
            <span className="text-slate-600 text-xs font-semibold uppercase">Rank</span>
            <span className="text-slate-600 text-xs font-semibold uppercase">Player</span>
            <span className="text-slate-600 text-xs font-semibold uppercase text-right">ELO</span>
            <span className="text-slate-600 text-xs font-semibold uppercase text-right">W/L</span>
            <span className="text-slate-600 text-xs font-semibold uppercase text-right">Games</span>
          </div>

          {players?.map((p, i) => {
            const rank    = i + 1
            const isMe    = p.id === user?.id
            const winRate = p.games_played > 0 ? Math.round((p.wins / p.games_played) * 100) : 0

            return (
              <Link
                key={p.id}
                href={`/profile/${p.id}`}
                className={`
                  grid grid-cols-[48px_1fr_80px_80px_80px] gap-0 px-4 py-3
                  border-b border-slate-800/30 last:border-0
                  hover:bg-slate-800/30 transition-colors
                  ${isMe ? 'bg-cyan-500/5 border-l-2 border-l-cyan-500/60' : ''}
                `}
              >
                <span className={`text-sm font-bold ${rankColor(rank)}`}>
                  {rank <= 3 ? rankBadge(rank) : rankBadge(rank)}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {p.username.slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`text-sm font-medium truncate ${isMe ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {p.username} {isMe && <span className="text-xs text-cyan-500">(you)</span>}
                  </span>
                </div>
                <span className="text-sm font-mono font-bold text-right text-cyan-400">{p.elo_rating}</span>
                <span className="text-xs text-right text-slate-400">
                  <span className="text-emerald-400">{p.wins}</span>
                  <span className="text-slate-600">/</span>
                  <span className="text-red-400">{p.losses}</span>
                </span>
                <span className="text-xs text-right text-slate-500">{p.games_played}</span>
              </Link>
            )
          })}

          {(!players || players.length === 0) && (
            <div className="py-16 text-center text-slate-600 text-sm">
              No players yet. Be the first!
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
