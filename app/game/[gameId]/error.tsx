'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GameError({ error, reset }: Props) {
  const router = useRouter()
  useEffect(() => { console.error('[Game Error]', error) }, [error])

  return (
    <div className="h-screen bg-[#070d1a] text-white flex items-center justify-center p-6">
      <div className="glass-panel rounded-2xl p-8 max-w-sm w-full text-center space-y-4 border border-red-800/40">
        <span className="text-4xl text-red-400">♟</span>
        <h2 className="text-lg font-bold">Game failed to load</h2>
        <p className="text-slate-500 text-sm">{error.message || 'Could not connect to the game.'}</p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 hover:bg-cyan-500/30 transition-all"
          >
            Retry
          </button>
          <button
            onClick={() => router.push('/play')}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-slate-800/60 text-slate-300 border border-slate-700 hover:border-slate-500 transition-all"
          >
            New Game
          </button>
        </div>
      </div>
    </div>
  )
}
