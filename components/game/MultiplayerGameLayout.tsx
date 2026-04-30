'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Chess } from 'chess.js'
import { ChessBoard2D } from './ChessBoard2D'
import { PlayerPanel } from './PlayerPanel'
import { MoveLog } from './MoveLog'
import { TweaksPanel } from './TweaksPanel'
import { GameControls } from './GameControls'
import { ModeSelector } from './ModeSelector'
import { PromotionDialog } from './PromotionDialog'
import { GameResultModal } from './GameResultModal'
import type { PromoPiece } from './PromotionDialog'
import { useChessGame } from '@/features/chess/hooks/useChessGame'
import { useTimer } from '@/features/chess/hooks/useTimer'
import { useGameChannel } from '@/features/multiplayer/hooks/useGameChannel'
import { recordMove, resignGame, offerDraw } from '@/features/multiplayer/actions/game'
import { chessAudio } from '@/lib/audio'
import type { BoardTheme, Color, GameResultColor, MoveRecord, TimeControl } from '@/features/chess/types/chess.types'
import { resultToWinner } from '@/features/chess/types/chess.types'
import { Radio, Wifi, WifiOff, Volume2, VolumeX } from 'lucide-react'

const ChessBoard3D = dynamic(
  () => import('@/components/3d/ChessBoard3D').then(m => ({ default: m.ChessBoard3D })),
  { ssr: false, loading: () => <div className="w-full aspect-square bg-slate-900/40 rounded-sm animate-pulse" /> }
)

interface PlayerInfo {
  id:       string
  username: string
  elo:      number
  color:    Color
}

interface Props {
  gameId:       string
  me:           PlayerInfo
  opponent:     PlayerInfo
  initialFen:   string
  initialMoves: MoveRecord[]
  whiteTimeMs:  number
  blackTimeMs:  number
  timeControl:  TimeControl
  status:       'active' | 'completed' | 'abandoned'
  result?:      'white' | 'black' | 'draw' | null
}

type EndReason = 'checkmate' | 'timeout' | 'resign' | 'draw' | 'stalemate' | 'opponent_resigned'

interface GameOverState {
  result: GameResultColor
  reason: EndReason
}

// Pending promotion: from+to squares awaiting piece selection
interface PendingPromo {
  from: string
  to:   string
}

