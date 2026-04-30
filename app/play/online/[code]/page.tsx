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
  const { code }      = use(params)
  const searchParams  = useSearchParams()
  const colorParam    = searchParams.get('color') as Color | null
  const myColor: Color = colorParam === 'b' ? 'b' : 'w'

  const [playerId, setPlayerId] = useState<string | null>(null)

  useEffect(() => {
    setPlayerId(getOrCreatePlayerId())
  }, [])

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
