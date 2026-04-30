'use client'

import { useEffect, useRef } from 'react'
import type { MoveRecord } from '@/features/chess/types/chess.types'

interface Props {
  moves: MoveRecord[]
}

interface MovePair {
  number: number
  white?: string
  black?: string
}

function buildPairs(moves: MoveRecord[]): MovePair[] {
  const pairs: MovePair[] = []
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      number: Math.floor(i / 2) + 1,
      white:  moves[i]?.san,
      black:  moves[i + 1]?.san,
    })
  }
  return pairs
}

export function MoveLog({ moves }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const pairs = buildPairs(moves)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [moves.length])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h3 className="text-slate-400 text-xs font-semibold tracking-widest uppercase">Move Log</h3>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-0.5 scrollbar-thin">
        {pairs.length === 0 ? (
          <p className="text-slate-600 text-xs text-center mt-4">— awaiting first move —</p>
        ) : (
          pairs.map(pair => (
            <div key={pair.number} className="flex items-center text-xs gap-2">
              <span className="text-slate-600 w-5 text-right shrink-0">{pair.number}.</span>
              <span className={`w-14 font-mono font-medium ${pair.white ? 'text-slate-200' : 'text-slate-700'}`}>
                {pair.white ?? '—'}
              </span>
              <span className={`w-14 font-mono font-medium ${pair.black ? 'text-slate-300' : 'text-slate-700'}`}>
                {pair.black ?? ''}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
