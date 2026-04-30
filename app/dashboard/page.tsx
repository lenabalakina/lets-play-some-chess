import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/features/auth/actions/auth'
import Link from 'next/link'
import { Trophy, Swords, TrendingUp, LogOut } from 'lucide-react'
import type { User, Game } from '@/lib/supabase/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single() as { data: User | null }

  const { data: recentGames } = await supabase
    .from('games')
    .select('id, result, time_control, created_at, player_white, player_black')
    .or(`player_white.eq.${user.id},player_black.eq.${user.id}`)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10) as { data: Pick<Game, 'id' | 'result' | 'time_control' | 'created_at' | 'player_white' | 'player_black'>[] | null }

  const username    = profile?.username ?? 'Player'
  const elo         = profile?.elo_rating ?? 1200
  const wins        = profile?.wins ?? 0
  const losses      = profile?.losses ?? 0
  const draws       = profile?.draws ?? 0
  const gamesPlayed = profile?.games_played ?? 0
  const winRate     = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0

  return (
    <div className="min-h-screen bg-[#070d1a] text-white">
      {/* Header */}
      <header className="border-b border-slate-800/50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 text-xl">♟</span>
          <h1 className="font-bold tracking-wide neon-text">LET&apos;S PLAY SOME CHESS</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/profile/${user?.id}`} className="text-slate-400 hover:text-slate-200 text-sm transition-colors">
            {username}
          </Link>
          <Link href="/leaderboard" className="text-slate-500 hover:text-slate-300 text-xs transition-colors flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5" /> Leaderboard
          </Link>
          <form action={signOut}>
            <button type="submit" className="text-slate-500 hover:text-slate-300 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome + Play CTA */}
        <div className="glass-panel rounded-2xl p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">Welcome back, {username}</h2>
            <p className="text-slate-400 text-sm">Ready for your next match?</p>
          </div>
          <Link
            href="/play"
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm tracking-wider
              bg-cyan-500/20 text-cyan-300 border border-cyan-500/60
              hover:bg-cyan-500/30 hover:border-cyan-400/80
              shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]
              transition-all"
          >
            <Swords className="w-4 h-4" />
            PLAY NOW
          </Link>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'ELO Rating', value: elo, icon: TrendingUp, color: 'text-cyan-400' },
            { label: 'Games Played', value: gamesPlayed, icon: Swords, color: 'text-purple-400' },
            { label: 'Wins', value: wins, icon: Trophy, color: 'text-emerald-400' },
            { label: 'Win Rate', value: `${winRate}%`, icon: TrendingUp, color: 'text-amber-400' },
          ].map(stat => (
            <div key={stat.label} className="glass-panel rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                <span className="text-slate-500 text-xs uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* W/L/D breakdown */}
        <div className="glass-panel rounded-xl p-4 flex gap-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">{wins}</p>
            <p className="text-slate-500 text-xs uppercase tracking-wider mt-1">Wins</p>
          </div>
          <div className="w-px bg-slate-800" />
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{losses}</p>
            <p className="text-slate-500 text-xs uppercase tracking-wider mt-1">Losses</p>
          </div>
          <div className="w-px bg-slate-800" />
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-400">{draws}</p>
            <p className="text-slate-500 text-xs uppercase tracking-wider mt-1">Draws</p>
          </div>
        </div>

        {/* Recent games */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-400 tracking-widest uppercase">Recent Games</h3>
          {(!recentGames || recentGames.length === 0) ? (
            <div className="glass-panel rounded-xl p-8 text-center">
              <p className="text-slate-600 text-sm">No games yet. Play your first game!</p>
            </div>
          ) : (
            recentGames.map(game => {
              const isWhite  = game.player_white === user.id
              const result   = game.result
              const outcome  = result === 'draw' ? 'Draw'
                : (isWhite && result === 'white') || (!isWhite && result === 'black') ? 'Win' : 'Loss'
              const color    = outcome === 'Win' ? 'text-emerald-400' : outcome === 'Loss' ? 'text-red-400' : 'text-slate-400'
              return (
                <div key={game.id} className="glass-panel rounded-xl p-3 flex items-center justify-between text-sm">
                  <span className="text-slate-400">{game.time_control.replace('_', ' ')}</span>
                  <span className={`font-semibold ${color}`}>{outcome}</span>
                  <span className="text-slate-600 text-xs">{new Date(game.created_at).toLocaleDateString()}</span>
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
