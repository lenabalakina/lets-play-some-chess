import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070d1a] text-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="text-8xl text-slate-700 select-none">♟</div>
        <div>
          <h1 className="text-4xl font-black text-slate-400 mb-2">404</h1>
          <p className="text-slate-600 text-sm">This page doesn&apos;t exist on the board.</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold
            bg-cyan-500/20 text-cyan-300 border border-cyan-500/60
            hover:bg-cyan-500/30 transition-all"
        >
          Back to Home
        </Link>
      </div>
    </div>
  )
}
