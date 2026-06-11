import Link from 'next/link'
import { PawnIcon } from '@/components/ui/PawnIcon'
import { LoginForm } from '@/features/auth/components/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col text-white">
      <header className="game-header flex items-center justify-between px-6 md:px-10 h-14 shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <PawnIcon size={16} />
          <span
            className="hidden sm:block font-bold text-white/70 group-hover:text-white/95 transition-colors duration-200"
            style={{ fontSize: '10px', letterSpacing: '0.17em', textTransform: 'uppercase' }}
          >
            Let&apos;s Play Some Chess
          </span>
        </Link>
        <Link
          href="/"
          className="font-semibold text-slate-500 hover:text-slate-300 transition-colors duration-200"
          style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          ← Back
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
              style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}
            >
              <PawnIcon size={22} />
            </div>
            <h1 className="font-black text-white mb-1" style={{ fontSize: '22px' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(100,116,139,0.8)' }}>
              Sign in to track your rating and history
            </p>
          </div>

          <div
            className="rounded-2xl p-6 mb-4"
            style={{
              background: 'rgba(5,12,28,0.85)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <LoginForm />
          </div>

          <div className="flex items-center gap-3 mb-4 mt-4">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.4)' }}>
              or play as guest
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>

          <div className="flex flex-col gap-2">
            <Link
              href="/play/ai"
              className="w-full py-3 px-4 rounded-xl font-bold text-center transition-colors duration-200 hover:text-slate-200"
              style={{
                fontSize: '12px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(148,163,184,0.9)',
              }}
            >
              Play vs AI — no account needed
            </Link>
            <Link
              href="/play/local"
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-center transition-colors duration-200 hover:text-slate-400"
              style={{ fontSize: '12px', color: 'rgba(100,116,139,0.5)' }}
            >
              Pass &amp; play (2 players, same screen)
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
