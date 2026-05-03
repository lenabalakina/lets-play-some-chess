'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { Chess } from 'chess.js'
import { ChessBoard2D } from './ChessBoard2D'
import { PlayerPanel } from './PlayerPanel'
import { MoveLog } from './MoveLog'
import { TweaksPanel } from './TweaksPanel'
import { GameControls } from './GameControls'
import { ModeSelector, type GameMode } from './ModeSelector'
import { PromotionDialog } from './PromotionDialog'
import type { PromoPiece } from './PromotionDialog'
import { ChatPanel } from './ChatPanel'
import { DifficultyPanel } from './DifficultyPanel'
import type { Difficulty } from './DifficultyPanel'
import { useChessGame } from '@/features/chess/hooks/useChessGame'
import { useStockfish } from '@/features/ai/useStockfish'
import type { AiLevel } from '@/features/ai/useStockfish'
import { useTimer, formatTime } from '@/features/chess/hooks/useTimer'
import { chessAudio } from '@/lib/audio'
import { TIME_CONTROL_MS } from '@/features/chess/types/chess.types'
import type { BoardTheme, Color, TimeControl } from '@/features/chess/types/chess.types'
import { Radio, Volume2, VolumeX, LayoutDashboard, LogOut, Clock, Bot } from 'lucide-react'
import { PawnIcon } from '@/components/ui/PawnIcon'
import { useBoardSize } from '@/hooks/useBoardSize'
import { GameResultModal } from './GameResultModal'
import { signOut } from '@/features/auth/actions/auth'
import Link from 'next/link'

const ChessBoard3D = dynamic(
  () => import('@/components/3d/ChessBoard3D').then(m => ({ default: m.ChessBoard3D })),
  { ssr: false, loading: () => <div className="w-full aspect-square bg-slate-900/40 rounded-sm animate-pulse" /> }
)

interface PlayerInfo {
  username: string
  elo:      number
}

interface Props {
  me:              PlayerInfo & { id?: string }
  opponent:        PlayerInfo
  initialAi?:      boolean
  initialAiLevel?: AiLevel
}

const MODE_TO_TIME: Record<GameMode, TimeControl> = {
  bullet:  'bullet_1',
  blitz:   'blitz_3',
  rapid:   'rapid_10',
  classic: 'classic_15',
}

