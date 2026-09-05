'use client'

import { useEffect, useRef, useState } from 'react'

export type AiLevel = 'easy' | 'intermediate' | 'hard'

const LEVEL_MAP: Record<AiLevel, { elo: number | null; skill: number; depth: number; moveTime: number; delay: number }> = {
  easy:         { elo: 800,  skill: 5,  depth: 3,  moveTime: 800,  delay: 600  },
  intermediate: { elo: 1400, skill: 10, depth: 8,  moveTime: 1200, delay: 800  },
  hard:         { elo: null, skill: 20, depth: 15, moveTime: 1500, delay: 400  },
}

interface UseStockfishOptions {
  enabled:  boolean
  level:    AiLevel
  fen:      string
  myColor:  'w' | 'b'
  turn:     'w' | 'b'
  onMove:   (from: string, to: string, promotion?: string) => void
}

export function useStockfish({ enabled, level, fen, myColor, turn, onMove }: UseStockfishOptions) {
  const workerRef  = useRef<Worker | null>(null)
  const readyRef   = useRef(false)
  const pendingRef = useRef(false)
  const stoppingRef = useRef(false)
  const latestFenRef = useRef(fen)
  const searchFenRef = useRef<string | null>(null)
  const onMoveRef  = useRef(onMove)
  const [searchRevision, setSearchRevision] = useState(0)
  const [thinking, setThinking] = useState(false)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => { onMoveRef.current = onMove }, [onMove])
  useEffect(() => { latestFenRef.current = fen }, [fen])

  // Init worker once when enabled
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    try {
      const worker = new Worker('/stockfish.js')

      worker.onerror = () => {
        pendingRef.current = false
        stoppingRef.current = false
        searchFenRef.current = null
        setThinking(false)
        setLoadError('AI engine failed to load')
      }

      worker.onmessage = (e: MessageEvent<string>) => {
        const line = typeof e.data === 'string' ? e.data : String(e.data)
        if (line === 'readyok') {
          readyRef.current = true
          setReady(true)
        }
        if (line.startsWith('bestmove')) {
          if (stoppingRef.current) {
            stoppingRef.current = false
            pendingRef.current = false
            searchFenRef.current = null
            setThinking(false)
            setSearchRevision(revision => revision + 1)
            return
          }
          if (!pendingRef.current || searchFenRef.current !== latestFenRef.current) return

          pendingRef.current = false
          searchFenRef.current = null
          setThinking(false)
          const parts = line.split(' ')
          const move  = parts[1]
          if (!move || move === '(none)') return
          const from      = move.slice(0, 2)
          const to        = move.slice(2, 4)
          const promotion = move.length === 5 ? move[4] : undefined
          onMoveRef.current(from, to, promotion)
        }
      }

      worker.postMessage('uci')
      worker.postMessage('ucinewgame')
      worker.postMessage('isready')
      workerRef.current = worker
      stoppingRef.current = false
    } catch (err) {
      console.warn('Stockfish worker failed to load:', err)
      queueMicrotask(() => setLoadError('AI engine failed to load'))
    }

    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
      readyRef.current   = false
      pendingRef.current = false
      stoppingRef.current = false
      searchFenRef.current = null
      setThinking(false)
      setReady(false)
    }
  }, [enabled])

  // Trigger AI move when it's the AI's turn
  useEffect(() => {
    if (!enabled) return
    if (turn === myColor) return
    if (stoppingRef.current) return
    if (pendingRef.current) return
    if (!workerRef.current || !readyRef.current) return

    const cfg = LEVEL_MAP[level]
    pendingRef.current = true
    searchFenRef.current = fen
    let searchStarted = false

    const timer = setTimeout(() => {
      if (!workerRef.current || !pendingRef.current || searchFenRef.current !== fen) return
      setThinking(true)
      const w = workerRef.current
      if (cfg.elo !== null) {
        w.postMessage('setoption name UCI_LimitStrength value true')
        w.postMessage(`setoption name UCI_Elo value ${cfg.elo}`)
      } else {
        w.postMessage('setoption name UCI_LimitStrength value false')
      }
      w.postMessage(`setoption name Skill Level value ${cfg.skill}`)
      w.postMessage(`position fen ${fen}`)
      searchStarted = true
      w.postMessage(`go depth ${cfg.depth} movetime ${cfg.moveTime}`)
    }, cfg.delay)

    return () => {
      clearTimeout(timer)
      const shouldStop = searchStarted && pendingRef.current
      pendingRef.current = false
      searchFenRef.current = null
      setThinking(false)
      if (shouldStop && workerRef.current) {
        stoppingRef.current = true
        workerRef.current.postMessage('stop')
      }
    }
  }, [enabled, turn, fen, level, myColor, ready, searchRevision])

  return { thinking, ready, loadError }
}
