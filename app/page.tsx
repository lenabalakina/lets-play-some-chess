import Link from 'next/link'
import { PawnIcon } from '@/components/ui/PawnIcon'
import { ScrollAnimatedHero } from '@/components/ScrollAnimatedHero'

export default function LandingPage() {
  return (
    <div
      className="relative min-h-screen text-white flex flex-col overflow-x-hidden"
      style={{
        backgroundImage: [
          'radial-gradient(ellipse 110% 65% at 68% 12%, rgba(6,182,212,0.09) 0%, transparent 58%)',
          'radial-gradient(ellipse 70% 50% at 10% 92%, rgba(168,85,247,0.065) 0%, transparent 55%)',
          'radial-gradient(ellipse 50% 35% at 88% 78%, rgba(14,165,233,0.04) 0%, transparent 50%)',
        ].join(', '),
      }}
    >
      {/* Film grain */}
      <div
        aria-hidden="true"
        className="grain-overlay fixed inset-0 pointer-events-none"
        style={{ zIndex: 40, opacity: 0.025 }}
      />

      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 h-16"
        style={{
          background: 'linear-gradient(to bottom, rgba(3,10,20,0.96) 0%, rgba(4,12,22,0.82) 100%)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 1px 0 rgba(6,182,212,0.07), 0 8px 40px rgba(0,0,0,0.5)',
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <PawnIcon size={18} />
          <span
            className="hidden sm:block font-bold text-white/75 group-hover:text-white/95 transition-colors duration-200"
            style={{ fontSize: '11px', letterSpacing: '0.17em', textTransform: 'uppercase' }}
          >
            Let&apos;s Play Some Chess
          </span>
        </Link>

        <div className="flex items-center gap-1.5">
          <Link
            href="/login"
            className="px-3.5 py-2 font-bold text-slate-600 hover:text-slate-200 transition-colors duration-200"
            style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase' }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="btn-game-primary px-5 py-2.5 rounded-lg font-black text-slate-950 bg-cyan-400 hover:bg-cyan-300"
            style={{
              fontSize: '11px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              boxShadow: '0 0 20px rgba(6,182,212,0.3), 0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <ScrollAnimatedHero />
      </main>

      <footer className="relative z-10 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
        <div className="max-w-5xl mx-auto px-6 md:px-14 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <PawnIcon size={14} />
            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.17em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.5)' }}>
              Let&apos;s Play Some Chess
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {([
              ['Play Online', '/play/online'],
              ['vs AI', '/play/ai'],
              ['Pass & Play', '/play/local'],
              ['Sign In', '/login'],
              ['Register', '/register'],
            ] as [string, string][]).map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="hover:text-slate-400 transition-colors duration-200"
                style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.35)' }}
              >
                {label}
              </Link>
            ))}
          </div>
          <span style={{ fontSize: '10px', color: 'rgba(51,65,85,0.4)', letterSpacing: '0.1em' }}>
            Free forever
          </span>
        </div>
      </footer>
    </div>
  )
}