function MobilePlayerStrip({
  username, elo, ms, isActive, color,
}: { username: string; elo: number; ms: number; isActive: boolean; color: Color }) {
  const low = ms < 30_000
  return (
    <div className="flex items-center justify-between px-3 py-2 glass-panel rounded-xl">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
          {username.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-xs truncate">{username}</p>
          <p className="text-slate-400 text-[10px]">ELO {elo}</p>
        </div>
      </div>
      <div className={`font-mono text-xl font-bold tracking-widest shrink-0 ml-2
        ${isActive && low  ? 'text-red-400 animate-pulse' :
          isActive         ? (color === 'w' ? 'text-cyan-300' : 'text-purple-300') :
          'text-slate-500'}`}>
        {formatTime(ms)}
      </div>
    </div>
  )
}

export function GameLayout({ me, opponent, initialAi = false, initialAiLevel = 'easy' }: Props) {
  const [playerColor] = useState<Color>('w')
  const [theme,       setTheme]       = useState<BoardTheme>('neon')
  const [timeControl, setTimeControl] = useState<TimeControl>('rapid_10')
  const [gameMode,    setGameMode]    = useState<GameMode>('rapid')
  const [aiEnabled,   setAiEnabled]   = useState(initialAi)
  const [coords,      setCoords]      = useState(true)
  const [view3D,      setView3D]      = useState(false)
  const [muted,       setMuted]       = useState(false)
  const [tweaksOpen,  setTweaksOpen]  = useState(false)
  const [resigned,    setResigned]    = useState(false)
  const [promoDialog,  setPromoDialog]  = useState(false)
  const [activeTab,    setActiveTab]    = useState<'moves' | 'chat'>('chat')
  const [mobileTab,    setMobileTab]    = useState<'moves' | 'chat' | 'play'>('moves')
  const [difficulty,   setDifficulty]   = useState<Difficulty>('vision')
  const [aiLevel,      setAiLevel]      = useState<AiLevel>(initialAiLevel)
  const pendingPromoRef = useRef<{ from: string; to: string } | null>(null)
  const { ref: boardAreaRef, size: boardSize } = useBoardSize()

  const { state, selectSquare, makeMove, resetGame } = useChessGame(playerColor)

  const handleTimeout = useCallback((color: Color) => {
    chessAudio.gameLose()
    console.log(`${color} timed out`)
  }, [])

  const { whiteMs, blackMs, reset: resetTimer } = useTimer({
    initialWhiteMs: TIME_CONTROL_MS[timeControl],
    initialBlackMs: TIME_CONTROL_MS[timeControl],
    activeColor:    state.isGameOver || resigned ? null : state.turn,
    onTimeout:      handleTimeout,
  })

  function handleNewGame() {
    resetGame()
    resetTimer(TIME_CONTROL_MS[timeControl], TIME_CONTROL_MS[timeControl])
    setResigned(false)
    chessAudio.gameStart()
  }

  function handleResign() {
    setResigned(true)
    chessAudio.gameLose()
  }

  function handleModeChange(mode: GameMode) {
    const tc = MODE_TO_TIME[mode]
    setGameMode(mode)
    setTimeControl(tc)
    resetGame()
    resetTimer(TIME_CONTROL_MS[tc], TIME_CONTROL_MS[tc])
    setResigned(false)
  }

  const isGameOver = state.isGameOver || resigned
  const myInfo     = { ...me,       color: playerColor }
  const oppInfo    = { ...opponent, color: (playerColor === 'w' ? 'b' : 'w') as Color }

  const myMs  = playerColor === 'w' ? whiteMs : blackMs
  const oppMs = oppInfo.color === 'w' ? whiteMs : blackMs
  const myActive  = !isGameOver && state.turn === playerColor
  const oppActive = !isGameOver && state.turn === oppInfo.color

  const { thinking: aiThinking } = useStockfish({
    enabled:  aiEnabled && !isGameOver,
    level:    aiLevel,
    fen:      state.fen,
    myColor:  playerColor,
    turn:     state.turn,
    onMove:   (from, to, promotion) => {
      makeMove(from, to, promotion)
      chessAudio.move()
    },
  })

  const handleSquareClick = useCallback((square: string) => {
    if (isGameOver) return
    if (aiEnabled && (state.turn !== playerColor || aiThinking)) return
    const prevSelected = state.selectedSquare
    const prevLegal    = state.legalMoves

    if (prevSelected && prevLegal.includes(square)) {
      const chess = new Chess(state.fen)
      const piece = chess.get(prevSelected as Parameters<typeof chess.get>[0])
      const isPromo = piece?.type === 'p' && (
        (piece.color === 'w' && square[1] === '8') ||
        (piece.color === 'b' && square[1] === '1')
      )
      if (isPromo) {
        pendingPromoRef.current = { from: prevSelected, to: square }
        setPromoDialog(true)
      } else {
        selectSquare(square)
        chessAudio.move()
      }
    } else {
      selectSquare(square)
    }
  }, [isGameOver, state, selectSquare, aiEnabled, aiThinking, playerColor])

  const handlePromoSelect = useCallback((piece: PromoPiece) => {
    setPromoDialog(false)
    const p = pendingPromoRef.current
    if (!p) return
    makeMove(p.from, p.to, piece)
    chessAudio.promote()
    pendingPromoRef.current = null
  }, [makeMove])

  function getShadowFen(fen: string, myColor: Color): string {
    try {
      const chess    = new Chess(fen)
      const board    = chess.board()
      const visible  = new Set<string>()
      for (const row of board) {
        for (const cell of row) {
          if (!cell || cell.color !== myColor) continue
          visible.add(cell.square)
          chess.moves({ square: cell.square as Parameters<typeof chess.moves>[0]['square'], verbose: true })
            .forEach(m => visible.add(m.to))
        }
      }
      const shadow = new Chess(fen)
      for (const row of board) {
        for (const cell of row) {
          // Never remove the king — chess.js requires both kings in a valid position
          if (cell && cell.color !== myColor && cell.type !== 'k' && !visible.has(cell.square)) {
            shadow.remove(cell.square as Parameters<typeof shadow.remove>[0])
          }
        }
      }
      return shadow.fen()
    } catch { return fen }
  }

  // Shadow: always from the player's perspective (not the current turn)
  const displayFen = difficulty === 'shadow'
    ? getShadowFen(state.fen, playerColor)
    : state.fen

  const isMyTurn = aiEnabled ? (state.turn === playerColor && !aiThinking) : true

  const sharedBoardProps = {
    fen:            displayFen,
    selectedSquare: state.selectedSquare,
    legalMoves:     difficulty === 'vision' ? state.legalMoves : [],
    lastMove:       state.lastMove,
    theme,
    showCoords:     coords,
    isMyTurn,
    isGameOver,
    onSquareClick:  handleSquareClick,
  }
  const board2DProps = { ...sharedBoardProps, playerColor: aiEnabled ? playerColor : state.turn }
  const board3DProps = { ...sharedBoardProps, playerColor: 'w' as const }

  const statusText = isGameOver
    ? (resigned
        ? 'Game over — better luck next time'
        : state.winner === 'draw'
          ? 'Draw!'
          : `${state.winner === 'w' ? 'White' : 'Black'} wins!`)
    : aiEnabled && aiThinking
      ? '🤖 AI is thinking…'
      : aiEnabled
        ? (state.turn === playerColor ? '♔ Your move' : '♚ AI to move')
        : (state.turn === 'w' ? '♔ White to move' : '♚ Black to move')

  const statusColor = isGameOver
    ? 'text-slate-400'
    : state.turn === 'w' ? 'text-cyan-300' : 'text-purple-300'

  const tweaksPanelJSX = (
    <TweaksPanel
      theme={theme}
      timeControl={timeControl}
      aiEnabled={aiEnabled}
      aiLevel={aiLevel}
      coordinates={coords}
      view3D={view3D}
      onTheme={setTheme}
      onTime={(tc) => {
        setTimeControl(tc)
        resetTimer(TIME_CONTROL_MS[tc], TIME_CONTROL_MS[tc])
      }}
      onAI={setAiEnabled}
      onAILevel={setAiLevel}
      onCoords={setCoords}
      on3D={setView3D}
      onClose={() => setTweaksOpen(false)}
    />
  )

  return (
    <div className="flex flex-col h-[100dvh] bg-[#070d1a] text-white overflow-hidden">

      {/* ── DESKTOP HEADER (lg+) ──────────────────────────────── */}
      <header className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-slate-800/50 shrink-0">
        <div className="flex items-center gap-3">
          <PawnIcon size={18} />
          <div>
            <h1 className="font-black text-sm tracking-widest neon-text uppercase">LET&apos;S PLAY SOME CHESS</h1>
            <p className="text-slate-600 text-[10px] tracking-wider">Your move. Make it legendary.</p>
          </div>
        </div>
        <ModeSelector activeMode={gameMode} onChange={handleModeChange} />
        <div className="flex items-center gap-3">
          <button
            onClick={() => { const m = !muted; setMuted(m); chessAudio.setMuted(m) }}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE ARENA
            <Radio className="w-3.5 h-3.5" />
          </div>
        </div>
      </header>

      {/* ── MOBILE HEADER (< lg) ─────────────────────────────── */}
      <header className="lg:hidden flex items-center gap-2 px-3 py-2 border-b border-slate-800/50 shrink-0">
        <PawnIcon size={16} />
        <span className="font-black text-[10px] tracking-widest neon-text uppercase shrink-0 hidden xs:block">
          LET&apos;S PLAY SOME CHESS
        </span>
        {/* Scrollable mode selector */}
        <div className="flex-1 overflow-x-auto scrollbar-none">
          <ModeSelector activeMode={gameMode} onChange={handleModeChange} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { const m = !muted; setMuted(m); chessAudio.setMuted(m) }}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden min-h-0">

        {/* Left panel — desktop only */}
        <aside className="hidden lg:flex w-56 shrink-0 border-r border-slate-800/40 flex-col overflow-hidden">
          <div className="flex-1 flex flex-col min-h-0">
            <PlayerPanel
              player={myInfo}
              opponent={oppInfo}
              whiteMs={whiteMs}
              blackMs={blackMs}
              turn={state.turn}
              isGameOver={isGameOver}
            />
          </div>
          <div className="border-t border-slate-800/40 shrink-0">
            <DifficultyPanel value={difficulty} onChange={setDifficulty} />
          </div>
        </aside>

        {/* Center — board + mobile UI */}
        <section className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Mobile opponent strip */}
          <div className="lg:hidden px-2 pt-2 pb-1 shrink-0">
            <MobilePlayerStrip
              username={opponent.username}
              elo={opponent.elo}
              ms={oppMs}
              isActive={oppActive}
              color={oppInfo.color}
            />
          </div>

          {/* Board area */}
          <div className="flex-1 flex flex-col items-center min-h-0 overflow-hidden px-2 py-1 lg:px-4 lg:py-2">
            <div className={`text-[11px] font-semibold tracking-widest uppercase shrink-0 py-1 ${statusColor}`}>
              {statusText}
            </div>
            {/* ref measures this box; boardSize = min(width, height, 640) */}
            <div
              ref={boardAreaRef}
              className="flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden"
            >
              <div style={{ width: boardSize, height: boardSize, flexShrink: 0 }}>
                {view3D
                  ? <ChessBoard3D {...board3DProps} />
                  : <ChessBoard2D {...board2DProps} />
                }
              </div>
            </div>
          </div>

          {/* Mobile my strip */}
          <div className="lg:hidden px-2 pt-1 pb-1 shrink-0">
            <MobilePlayerStrip
              username={me.username}
              elo={me.elo}
              ms={myMs}
              isActive={myActive}
              color={playerColor}
            />
          </div>

          {/* Mobile tabs: Moves / Chat / Play */}
          <div className="lg:hidden flex flex-col border-t border-slate-800/50 shrink-0" style={{ height: 130 }}>
            <div className="flex border-b border-slate-800/50 shrink-0">
              {(['moves', 'chat', 'play'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors
                    ${mobileTab === tab
                      ? 'text-cyan-300 border-b-2 border-cyan-500'
                      : 'text-slate-600 hover:text-slate-400'
                    }`}
                >
                  {tab === 'moves' ? 'Moves' : tab === 'chat' ? '💬 Chat' : '⚙ Play'}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {mobileTab === 'moves' && <MoveLog moves={state.moveHistory} />}
              {mobileTab === 'chat' && (
                <ChatPanel
                  whiteUsername={me.username}
                  blackUsername={opponent.username}
                  turn={state.turn}
                />
              )}
              {mobileTab === 'play' && (
                <div className="overflow-y-auto h-full p-2">
                  <DifficultyPanel value={difficulty} onChange={setDifficulty} />
                </div>
              )}
            </div>
          </div>

        </section>

        {/* Right panel — desktop only */}
        <aside className="hidden lg:flex w-64 shrink-0 border-l border-slate-800/40 flex-col">

          {/* Chat / Moves tabs */}
          <div className="flex border-b border-slate-800/50 shrink-0">
            {(['chat', 'moves'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 text-[10px] font-bold tracking-widest uppercase transition-colors
                  ${activeTab === tab ? 'text-cyan-300 border-b-2 border-cyan-500' : 'text-slate-600 hover:text-slate-400'}`}>
                {tab === 'chat' ? '💬 Chat' : 'Moves'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden min-h-0">
            {activeTab === 'moves'
              ? <MoveLog moves={state.moveHistory} />
              : <ChatPanel whiteUsername={me.username} blackUsername={opponent.username} turn={state.turn} />
            }
          </div>

          {/* DESIGN — always visible at bottom */}
          <div className="border-t border-slate-800/50 shrink-0 px-3 py-3 space-y-2.5">
            <p className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Design</p>

            {/* Theme picker */}
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

            {/* 3D + Coordinates */}
            {[
              { label: '3D Board', value: view3D, set: setView3D },
              { label: 'Coordinates', value: coords, set: setCoords },
            ].map(({ label, value, set }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-slate-300 text-xs">{label}</span>
                <button role="switch" aria-checked={value} onClick={() => set((v: boolean) => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
          </div>
        </aside>

      </main>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/50 shrink-0">
        <GameControls
          onResign={handleResign}
          onDraw={() => {}}
          onSettings={() => setTweaksOpen(v => !v)}
          onNewGame={handleNewGame}
          disabled={isGameOver}
        />
      </footer>

      {/* ── SETTINGS MODAL (all screen sizes) ───────────────────── */}
      <AnimatePresence>
        {tweaksOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setTweaksOpen(false)} />
            <motion.div
              className="relative bg-[#0d1829] w-full lg:max-w-sm lg:rounded-2xl rounded-t-2xl border border-slate-700/50 overflow-y-auto max-h-[90vh]"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            >
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-800/50">
                <h2 className="font-black text-sm tracking-widest text-white uppercase">Settings</h2>
                <button onClick={() => setTweaksOpen(false)} className="text-slate-500 hover:text-slate-300 text-lg leading-none">✕</button>
              </div>

              <div className="p-5 space-y-5">

                {/* Design (mobile only — on desktop it's always visible) */}
                <div className="lg:hidden space-y-3">
                  <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Design</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([
                      { id: 'neon', dot: '#06b6d4', label: 'Neon' },
                      { id: 'void', dot: '#8b5cf6', label: 'Void' },
                      { id: 'ember', dot: '#f97316', label: 'Ember' },
                      { id: 'arctic', dot: '#94e2d5', label: 'Arctic' },
                    ] as const).map(t => (
                      <button key={t.id} onClick={() => setTheme(t.id)}
                        className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-[10px] font-bold transition-all
                          ${theme === t.id ? 'border-slate-500 bg-slate-700 text-white' : 'border-slate-800 text-slate-500 hover:border-slate-600'}`}>
                        <span className="w-3.5 h-3.5 rounded-full" style={{ background: t.dot }} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {[
                    { label: '3D Board', value: view3D, set: setView3D },
                    { label: 'Coordinates', value: coords, set: setCoords },
                  ].map(({ label, value, set }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">{label}</span>
                      <button role="switch" aria-checked={value} onClick={() => set((v: boolean) => !v)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                        <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Game settings */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Time Control
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { id: 'blitz_3', label: '3M', sub: 'Blitz' },
                      { id: 'blitz_5', label: '5M', sub: 'Blitz' },
                      { id: 'rapid_10', label: '10M', sub: 'Rapid' },
                      { id: 'classic_15', label: '15M', sub: 'Classic' },
                    ] as const).map(t => (
                      <button key={t.id} onClick={() => {
                        setTimeControl(t.id)
                        resetTimer(TIME_CONTROL_MS[t.id], TIME_CONTROL_MS[t.id])
                      }}
                        className={`py-2 rounded-xl text-xs font-bold transition-all
                          ${timeControl === t.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60' : 'bg-slate-800/50 text-slate-400 border border-slate-800 hover:border-slate-600'}`}>
                        {t.label}
                        <span className="block text-[9px] font-normal mt-0.5 opacity-60">{t.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase flex items-center gap-1.5">
                    <Bot className="w-3 h-3" /> AI Opponent
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 text-sm">Play vs AI</span>
                    <button role="switch" aria-checked={aiEnabled} onClick={() => setAiEnabled(v => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${aiEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${aiEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  {aiEnabled && (
                    <div className="flex gap-1.5">
                      {(['easy', 'intermediate', 'hard'] as const).map(l => (
                        <button key={l} onClick={() => setAiLevel(l)}
                          className={`flex-1 py-1.5 rounded-xl text-[10px] font-bold capitalize transition-all
                            ${aiLevel === l ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/60' : 'bg-slate-800/50 text-slate-500 border border-slate-800 hover:border-slate-600'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Account */}
                <div className="space-y-2 border-t border-slate-800/50 pt-4">
                  <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Account</p>
                  <Link href="/dashboard" onClick={() => setTweaksOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white transition-all text-sm font-medium">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                  <form action={signOut}>
                    <button type="submit"
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-red-900/20 border border-red-900/40 text-red-400 hover:border-red-700/60 hover:bg-red-900/30 transition-all text-sm font-medium">
                      <LogOut className="w-4 h-4" />
                      Log Out
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promotion dialog */}
      <PromotionDialog
        open={promoDialog}
        color={playerColor}
        onSelect={handlePromoSelect}
      />

      {/* Game result modal */}
      <GameResultModal
        open={isGameOver && !promoDialog}
        result={resigned ? (playerColor === 'w' ? 'black' : 'white') as 'black' | 'white' : state.winner === 'w' ? 'white' : state.winner === 'b' ? 'black' : state.winner ?? null}
        myColor={playerColor}
        reason={resigned ? 'resign' : state.winner === 'draw' ? 'draw' : 'checkmate'}
        myUsername={me.username}
        oppUsername={opponent.username}
        myElo={me.elo}
        userId={me.id ?? ''}
        onNewGame={handleNewGame}
        onDashboard={handleNewGame}
        onRematch={handleNewGame}
      />
    </div>
  )
}
