'use client'

import { use, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
  const { code }     = use(params)
  const searchParams = useSearchParams()
  const colorParam   = searchParams.get('color') as Color | null

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [myColor,  setMyColor]  = useState<Color>(colorParam === 'b' ? 'b' : 'w')

  useEffect(() => {
    const id = getOrCreatePlayerId()
    setPlayerId(id)

    // Save to localStorage so the lobby can show a "Rejoin" button
    // We'll verify/correct the color from the server below
    const urlColor: Color = colorParam === 'b' ? 'b' : 'w'
    localStorage.setItem('chess_last_room', JSON.stringify({ code: code.toUpperCase(), color: urlColor }))

    // Verify which color this playerId actually is in the room
    // (handles the case where ?color param is missing or wrong)
    fetch(`/api/room/${code.toUpperCase()}`)
      .then(r => r.json())
      .then(data => {
        if (!data.room) return
        if (data.room.white === id) {
          setMyColor('w')
          localStorage.setItem('chess_last_room', JSON.stringify({ code: code.toUpperCase(), color: 'w' }))
        } else if (data.room.black === id) {
          setMyColor('b')
          localStorage.setItem('chess_last_room', JSON.stringify({ code: code.toUpperCase(), color: 'b' }))
        }
      })
      .catch(() => {})
  }, [code, colorParam])

  if (!playerId) {
    return (
      <div className="min-h-screen bg-[#070d1a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <OnlineGameLayout
      code={code.toUpperCase()}
      playerId={playerId}
      myColor={myColor}
    />
  )
}
