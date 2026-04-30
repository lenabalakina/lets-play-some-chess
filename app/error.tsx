'use client'

import { useEffect } from 'react'

interface Props {
  error:  Error & { digest?: string }
  reset:  () => void
}

export default function RootError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[Root Error]', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#070d1a] text-white flex items-center justify-center p-6">
      <div className="glass-panel rounded-2xl p-8 max-w-sm w-full text-center space-y-4 border border-red-800/40">
        <div className="text-5xl text-red-400 select-none">!</div>
        <h2 className="text-lg font-bold">Something went wrong</h2>
        <p className="text-slate-500 text-sm">{error.message || 'An unexpected error occurred.'}</p>
        {error.digest && (
          <p className="text-slate-700 text-xs font-mono">ref: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-xl text-sm font-bold
            bg-cyan-500/20 text-cyan-300 border border-cyan-500/60
            hover:bg-cyan-500/30 transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
