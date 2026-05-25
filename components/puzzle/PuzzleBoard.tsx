'use client'

import { useState, useEffect, useCallback } from 'react'
import { Chess } from 'chess.js'
import { ChessBoard2D } from '@/components/game/ChessBoard2D'
import type { Square, Color } from '@/features/chess/types/chess.types'
import Link from 'next/link'
import { PawnIcon } from '@/components/ui/PawnIcon'
import { RotateCcw, ArrowRight, Lightbulb, Home, Bot, Globe } from 'lucide-react'

export interface LichessPuzzleData {
  game: { pgn: string; id: string }
  puzzle: {
    id: string
    rating: number
    plays: number
    solution: string[]
    themes: string[]
    initialPly: number
    fen: string
    lastMove: string
  }
}

type Status = 'playing' | 'wrong' | 'solved'

export function PuzzleBoard({ initialPuzzle }: { initialPuzzle: LichessPuzzleData }) {
  const [puzzle, setPuzzle]         = useState(initialPuzzle)
  const [fen, setFen]               = useState('')
  const [playerColor, setColor]     = useState<Color>('w')
  const [selected, setSelected]     = useState<Square | null>(null)
  const [legalMoves, setLegalMoves] = useState<string[]>([])
  const [lastMove, setLastMove]     = useState<{ from: Square; to: Square } | null>(null)
  const [solutionIdx, setSolutionIdx] = useState(0)
  const [status, setStatus]         = useState<Status>('playing')
  const [loading, setLoading]       = useState(false)
  const [hintSquare, setHintSquare] = useState<string | null>(null)
  const [hintsUsed, setHintsUsed]   = useState(0)
  const MAX_HINTS = 3

  const initPuzzle = useCallback((p: LichessPuzzleData) => {
    const chess = new Chess(p.puzzle.fen)
    const lm    = p.puzzle.lastMove
    setPuzzle(p)
    setFen(p.puzzle.fen)
    setColor(chess.turn() as Color)
    setSelected(null)
    setLegalMoves([])
    setLastMove(lm ? { from: lm.slice(0, 2) as Square, to: lm.slice(2, 4) as Square } : null)
    setSolutionIdx(0)
    setStatus('playing')
    setHintSquare(null)
    setHintsUsed(0)
  }, [])

  useEffect(() => { initPuzzle(initialPuzzle) }, [initialPuzzle, initPuzzle])

  // Auto-play opponent response after a correct player move
  useEffect(() => {
    if (status !== 'playing') return
    if (solutionIdx === 0 || solutionIdx % 2 === 0) return
    if (solutionIdx >= puzzle.puzzle.solution.length) return

    const timer = setTimeout(() => {
      const uci  = puzzle.puzzle.solution[solutionIdx]
      const from = uci.slice(0, 2) as Square
      const to   = uci.slice(2, 4) as Square
      const promo = uci.length === 5 ? uci[4] : undefined
      const chess = new Chess(fen)
      chess.move({ from, to, promotion: promo })
      setFen(chess.fen())
      setLastMove({ from, to })
      setSolutionIdx(i => i + 1)
    }, 700)

    return () => clearTimeout(timer)
  }, [solutionIdx, fen, puzzle, status])

  const handleSquareClick = useCallback((sq: Square) => {
    if (status !== 'playing') return
    const chess = new Chess(fen)
    if (chess.turn() !== playerColor) return

    setHintSquare(null)

    if (selected) {
      if (sq === selected) {
        setSelected(null); setLegalMoves([]); return
      }

      type CjSq = Parameters<typeof chess.get>[0]
      type CjMoveOpts = Parameters<typeof chess.moves>[0]

      // Reselect own piece
      const piece = chess.get(sq as CjSq)
      const movesFromSelected = chess.moves({ square: selected as CjMoveOpts['square'], verbose: true } as CjMoveOpts)
      if (piece?.color === playerColor && !movesFromSelected.find((m: { to: string }) => m.to === sq)) {
        const newMoves = chess.moves({ square: sq as CjMoveOpts['square'], verbose: true } as CjMoveOpts)
        if (newMoves.length > 0) {
          setSelected(sq); setLegalMoves((newMoves as { to: string }[]).map(m => m.to)); return
        }
      }

      // Evaluate move attempt
      const expected = puzzle.puzzle.solution[solutionIdx]
      const attempt  = `${selected}${sq}`

      if (expected.slice(0, 4) === attempt) {
        const promo = expected.length === 5 ? expected[4] : undefined
        const result = chess.move({ from: selected, to: sq, promotion: promo })
        if (!result) return
        setFen(chess.fen())
        setLastMove({ from: selected, to: sq })
        setSelected(null); setLegalMoves([])
        const next = solutionIdx + 1
        setSolutionIdx(next)
        if (next >= puzzle.puzzle.solution.length) setStatus('solved')
      } else {
        const isLegalMove = (chess.moves({ square: selected as CjMoveOpts['square'], verbose: true } as CjMoveOpts) as { to: string }[]).find(m => m.to === sq)
        if (isLegalMove) {
          setStatus('wrong')
          setTimeout(() => setStatus('playing'), 1200)
        }
        setSelected(null); setLegalMoves([])
      }
    } else {
      type CjSq = Parameters<typeof chess.get>[0]
      type CjMoveOpts = Parameters<typeof chess.moves>[0]
      const piece = chess.get(sq as CjSq)
      if (piece?.color === playerColor) {
        const moves = chess.moves({ square: sq as CjMoveOpts['square'], verbose: true } as CjMoveOpts)
        if (moves.length > 0) {
          setSelected(sq)
          setLegalMoves((moves as { to: string }[]).map(m => m.to))
        }
      }
    }
  }, [fen, selected, puzzle, solutionIdx, status, playerColor])

  const loadNewPuzzle = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/puzzle')
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json()
      initPuzzle(data)
    } catch {
      // API down — pick a different local puzzle client-side
      const { getRandomPuzzle, toApiFormat } = await import('@/lib/puzzles')
      initPuzzle(toApiFormat(getRandomPuzzle(puzzle.puzzle.id)))
    } finally {
      setLoading(false)
    }
  }, [initPuzzle, puzzle])

  if (!fen) return null

  const chess     = new Chess(fen)
  const isMyTurn  = chess.turn() === playerColor && status === 'playing'
  const progress  = solutionIdx / puzzle.puzzle.solution.length

  return (
    <div className="min-h-screen flex flex-col bg-[#070d1a] text-white">
      <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-slate-800/50 shrink-0 gap-3">
        {/* Left — logo */}
        <Link href="/" aria-label="Go to homepage" className="flex items-center gap-2 group shrink-0 cursor-pointer">
          <PawnIcon size={16} />
          <span className="font-black text-[10px] tracking-widest neon-text uppercase hidden md:block">
            LET&apos;S PLAY SOME CHESS
          </span>
        </Link>

        {/* Center — page label */}
        <div className="flex-1 text-center hidden sm:block">
          <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Daily Puzzle</p>
          <p className="text-[10px] text-slate-600 mt-0.5">Rating: {puzzle.puzzle.rating}</p>
        </div>

        {/* Right — nav */}
        <nav className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide
              bg-slate-800/60 border border-slate-700/60 text-slate-300
              hover:border-slate-500 hover:text-white transition-all"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <Link
            href="/play/ai"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide
              bg-purple-500/10 border border-purple-500/30 text-purple-400
              hover:bg-purple-500/20 hover:border-purple-500/50 transition-all"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Play AI</span>
          </Link>
          <Link
            href="/play/online"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide
              bg-cyan-500/10 border border-cyan-500/30 text-cyan-400
              hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-all"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Play Online</span>
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 p-6">
        <div className="w-full max-w-[min(90vw,500px)] aspect-square">
          <ChessBoard2D
            fen={fen}
            selectedSquare={selected}
            legalMoves={legalMoves}
            lastMove={lastMove}
            theme="neon"
            showCoords={true}
            playerColor={playerColor}
            isMyTurn={isMyTurn}
            isGameOver={status === 'solved'}
            onSquareClick={handleSquareClick}
            hintSquare={hintSquare}
          />
        </div>

        <div className="w-full max-w-sm flex flex-col gap-4">
          {/* Status */}
          <div className={`rounded-2xl p-5 border text-center transition-all duration-300 ${
            status === 'solved' ? 'bg-emerald-500/10 border-emerald-500/40' :
            status === 'wrong'  ? 'bg-red-500/10 border-red-800/50' :
            'bg-slate-800/50 border-slate-700/60'
          }`}>
            <div className="text-3xl mb-2 select-none">
              {status === 'solved' ? '✓' : status === 'wrong' ? '✗' : isMyTurn ? '🧩' : '⏳'}
            </div>
            <p className={`font-black text-base ${
              status === 'solved' ? 'text-emerald-400' :
              status === 'wrong'  ? 'text-red-400' :
              'text-white'
            }`}>
              {status === 'solved' ? 'Puzzle Solved!' :
               status === 'wrong'  ? 'Not the right move' :
               isMyTurn ? 'Find the best move' : 'Opponent thinking…'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {playerColor === 'w' ? 'White to move' : 'Black to move'}
            </p>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-600 mb-1.5 font-bold tracking-wider uppercase">
              <span>Progress</span>
              <span>{solutionIdx} / {puzzle.puzzle.solution.length}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          {/* Themes */}
          <div className="flex flex-wrap gap-1.5">
            {puzzle.puzzle.themes.slice(0, 5).map(t => (
              <span key={t} className="px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 mt-1">
            {status === 'solved' && (
              <button
                onClick={loadNewPuzzle}
                disabled={loading}
                className="w-full py-3 rounded-xl font-black tracking-wider text-sm
                  bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950
                  shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all
                  flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                {loading ? 'Loading…' : 'New Puzzle'}
              </button>
            )}

            {status === 'playing' && (
              <button
                onClick={() => {
                  if (hintsUsed >= MAX_HINTS) return
                  const move = puzzle.puzzle.solution[solutionIdx]
                  if (!move) return
                  setHintSquare(move.slice(0, 2))
                  setHintsUsed(h => h + 1)
                }}
                disabled={hintsUsed >= MAX_HINTS || hintSquare !== null}
                className="w-full py-2.5 rounded-xl text-sm font-bold
                  border transition-all flex items-center justify-center gap-2
                  disabled:opacity-40 disabled:cursor-not-allowed
                  bg-amber-500/10 border-amber-500/30 text-amber-400
                  hover:bg-amber-500/20 hover:border-amber-500/50
                  disabled:hover:bg-amber-500/10 disabled:hover:border-amber-500/30"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                {hintSquare !== null
                  ? 'Piece highlighted'
                  : hintsUsed >= MAX_HINTS
                    ? 'No hints left'
                    : `Hint (${MAX_HINTS - hintsUsed} left)`}
              </button>
            )}

            <button
              onClick={() => initPuzzle(puzzle)}
              className="w-full py-2.5 rounded-xl text-sm font-bold
                bg-slate-800/60 border border-slate-700 text-slate-400
                hover:border-slate-500 hover:text-slate-200 transition-all
                flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restart
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
