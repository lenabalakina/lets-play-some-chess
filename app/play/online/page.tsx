'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, ArrowRight, Loader2 } from 'lucide-react'

function getOrCreatePlayerId(): string {
  const stored = localStorage.getItem('chess_player_id')
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('chess_player_id', id)
  return id
}

export default function OnlineLobbyPage() {
  const router  = useRouter()
  const [joinCode,  setJoinCode]  = useState('')
  const [loading,   setLoading]   = useState<'create' | 'join' | null>(null)
  const [error,     setError]     = useState<string | null>(null)
  const [mounted,   setMounted]   = useState(false)

  useEffect(() => setMounted(true), [])

  async function handleCreate() {
    if (!mounted) return
    setLoading('create')
    setError(null)
    try {
      const playerId = getOrCreatePlayerId()
      const res  = await fetch('/api/room', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ playerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/play/online/${data.room.code}?color=w`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create room')
      setLoading(null)
    }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) { setError('Enter a valid room code'); return }
    if (!mounted) return
    setLoading('join')
    setError(null)
    try {
      const playerId = getOrCreatePlayerId()
      const res = await fetch(`/api/room/${code}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ playerId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/play/online/${code}?color=b`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Room not found')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#070d1a] text-white flex flex-col items-center justify-center p-6">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🌐</div>
        <h1 className="text-3xl font-black tracking-widest neon-text mb-2">PLAY ONLINE</h1>
        <p className="text-slate-400 text-sm">Challenge a friend — no account needed</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        {/* Create */}
        <button
          onClick={handleCreate}
          disabled={!!loading}
          className="flex items-center justify-between px-6 py-5 rounded-2xl border-2
            border-cyan-500/60 bg-cyan-500/10 text-cyan-300 font-black text-lg
            hover:bg-cyan-500/20 hover:border-cyan-400 transition-all disabled:opacity-60"
        >
          <span>Create Room</span>
          {loading === 'create'
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : <Globe className="w-5 h-5" />
          }
        </button>

        <div className="flex items-center gap-3 text-slate-600 text-xs">
          <div className="flex-1 h-px bg-slate-800" />
          <span>or join with a code</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Join */}
        <div className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="ROOM CODE"
            maxLength={8}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700
              text-white font-mono font-bold text-lg tracking-widest text-center placeholder:text-slate-600
              focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <button
            onClick={handleJoin}
            disabled={!!loading || joinCode.trim().length < 4}
            className="px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600
              text-white transition-all disabled:opacity-40"
          >
            {loading === 'join'
              ? <Loader2 className="w-5 h-5 animate-spin" />
              : <ArrowRight className="w-5 h-5" />
            }
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      <a href="/" className="mt-10 text-slate-600 hover:text-slate-400 text-sm transition-colors">
        ← Back to home
      </a>
    </div>
  )
}
