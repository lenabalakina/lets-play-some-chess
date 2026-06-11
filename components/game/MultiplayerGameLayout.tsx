'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Chess } from 'chess.js'
import { ChessBoard2D } from './ChessBoard2D'
import { PlayerPanel } from './PlayerPanel'
import { MoveLog } from './MoveLog'
import { ChatPanel } from './ChatPanel'
import { TweaksPanel } from './TweaksPanel'
import { GameControls } from './GameControls'
import { ModeSelector } from './ModeSelector'
import { PromotionDialog } from './PromotionDialog'
import { GameResultModal } from './GameResultModal'
import type { PromoPiece } from './PromotionDialog'
import { useChessGame } from '@/features/chess/hooks/useChessGame'
import { useTimer, formatTime } from '@/features/chess/hooks/useTimer'
import { useGameChannel } from '@/features/multiplayer/hooks/useGameChannel'
import { recordMove, resignGame, offerDraw } from '@/features/multiplayer/actions/game'
import { chessAudio } from '@/lib/audio'
import type { BoardTheme, Color, GameResultColor, MoveRecord, Square, TimeControl } from '@/features/chess/types/chess.types'
import { resultToWinner } from '@/features/chess/types/chess.types'
import { Radio, Wifi, WifiOff, Volume2, VolumeX, X, AlignJustify, MessageCircle } from 'lucide-react'
import { PawnIcon } from '@/components/ui/PawnIcon'
import { useBoardSize } from '@/hooks/useBoardSize'

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
  const [leaveConfirm,   setLeaveConfirm]   = useState(false)
  const [activeTab,      setActiveTab]      = useState<'chat' | 'moves'>('chat')
  const [mobileSheet,    setMobileSheet]    = useState<'moves' | 'chat' | null>(null)
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

  const { state, selectSquare, makeMove, applyOpponentMove, hydrate, forceGameOver } = useChessGame(me.color)

  // Hydrate board from server state on mount (including fresh games with no moves yet)
  useEffect(() => {
    if (initialFen) {
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

    const result = await recordMove(gameId, from, to, promotion, timeTakenMs)
    if (result.error) {
      toast.error(`Move rejected: ${result.error}`)
      return
    }

    if (result.fen) {
      makeMove(from as Square, to as Square, promotion, timeTakenMs)
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
  }, [gameId, me.color, makeMove, forceGameOver])

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

  const { ref: boardAreaRef, size: boardSize } = useBoardSize()
  const myMs  = me.color  === 'w' ? whiteMs : blackMs
  const oppMs = opponent.color === 'w' ? whiteMs : blackMs
  const myActive  = !isGameOver && state.turn === me.color
  const oppActive = !isGameOver && state.turn === opponent.color

  return (
    <div className="flex flex-col h-[100dvh] bg-[#070d1a] text-white overflow-hidden">

      {/* ── DESKTOP HEADER (lg+) ──────────────────────────────── */}
      <header className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-slate-800/50 shrink-0">
        <button
          onClick={() => isGameOver ? router.push('/') : setLeaveConfirm(true)}
          aria-label="Go to homepage"
          className="flex items-center gap-3 cursor-pointer group"
        >
          <PawnIcon size={18} />
          <h1 className="font-bold text-base tracking-wide neon-text group-hover:opacity-80 transition-opacity">LET&apos;S PLAY SOME CHESS</h1>
        </button>
        <ModeSelector activeMode="rapid" onChange={() => {}} />
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMuted(m => !m)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
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

      {/* ── MOBILE HEADER (< lg) ─────────────────────────────── */}
      <header className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-slate-800/50 shrink-0">
        <button
          onClick={() => isGameOver ? router.push('/') : setLeaveConfirm(true)}
          aria-label="Go to homepage"
          className="flex items-center gap-2 cursor-pointer group"
        >
          <PawnIcon size={16} />
          <h1 className="font-black text-[10px] tracking-widest neon-text uppercase group-hover:opacity-80 transition-opacity">LET&apos;S PLAY SOME CHESS</h1>
        </button>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-[10px] font-medium ${opponentOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
            {opponentOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {opponentOnline ? 'Online' : 'Away'}
          </div>
          <button
            onClick={() => setMuted(m => !m)}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
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

      {/* ── Main layout ──────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* Left: Player panel — desktop only */}
        <aside className="hidden lg:flex w-56 shrink-0 border-r border-slate-800/40 flex-col overflow-hidden">
          <PlayerPanel
            player={me}
            opponent={opponent}
            whiteMs={whiteMs}
            blackMs={blackMs}
            turn={state.turn}
            isGameOver={isGameOver}
          />
        </aside>

        {/* Center: Board + mobile UI */}
        <section className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Mobile opponent strip */}
          <div className="lg:hidden px-2 pt-2 pb-1 shrink-0">
            <div className="flex items-center justify-between px-3 py-2 glass-panel rounded-xl">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  {opponent.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-xs truncate">{opponent.username}</p>
                  <p className="text-slate-400 text-[10px]">ELO {opponent.elo}</p>
                </div>
              </div>
              <div className={`font-mono text-xl font-bold tracking-widest shrink-0 ml-2
                ${oppActive && oppMs < 30000 ? 'text-red-400 animate-pulse' :
                  oppActive ? (opponent.color === 'w' ? 'text-cyan-300' : 'text-purple-300') :
                  'text-slate-500'}`}>
                {formatTime(oppMs)}
              </div>
            </div>
          </div>

          {/* Board area */}
          <div className="flex-1 flex flex-col items-center min-h-0 overflow-hidden px-2 py-1 lg:px-4 lg:py-2">
            <div className={`text-[11px] font-semibold tracking-widest uppercase shrink-0 py-1 ${statusColor()}`}>
              {statusText()}
            </div>
            <div
              ref={boardAreaRef}
              className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
            >
              <div style={{ width: boardSize, height: boardSize, flexShrink: 0 }}>
                {view3D
                  ? <ChessBoard3D {...boardProps} />
                  : <ChessBoard2D {...boardProps} />
                }
              </div>
            </div>

            {/* Post-game CTAs */}
            <AnimatePresence>
              {isGameOver && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3 shrink-0"
                >
                  <button
                    onClick={() => router.push('/play')}
                    className="px-4 py-2 rounded-lg text-xs font-bold tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/60 hover:bg-cyan-500/30 transition-all"
                  >
                    New Game
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="px-4 py-2 rounded-lg text-xs font-bold tracking-wider bg-slate-800/60 text-slate-300 border border-slate-700 hover:border-slate-500 transition-all"
                  >
                    Dashboard
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile my strip */}
          <div className="lg:hidden px-2 pb-1 pt-1 shrink-0">
            <div className="flex items-center justify-between px-3 py-2 glass-panel rounded-xl">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                  {me.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-xs truncate">{me.username}</p>
                  <p className="text-slate-400 text-[10px]">ELO {me.elo}</p>
                </div>
              </div>
              <div className={`font-mono text-xl font-bold tracking-widest shrink-0 ml-2
                ${myActive && myMs < 30000 ? 'text-red-400 animate-pulse' :
                  myActive ? (me.color === 'w' ? 'text-cyan-300' : 'text-purple-300') :
                  'text-slate-500'}`}>
                {formatTime(myMs)}
              </div>
            </div>
          </div>

          {/* Mobile action bar */}
          <div className="lg:hidden flex items-stretch border-t border-slate-800/50 shrink-0 h-10">
            {([
              { id: 'moves' as const, Icon: AlignJustify,  label: 'Moves' },
              { id: 'chat'  as const, Icon: MessageCircle, label: 'Chat'  },
            ]).map(({ id, Icon, label }) => (
              <button
                key={id}
                onClick={() => setMobileSheet(s => s === id ? null : id)}
                className={`flex-1 flex items-center justify-center gap-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors
                  ${mobileSheet === id ? 'text-cyan-300 bg-cyan-500/10' : 'text-slate-600 hover:text-slate-400'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

        </section>

        {/* Right: Chat + Moves + Tweaks — desktop only */}
        <aside className="hidden lg:flex w-64 shrink-0 border-l border-slate-800/40 flex-col">

          {/* Always-visible board controls */}
          <div className="px-3 pt-3 pb-2 border-b border-slate-800/50 shrink-0 space-y-2.5">
            <div>
              <p className="text-[9px] font-bold tracking-widest text-slate-500 uppercase mb-1.5">Board Theme</p>
              <div className="grid grid-cols-4 gap-1">
                {([
                  { id: 'neon',   dot: '#06b6d4', label: 'Neon'   },
                  { id: 'void',   dot: '#8b5cf6', label: 'Void'   },
                  { id: 'ember',  dot: '#f97316', label: 'Ember'  },
                  { id: 'arctic', dot: '#94e2d5', label: 'Arctic' },
                ] as const).map(t => (
                  <button key={t.id} onClick={() => setTheme(t.id)} title={t.label}
                    className={`flex flex-col items-center gap-1 py-1.5 rounded-lg border text-[9px] font-bold transition-all
                      ${theme === t.id ? 'border-slate-500 bg-slate-700 text-white' : 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}>
                    <span className="w-3 h-3 rounded-full" style={{ background: t.dot }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300 text-xs">3D Board</span>
              <button role="switch" aria-checked={view3D} onClick={() => setView3D(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${view3D ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${view3D ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {/* Chat / Moves tabs */}
          <div className="flex border-b border-slate-800/50 shrink-0">
            {(['chat', 'moves'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors
                  ${activeTab === tab ? 'text-cyan-300 border-b-2 border-cyan-500' : 'text-slate-600 hover:text-slate-400'}`}>
                {tab === 'chat' ? 'Chat' : 'Moves'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'chat'
              ? <ChatPanel whiteUsername={me.username} blackUsername={opponent.username} turn={me.color} />
              : <MoveLog moves={state.moveHistory} />
            }
          </div>

          <div className="border-t border-slate-800/40 shrink-0">
            <AnimatePresence>
              {tweaksOpen && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="p-3">
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
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

      </main>

      {/* ── Mobile bottom sheet ─────────────────────────────────── */}
      <AnimatePresence>
        {mobileSheet && (
          <motion.div
            className="lg:hidden fixed inset-x-0 z-40"
            style={{ bottom: 44 }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            <div className="bg-[#0d1829] border-t border-slate-700/40 rounded-t-xl overflow-hidden" style={{ maxHeight: '45vh' }}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/50 shrink-0">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  {mobileSheet === 'moves' ? 'Move Log' : 'Chat'}
                </span>
                <button onClick={() => setMobileSheet(null)} className="text-slate-600 hover:text-slate-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-hidden" style={{ height: 'calc(45vh - 36px)' }}>
                {mobileSheet === 'moves' && <MoveLog moves={state.moveHistory} />}
                {mobileSheet === 'chat' && (
                  <ChatPanel
                    whiteUsername={me.username}
                    blackUsername={opponent.username}
                    turn={me.color}
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom controls ──────────────────────────────────────── */}
      <footer className="border-t border-slate-800/50 shrink-0">
        <GameControls
          onResign={handleResign}
          onDraw={handleOfferDraw}
          onSettings={() => setTweaksOpen(v => !v)}
          onNewGame={() => router.push('/play')}
          disabled={isGameOver}
        />
      </footer>

      {/* ── Mobile settings bottom sheet ─────────────────────────── */}
      <AnimatePresence>
        {tweaksOpen && (
          <motion.div
            className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setTweaksOpen(false)} />
            <motion.div
              className="relative bg-[#0d1829] border-t border-slate-700/50 rounded-t-2xl overflow-y-auto max-h-[88vh]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-600 rounded-full" />
              </div>
              <div className="p-4">
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Promotion dialog ──────────────────────────────────────────────────── */}
      <PromotionDialog
        open={promoDialog}
        color={me.color}
        onSelect={handlePromoSelect}
      />

      {/* ── Leave confirmation ───────────────────────────────────────────────── */}
      {leaveConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setLeaveConfirm(false)}
        >
          <div
            className="bg-[#0d1829] border border-slate-700 rounded-2xl p-6 w-80 flex flex-col gap-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-white font-bold text-base tracking-wide">Leave current game?</h2>
            <p className="text-slate-400 text-sm">Your game will be counted as a loss if you leave now.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setLeaveConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 bg-slate-800 border border-slate-700 hover:border-slate-500 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600/80 border border-red-500/60 hover:bg-red-600 transition-all cursor-pointer"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

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
        onRematch={() => router.push('/play')}
      />
    </div>
  )
}