export function MultiplayerGameLayout({
  gameId, me, opponent,
  initialFen, initialMoves,
  whiteTimeMs, blackTimeMs,
  timeControl, status, result: initialResult,
}: Props) {
  const router = useRouter()

  // UI state
  const [theme,          setTheme]          = useState<BoardTheme>('neon')
  const [coords,         setCoords]         = useState(true)
  const [view3D,         setView3D]         = useState(false)
  const [muted,          setMuted]          = useState(false)
  const [tweaksOpen,     setTweaksOpen]     = useState(false)
  const [opponentOnline, setOpponentOnline] = useState(true)

  // Game over
  const [gameOver, setGameOver] = useState<GameOverState | null>(
    initialResult ? {
      result: initialResult,
      reason: initialResult === 'draw' ? 'draw' : 'checkmate',
    } : null
  )

  // Draw offer
  const [drawOfferPending,  setDrawOfferPending]  = useState(false)  // opponent offered us a draw
  const [drawOfferSent,     setDrawOfferSent]     = useState(false)   // we offered a draw

  // Pawn promotion
  const [promoDialog,    setPromoDialog]    = useState(false)
  const [pendingPromo,   setPendingPromo]   = useState<PendingPromo | null>(null)

  const moveStartTime = useRef<number>(Date.now())

  const { state, selectSquare, applyOpponentMove, hydrate, forceGameOver } = useChessGame(me.color)

  // Hydrate board from server state on mount
  useEffect(() => {
    if (initialFen && initialMoves.length > 0) {
      hydrate(initialFen, initialMoves)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep audio muted flag in sync
  useEffect(() => { chessAudio.setMuted(muted) }, [muted])

  // Reset move start time each turn
  useEffect(() => { moveStartTime.current = Date.now() }, [state.turn])

  // ── Timer ─────────────────────────────────────────────────────────────────
  const handleTimeout = useCallback((color: Color) => {
    const result: GameResultColor = color === 'w' ? 'black' : 'white'
    setGameOver({ result, reason: 'timeout' })
    forceGameOver(resultToWinner(result))
    chessAudio.gameLose()
  }, [forceGameOver])

  const { whiteMs, blackMs } = useTimer({
    initialWhiteMs: whiteTimeMs,
    initialBlackMs: blackTimeMs,
    activeColor:    gameOver || status !== 'active' ? null : state.turn,
    onTimeout:      handleTimeout,
  })

  // ── Realtime channel ──────────────────────────────────────────────────────
  const { sendDrawOffer, sendDrawDeclined } = useGameChannel({
    gameId,
    myColor: me.color,

    onOpponentMove: (move) => {
      applyOpponentMove(move.from, move.to, move.promotion, move.fen)
      // Play appropriate sound
      if (move.san.includes('x'))       chessAudio.capture()
      else if (move.san.includes('O-')) chessAudio.castle()
      else                              chessAudio.move()
      // Check notification
      const chess = new Chess(move.fen)
      if (chess.inCheck()) {
        chessAudio.check()
        toast.warning('Check! Your king is in danger.')
      }
    },

    onGameOver: (result) => {
      const myColor = me.color
      const myResult: GameResultColor = myColor === 'w' ? 'white' : 'black'
      const iWon = result === myResult
      setGameOver({ result, reason: 'checkmate' })
      forceGameOver(resultToWinner(result))
      if (result === 'draw') chessAudio.draw()
      else if (iWon)         chessAudio.gameWin()
      else                   chessAudio.gameLose()
    },

    onOpponentPresence: (online) => {
      setOpponentOnline(online)
      if (!online) toast.info(`${opponent.username} disconnected`)
      else         toast.success(`${opponent.username} reconnected`)
    },

    onDrawOffer: () => {
      setDrawOfferPending(true)
      toast.info(`${opponent.username} offered a draw`, { duration: 60000, id: 'draw-offer' })
    },

    onDrawDeclined: () => {
      setDrawOfferSent(false)
      toast.error('Draw offer declined', { id: 'draw-sent' })
    },
  })

  // ── My move submission ────────────────────────────────────────────────────
  const submitMove = useCallback(async (from: string, to: string, promotion?: string) => {
    const timeTakenMs = Date.now() - moveStartTime.current
    selectSquare(to)   // optimistic local update

    const result = await recordMove(gameId, from, to, promotion, timeTakenMs)
    if (result.error) {
      toast.error(`Move rejected: ${result.error}`)
      return
    }

    // Play sounds based on move notation
    const san = result.san ?? ''
    if (san.includes('x'))       chessAudio.capture()
    else if (san.includes('O-')) chessAudio.castle()
    else if (san.includes('='))  chessAudio.promote()
    else                         chessAudio.move()

    if (result.isGameOver && result.result) {
      const myResult: GameResultColor = me.color === 'w' ? 'white' : 'black'
      const iWon = result.result === myResult
      setGameOver({
        result: result.result,
        reason: result.result === 'draw' ? 'stalemate' : 'checkmate',
      })
      forceGameOver(resultToWinner(result.result))
      if (result.result === 'draw') chessAudio.draw()
      else if (iWon)                chessAudio.gameWin()
      else                          chessAudio.gameLose()
    }
  }, [gameId, me.color, selectSquare, forceGameOver])

  const handleSquareClick = useCallback(async (square: string) => {
    if (gameOver || state.isGameOver) return
    if (state.turn !== me.color) return

    const prevSelected = state.selectedSquare
    const prevLegal    = state.legalMoves

    if (prevSelected && prevLegal.includes(square)) {
      // Check for pawn promotion
      const chess = new Chess(state.fen)
      const piece = chess.get(prevSelected as Parameters<typeof chess.get>[0])
      const isPromo = piece?.type === 'p' && (
        (piece.color === 'w' && square[1] === '8') ||
        (piece.color === 'b' && square[1] === '1')
      )

      if (isPromo) {
        setPendingPromo({ from: prevSelected, to: square })
        setPromoDialog(true)
      } else {
        await submitMove(prevSelected, square)
      }
    } else {
      selectSquare(square)
    }
  }, [gameOver, state, me.color, selectSquare, submitMove])

  const handlePromoSelect = useCallback(async (piece: PromoPiece) => {
    setPromoDialog(false)
    if (!pendingPromo) return
    await submitMove(pendingPromo.from, pendingPromo.to, piece)
    setPendingPromo(null)
  }, [pendingPromo, submitMove])

  // ── Resign ────────────────────────────────────────────────────────────────
  const handleResign = useCallback(async () => {
    const { error } = await resignGame(gameId)
    if (error) { toast.error(error); return }
    const result: GameResultColor = me.color === 'w' ? 'black' : 'white'
    setGameOver({ result, reason: 'resign' })
    forceGameOver(resultToWinner(result))
    chessAudio.gameLose()
  }, [gameId, me.color, forceGameOver])

  // ── Draw offer / response ─────────────────────────────────────────────────
  const handleOfferDraw = useCallback(async () => {
    if (drawOfferPending) {
      // Accept incoming draw offer
      toast.dismiss('draw-offer')
      setDrawOfferPending(false)
      const { error } = await offerDraw(gameId)
      if (error) { toast.error(error); return }
      setGameOver({ result: 'draw', reason: 'draw' })
      forceGameOver('draw')
      chessAudio.draw()
    } else {
      // Send draw offer to opponent
      sendDrawOffer()
      setDrawOfferSent(true)
      toast.info('Draw offer sent', { id: 'draw-sent' })
    }
  }, [drawOfferPending, gameId, sendDrawOffer, forceGameOver])

  const handleDeclineDraw = useCallback(() => {
    toast.dismiss('draw-offer')
    setDrawOfferPending(false)
    sendDrawDeclined()
    toast.success('Draw offer declined')
  }, [sendDrawDeclined])

  const isGameOver = !!gameOver || state.isGameOver

  // ── Derive outcome text ───────────────────────────────────────────────────
  function statusText(): string {
    if (!gameOver) {
      return state.turn === me.color ? 'Your move' : `${opponent.username}'s move`
    }
    const myResult: GameResultColor = me.color === 'w' ? 'white' : 'black'
    if (gameOver.result === 'draw') return 'Draw'
    return gameOver.result === myResult ? 'You win!' : 'You lose'
  }

  function statusColor(): string {
    if (!gameOver) return state.turn === me.color ? 'text-cyan-300' : 'text-slate-400'
    const myResult: GameResultColor = me.color === 'w' ? 'white' : 'black'
    if (gameOver.result === 'draw') return 'text-slate-400'
    return gameOver.result === myResult ? 'text-emerald-400' : 'text-red-400'
  }

  const boardProps = {
    fen:            state.fen,
    selectedSquare: state.selectedSquare,
    legalMoves:     state.turn === me.color ? state.legalMoves : [],
    lastMove:       state.lastMove,
    theme,
    showCoords:     coords,
    playerColor:    me.color,
    isMyTurn:       state.turn === me.color,
    isGameOver,
    onSquareClick:  handleSquareClick,
  }

  return (
    <div className="flex flex-col h-screen bg-[#070d1a] text-white overflow-hidden">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 text-lg">♟</span>
          <h1 className="font-bold text-base tracking-wide neon-text">LET&apos;S PLAY SOME CHESS</h1>
        </div>

        <ModeSelector activeMode="rapid" onChange={() => {}} />

        <div className="flex items-center gap-3">
          {/* Mute toggle */}
          <button
            onClick={() => setMuted(m => !m)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Opponent presence */}
          <div className={`flex items-center gap-1.5 text-xs font-medium ${opponentOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
            {opponentOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {opponentOnline ? 'Online' : 'Disconnected'}
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE ARENA
            <Radio className="w-3.5 h-3.5" />
          </div>
        </div>
      </header>

      {/* ── Draw offer banner ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {drawOfferPending && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-between px-6 py-2.5 bg-amber-900/30 border-b border-amber-700/40"
          >
            <p className="text-amber-300 text-sm font-medium">
              {opponent.username} offered a draw
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleOfferDraw}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-500/30 transition-all"
              >
                Accept
              </button>
              <button
                onClick={handleDeclineDraw}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800/60 text-slate-400 border border-slate-700 hover:border-slate-500 transition-all"
              >
                Decline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main 3-column layout ─────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Player panel */}
        <aside className="w-56 shrink-0 border-r border-slate-800/40">
          <PlayerPanel
            player={me}
            opponent={opponent}
            whiteMs={whiteMs}
            blackMs={blackMs}
            turn={state.turn}
            isGameOver={isGameOver}
          />
        </aside>

        {/* Center: Board */}
        <section className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-2 min-w-0">
          <div className={`text-xs font-semibold tracking-widest uppercase ${statusColor()}`}>
            {statusText()}
          </div>

          {view3D
            ? <ChessBoard3D {...boardProps} />
            : <ChessBoard2D {...boardProps} />
          }

          {/* Post-game CTAs */}
          <AnimatePresence>
            {isGameOver && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <button
                  onClick={() => router.push('/play')}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 hover:bg-cyan-500/30 transition-all"
                >
                  New Game
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-5 py-2.5 rounded-lg text-sm font-bold tracking-wider bg-slate-800/60 text-slate-300 border border-slate-700 hover:border-slate-500 transition-all"
                >
                  Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Right: Move log + Tweaks */}
        <aside className="w-64 shrink-0 border-l border-slate-800/40 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <MoveLog moves={state.moveHistory} />
          </div>

          <div className="p-3 border-t border-slate-800/40">
            <AnimatePresence>
              {tweaksOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                >
                  <TweaksPanel
                    theme={theme}
                    timeControl={timeControl}
                    aiEnabled={false}
                    aiLevel={'easy'}
                    coordinates={coords}
                    view3D={view3D}
                    onTheme={setTheme}
                    onTime={() => {}}
                    onAI={() => {}}
                    onAILevel={() => {}}
                    onCoords={setCoords}
                    on3D={setView3D}
                    onClose={() => setTweaksOpen(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </main>

      {/* ── Bottom controls ───────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/50">
        <GameControls
          onResign={handleResign}
          onDraw={handleOfferDraw}
          onSettings={() => setTweaksOpen(v => !v)}
          onNewGame={() => router.push('/play')}
          disabled={isGameOver}
        />
      </footer>

      {/* ── Promotion dialog ──────────────────────────────────────────────────── */}
      <PromotionDialog
        open={promoDialog}
        color={me.color}
        onSelect={handlePromoSelect}
      />

      {/* ── Game result modal ─────────────────────────────────────────────────── */}
      <GameResultModal
        open={!!gameOver}
        result={gameOver?.result ?? null}
        myColor={me.color}
        reason={gameOver?.reason ?? 'checkmate'}
        myUsername={me.username}
        oppUsername={opponent.username}
        myElo={me.elo}
        userId={me.id}
        onNewGame={() => router.push('/play')}
        onDashboard={() => router.push('/dashboard')}
      />
    </div>
  )
}
