'use client'

import { Chess } from 'chess.js'
import { motion, AnimatePresence } from 'framer-motion'
import type { BoardTheme, Color, PieceType, Square } from '@/features/chess/types/chess.types'
import { THEME_COLORS, BOARD_NEON_GLOW } from '@/features/chess/types/chess.types'
import { ChessPieceSVG } from './ChessPieceSVG'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS  = ['8', '7', '6', '5', '4', '3', '2', '1']

interface Props {
  fen:            string
  selectedSquare: Square | null
  legalMoves:     string[]
  lastMove:       { from: Square; to: Square } | null
  theme:          BoardTheme
  showCoords:     boolean
  playerColor:    Color
  isMyTurn:       boolean
  isGameOver:     boolean
  onSquareClick:  (sq: Square) => void
  hintSquare?:    string | null
}

function getInCheckSquare(fen: string): Square | null {
  try {
    const chess = new Chess(fen)
    if (!chess.inCheck()) return null
    const turn = chess.turn()
    const board = chess.board()
    for (const row of board) {
      for (const cell of row) {
        if (cell && cell.type === 'k' && cell.color === turn) {
          return cell.square as Square
        }
      }
    }
  } catch {}
  return null
}

export function ChessBoard2D({
  fen, selectedSquare, legalMoves, lastMove,
  theme, showCoords, playerColor, isMyTurn, isGameOver, onSquareClick,
  hintSquare,
}: Props) {
  const chess = new Chess(fen)
  const board = chess.board()
  const colors = THEME_COLORS[theme]
  const checkSquare = getInCheckSquare(fen)

  const ranks = playerColor === 'b' ? [...RANKS].reverse() : RANKS
  const files = playerColor === 'b' ? [...FILES].reverse() : FILES

  function getSquareStyle(file: string, rank: string): React.CSSProperties {
    const sq = `${file}${rank}` as Square
    const isLight    = (FILES.indexOf(file) + parseInt(rank)) % 2 === 1
    const isSelected = sq === selectedSquare
    const isLastFrom = lastMove?.from === sq
    const isLastTo   = lastMove?.to   === sq
    const isCheck    = sq === checkSquare

    let bg = isLight ? colors.light : colors.dark
    if (isCheck)                    bg = colors.check
    else if (isSelected)            bg = colors.selected
    else if (isLastFrom || isLastTo) bg = colors.highlight

    return { background: bg }
  }

  function getCellFromCoords(fileIdx: number, rankIdx: number) {
    const file = files[fileIdx]
    const rank = ranks[rankIdx]
    const sq   = `${file}${rank}` as Square
    const actualRankIdx = RANKS.indexOf(rank)
    const actualFileIdx = FILES.indexOf(file)
    const cell = board[actualRankIdx]?.[actualFileIdx]
    return { sq, cell, file, rank }
  }

  const boardGlow = BOARD_NEON_GLOW[theme]

  return (
    <div
      className="relative select-none w-full h-full rounded-[2px] chess-board-neon"
      style={{
        boxShadow: [
          '0 0 0 1px rgba(6,182,212,0.22)',
          `0 0 40px ${boardGlow}`,
          `0 0 80px ${boardGlow.replace(/[\d.]+\)$/, '0.14)')}`,
          '0 16px 48px rgba(0,0,0,0.55)',
        ].join(', '),
      }}
    >
      <div
        className="relative w-full h-full grid"
        style={{ gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)' }}
      >
        {ranks.map((rank, rankIdx) =>
          files.map((file, fileIdx) => {
            const { sq, cell } = getCellFromCoords(fileIdx, rankIdx)
            const isLegal    = legalMoves.includes(sq)
            const isSelected = sq === selectedSquare
            const isHint     = hintSquare === sq
            const isWhitePiece = cell?.color === 'w'

            return (
              <div
                key={sq}
                data-square={sq}
                data-legal={isLegal ? 'true' : 'false'}
                data-piece={cell ? (cell.color === 'w' ? cell.type.toUpperCase() : cell.type) : undefined}
                onClick={() => !isGameOver && onSquareClick(sq)}
                className="relative"
                style={{
                  ...getSquareStyle(file, rank),
                  cursor: isGameOver ? 'default' : (isMyTurn ? 'pointer' : 'default'),
                  transition: 'background 0.15s',
                }}
              >
                {/* Coordinate labels */}
                {showCoords && fileIdx === 0 && (
                  <span className="absolute top-0.5 left-0.5 text-[9px] font-medium opacity-50 text-white leading-none z-20 pointer-events-none select-none">
                    {rank}
                  </span>
                )}
                {showCoords && rankIdx === 7 && (
                  <span className="absolute bottom-0.5 right-0.5 text-[9px] font-medium opacity-50 text-white leading-none z-20 pointer-events-none select-none">
                    {file}
                  </span>
                )}

                {/* Hint pulse */}
                {isHint && (
                  <div
                    className="absolute inset-0 rounded-sm pointer-events-none z-10 animate-pulse"
                    style={{ background: 'rgba(250,204,21,0.35)', boxShadow: 'inset 0 0 12px rgba(250,204,21,0.6)' }}
                  />
                )}

                {/* Legal move dot */}
                {isLegal && !cell && (
                  <div
                    className="legal-move-dot absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[26%] h-[26%] rounded-full pointer-events-none z-10"
                    style={{ background: THEME_COLORS[theme].move, boxShadow: `0 0 10px ${THEME_COLORS[theme].highlight}` }}
                  />
                )}
                {/* Legal move ring (capture) */}
                {isLegal && cell && (
                  <div
                    className="absolute inset-0 rounded-sm pointer-events-none z-10"
                    style={{
                      border: `3px solid ${THEME_COLORS[theme].highlight}`,
                      boxShadow: `inset 0 0 8px ${THEME_COLORS[theme].highlight}`,
                    }}
                  />
                )}

                {/* Piece */}
                {cell && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${sq}-${cell.color}${cell.type}`}
                      initial={{ scale: 0.75, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.75, opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10 ${isSelected ? 'piece-selected' : ''}`}
                    >
                      <div className="w-[84%] h-[84%]">
                        <ChessPieceSVG
                          type={cell.type as PieceType}
                          isWhite={isWhitePiece}
                          isSelected={isSelected}
                          size="100%"
                        />
                      </div>
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Game over overlay */}
      {isGameOver && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-20">
          <div className="glass-panel-v2 rounded-xl px-8 py-4 text-center">
            <p className="text-white font-black text-lg tracking-wide">Game Over</p>
          </div>
        </div>
      )}
    </div>
  )
}
