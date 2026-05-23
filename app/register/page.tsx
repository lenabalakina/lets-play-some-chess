import Link from 'next/link'
import { RegisterForm } from '@/features/auth/components/RegisterForm'
import { PawnIcon } from '@/components/ui/PawnIcon'

export default function RegisterPage() {
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
          href="/login"
          className="font-semibold text-slate-500 hover:text-slate-300 transition-colors duration-200"
          style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          Sign In
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
              Join the platform
            </h1>
            <p style={{ fontSize: '13px', color: 'rgba(100,116,139,0.8)' }}>
              Free forever — track your ELO, play ranked
            </p>
          </div>

          <div
            className="rounded-2xl p-6"
            style={{
              background: 'rgba(5,12,28,0.85)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <RegisterForm />
          </div>

          <p className="text-center mt-5" style={{ fontSize: '13px', color: 'rgba(100,116,139,0.6)' }}>
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
