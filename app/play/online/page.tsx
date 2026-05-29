'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Globe, ArrowRight, Loader2, Users } from 'lucide-react'
import { PawnIcon } from '@/components/ui/PawnIcon'

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
  const [lastRoom,  setLastRoom]  = useState<{ code: string; color: string } | null>(null)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem('chess_last_room')
      if (stored) setLastRoom(JSON.parse(stored))
    } catch {}
  }, [])

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
      router.push(`/play/online/${code}?color=${data.color ?? 'b'}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Room not found')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col text-white">
      {/* Header */}
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

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">

        {/* Title */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full"
            style={{
              background: 'rgba(6,182,212,0.07)',
              border: '1px solid rgba(6,182,212,0.18)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: '#22d3ee',
            }}
          >
            <Globe className="w-3 h-3" />
            Private Match
          </div>

          <h1
            className="font-black tracking-tight text-white mb-2"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}
          >
            Play Online
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(100,116,139,0.8)' }}>
            No account needed — create a room and share the code
          </p>
        </div>

        {/* Cards */}
        <div className="w-full max-w-sm flex flex-col gap-3">

          {/* Rejoin last game */}
          {lastRoom && (
            <button
              onClick={() => router.push(`/play/online/${lastRoom.code}?color=${lastRoom.color}`)}
              disabled={!!loading}
              className="mode-card group relative flex items-center justify-between px-6 py-4 rounded-2xl border text-left disabled:opacity-60"
              style={{
                background: 'rgba(168,85,247,0.07)',
                border: '1px solid rgba(168,85,247,0.25)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px opacity-50 group-hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(to right, transparent, rgba(168,85,247,0.6), transparent)' }} />
              <div>
                <div className="font-black text-white" style={{ fontSize: '14px' }}>Rejoin Game</div>
                <div style={{ fontSize: '11px', color: 'rgba(168,85,247,0.8)', marginTop: 2, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
                  Room {lastRoom.code} · {lastRoom.color === 'w' ? 'White' : 'Black'}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-400 shrink-0 transition-transform group-hover:translate-x-1 duration-200" />
            </button>
          )}

          {/* Create Room */}
          <button
            onClick={handleCreate}
            disabled={!!loading}
            className="mode-card group relative flex items-center justify-between px-6 py-5 rounded-2xl border text-left disabled:opacity-60 disabled:pointer-events-none"
            style={{
              background: 'rgba(6,182,212,0.06)',
              border: '1px solid rgba(6,182,212,0.2)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px opacity-60 group-hover:opacity-100 transition-opacity"
              style={{ background: 'linear-gradient(to right, transparent, rgba(6,182,212,0.6), transparent)' }} />
            <div>
              <div className="font-black text-white" style={{ fontSize: '15px' }}>Create Room</div>
              <div style={{ fontSize: '11px', color: 'rgba(100,116,139,0.7)', marginTop: 2 }}>
                Get a code, invite a friend
              </div>
            </div>
            {loading === 'create'
              ? <Loader2 className="w-5 h-5 animate-spin text-cyan-400 shrink-0" />
              : <Globe className="w-5 h-5 text-cyan-400 shrink-0 transition-transform group-hover:scale-110 duration-200" />
            }
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.5)' }}>
              or join with a code
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>

          {/* Join */}
          <div
            className="flex gap-2 p-2 rounded-2xl border"
            style={{
              background: 'rgba(5,12,28,0.8)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="ROOM CODE"
              maxLength={8}
              className="flex-1 px-4 py-3 rounded-xl bg-transparent text-white font-mono font-bold text-lg tracking-widest text-center placeholder-slate-700 focus:outline-none"
            />
            <button
              onClick={handleJoin}
              disabled={!!loading || joinCode.trim().length < 4}
              className="btn-game-primary px-4 py-3 rounded-xl font-black text-slate-950 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none"
              style={{ boxShadow: '0 0 16px rgba(6,182,212,0.3)' }}
            >
              {loading === 'join'
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <ArrowRight className="w-5 h-5" />
              }
            </button>
          </div>

          {/* Pass & Play fallback */}
          <Link
            href="/play/3d"
            className="flex items-center justify-center gap-2 py-3 rounded-xl transition-colors duration-200"
            style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(100,116,139,0.5)' }}
          >
            <Users className="w-3.5 h-3.5" />
            Or play on the same screen
          </Link>

          {/* Error */}
          {error && (
            <p
              className="text-center rounded-xl px-4 py-3"
              style={{ fontSize: '13px', color: '#f87171', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {error}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
