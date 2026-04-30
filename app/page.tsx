import Link from 'next/link'
import { Trophy, Swords, Bot, Users, Globe } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070d1a] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-2xl">♟</span>
          <span className="font-bold tracking-wide neon-text">LET&apos;S PLAY SOME CHESS</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-slate-400 hover:text-white text-sm transition-colors px-4 py-2">
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 rounded-lg text-sm font-semibold
              bg-cyan-500/20 text-cyan-300 border border-cyan-500/60
              hover:bg-cyan-500/30 transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="mb-6">
          <span
            className="text-9xl text-cyan-400 select-none"
            style={{ textShadow: '0 0 80px rgba(6,182,212,0.7), 0 0 160px rgba(6,182,212,0.3)' }}
          >
            ♟
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tight neon-text">
          LET&apos;S PLAY<br />SOME CHESS
        </h1>

        <p className="text-slate-400 text-xl mb-10 max-w-lg font-light">
          Your move. Make it legendary.
        </p>

        {/* Play options */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Link
            href="/play/online"
            className="flex items-center gap-3 px-8 py-4 rounded-xl font-black tracking-wider text-lg
              bg-cyan-500 text-slate-950 hover:bg-cyan-400
              shadow-[0_0_40px_rgba(6,182,212,0.5)] hover:shadow-[0_0_60px_rgba(6,182,212,0.8)]
              transition-all"
          >
            <Globe className="w-5 h-5" />
            PLAY ONLINE
          </Link>
          <Link
            href="/play/ai"
            className="flex items-center gap-3 px-8 py-4 rounded-xl font-black tracking-wider text-lg
              border border-slate-700 text-slate-300
              hover:border-cyan-500/50 hover:text-white transition-all"
          >
            <Bot className="w-5 h-5" />
            VS AI
          </Link>
          <Link
            href="/play/local"
            className="flex items-center gap-3 px-8 py-4 rounded-xl font-black tracking-wider text-lg
              border border-slate-700/50 text-slate-500
              hover:border-slate-600 hover:text-slate-300 transition-all"
          >
            <Users className="w-5 h-5" />
            PASS &amp; PLAY
          </Link>
        </div>

        <p className="text-slate-600 text-sm mb-16">
          No account needed •{' '}
          <Link href="/register" className="text-cyan-600 hover:text-cyan-400 transition-colors">
            Create one
          </Link>
          {' '}to track your rating
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl w-full">
          {[
            { icon: Globe,  title: 'Online Multiplayer',  desc: 'Create a room, share a code, play against a friend anywhere' },
            { icon: Bot,    title: 'AI Opponent',         desc: 'Easy, Intermediate, or Hard — powered by Stockfish engine' },
            { icon: Swords, title: '3D Board + Themes',   desc: 'Neon, Void, Ember, Arctic — flip to 3D with one toggle' },
          ].map(f => (
            <div key={f.title} className="glass-panel rounded-xl p-5 text-left">
              <f.icon className="w-5 h-5 text-cyan-400 mb-3" />
              <h3 className="font-bold mb-1 text-sm">{f.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-slate-700 text-xs border-t border-slate-800/30">
        Let&apos;s Play Some Chess
      </footer>
    </div>
  )
}
