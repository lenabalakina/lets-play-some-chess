import Link from 'next/link'
import { PawnIcon } from '@/components/ui/PawnIcon'
import { LoginForm } from '@/features/auth/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#070d1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <PawnIcon size={36} />
            <h1 className="text-xl font-bold tracking-wide neon-text">LET&apos;S PLAY SOME CHESS</h1>
          </div>
          <p className="text-slate-500 text-sm">Sign in to track your rating</p>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <LoginForm />
        </div>

        {/* Guest divider */}
        <div className="mt-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-slate-600 text-xs">or</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <Link
            href="/play/ai"
            className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-center transition-all
              bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700
              hover:border-slate-500"
          >
            🤖 Play vs AI without account
          </Link>
          <Link
            href="/play/local"
            className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm text-center transition-all
              text-slate-500 hover:text-slate-400"
          >
            ♟ Pass &amp; play (2 players, same screen)
          </Link>
        </div>
      </div>
    </div>
  )
}
