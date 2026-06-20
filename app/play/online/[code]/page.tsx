'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnlineGameLayout } from '@/components/game/OnlineGameLayout'
import type { Color } from '@/features/chess/types/chess.types'

function getOrCreatePlayerId(): string {
  const stored = localStorage.getItem('chess_player_id')
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem('chess_player_id', id)
  return id
}

interface Props {
  params: Promise<{ code: string }>
}

export default function OnlineGamePage({ params }: Props) {
  const { code } = use(params)
  const router = useRouter()
  const roomCode = code.toUpperCase()

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [myColor, setMyColor] = useState<Color | null>(null)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    async function ensureJoined() {
      const id = getOrCreatePlayerId()
      setPlayerId(id)

      try {
        const res = await fetch(`/api/room/${roomCode}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ playerId: id }),
        })
        const data = await res.json()

        if (res.ok && data.color) {
          setMyColor(data.color)
          localStorage.setItem('chess_last_room', JSON.stringify({ code: roomCode, color: data.color }))
          return
        }

        // Rejoin path: player already seated but POST failed (e.g. room full)
        const getRes = await fetch(`/api/room/${roomCode}?playerId=${encodeURIComponent(id)}`)
        const getData = await getRes.json()
        if (getRes.ok && (getData.color === 'w' || getData.color === 'b')) {
          setMyColor(getData.color)
          localStorage.setItem('chess_last_room', JSON.stringify({ code: roomCode, color: getData.color }))
          return
        }

        setJoinError(data.error ?? 'Could not join room')
      } catch {
        setJoinError('Network error while joining room')
      }
    }

    ensureJoined()
  }, [roomCode])

  if (!playerId || myColor === null) {
    if (joinError) {
      return (
        <div className="min-h-screen bg-[#070d1a] flex flex-col items-center justify-center gap-6 text-white px-6">
          <div className="text-5xl">♟</div>
          <div className="text-center">
            <h1 className="text-xl font-black mb-2">Could not join room</h1>
            <p className="text-slate-400 text-sm max-w-xs">{joinError}</p>
          </div>
          <button
            onClick={() => router.push('/play/online')}
            className="w-full max-w-xs py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      )
    }
    return (
      <div className="min-h-screen bg-[#070d1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <OnlineGameLayout
      code={roomCode}
      playerId={playerId}
      myColor={myColor}
    />
  )
}
