'use client'

import { Chess } from 'chess.js'
import { motion, AnimatePresence } from 'framer-motion'
import type { BoardTheme, Color, PieceType, Square } from '@/features/chess/types/chess.types'
import { THEME_COLORS } from '@/features/chess/types/chess.types'
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
  inCheckSquare?: Square | null   // king square that is in check
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
}: Props) {
  const chess = new Chess(fen)
  const board = chess.board()
  const colors = THEME_COLORS[theme]
  const checkSquare = getInCheckSquare(fen)

  // Flip board if playing as black
  const ranks = playerColor === 'b' ? [...RANKS].reverse() : RANKS
  const files = playerColor === 'b' ? [...FILES].reverse() : FILES

  function getSquareStyle(file: string, rank: string): React.CSSProperties {
    const sq = `${file}${rank}` as Square
    const isLight = (FILES.indexOf(file) + parseInt(rank)) % 2 === 1
    const isSelected = sq === selectedSquare
    const isLegal    = legalMoves.includes(sq)
    const isLastFrom  = lastMove?.from === sq
    const isLastTo    = lastMove?.to === sq
    const isCheck     = sq === checkSquare

    let bg = isLight ? colors.light : colors.dark

    if (isCheck)    bg = colors.check
    else if (isSelected) bg = colors.selected
    else if (isLastFrom || isLastTo) bg = colors.highlight

    return { background: bg }
  }

  function getCellFromCoords(fileIdx: number, rankIdx: number) {
    const file = files[fileIdx]
    const rank = ranks[rankIdx]
    const sq   = `${file}${rank}` as Square

    // Map to board array (board[0] = rank 8 for white, rank 1 for black)
    const boardRankIdx = playerColor === 'b' ? rankIdx : rankIdx
    const boardFileIdx = playerColor === 'b' ? 7 - fileIdx : fileIdx
    const actualRankIdx = RANKS.indexOf(rank)
    const actualFileIdx = FILES.indexOf(file)
    const cell = board[actualRankIdx]?.[actualFileIdx]
    return { sq, cell, file, rank }
  }

  return (
    <div className="relative select-none">
      {/* Board border glow */}
      <div
        className="absolute inset-0 rounded-sm pointer-events-none"
        style={{ boxShadow: `0 0 40px rgba(6,182,212,0.15), inset 0 0 20px rgba(0,0,0,0.5)` }}
      />

      {/* Board grid */}
      <div
        className="relative grid"
        style={{ gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(8, 1fr)' }}
      >
        {ranks.map((rank, rankIdx) =>
          files.map((file, fileIdx) => {
            const { sq, cell } = getCellFromCoords(fileIdx, rankIdx)
            const isLight    = (FILES.indexOf(file) + parseInt(rank)) % 2 === 1
            const isLegal    = legalMoves.includes(sq)
            const isSelected = sq === selectedSquare
            const isWhitePiece = cell?.color === 'w'

            return (
              <div
                key={sq}
                onClick={() => !isGameOver && onSquareClick(sq)}
                className="relative flex items-center justify-center"
                style={{
                  width: 'clamp(48px, 8vw, 80px)',
                  height: 'clamp(48px, 8vw, 80px)',
                  ...getSquareStyle(file, rank),
                  cursor: isGameOver ? 'default' : (isMyTurn ? 'pointer' : 'default'),
                  transition: 'background 0.15s',
                }}
              >
                {/* Coordinate labels */}
                {showCoords && fileIdx === 0 && (
                  <span className="absolute top-0.5 left-1 text-[9px] font-medium opacity-50 text-white leading-none">
                    {rank}
                  </span>
                )}
                {showCoords && rankIdx === 7 && (
                  <span className="absolute bottom-0.5 right-1 text-[9px] font-medium opacity-50 text-white leading-none">
                    {file}
                  </span>
                )}

                {/* Legal move dot or ring */}
                {isLegal && !cell && (
                  <div
                    className="w-[28%] h-[28%] rounded-full pointer-events-none"
                    style={{ background: THEME_COLORS[theme].move, boxShadow: `0 0 8px ${THEME_COLORS[theme].highlight}` }}
                  />
                )}
                {isLegal && cell && (
                  <div
                    className="absolute inset-0 rounded-sm pointer-events-none"
                    style={{
                      border: `3px solid ${THEME_COLORS[theme].highlight}`,
                      boxShadow: `inset 0 0 8px ${THEME_COLORS[theme].highlight}`,
                    }}
                  />
                )}

                {/* Piece — sharp SVG */}
                {cell && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${sq}-${cell.color}${cell.type}`}
                      initial={{ scale: 0.75, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.75, opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="relative z-10 pointer-events-none select-none"
                    >
                      <ChessPieceSVG
                        type={cell.type as PieceType}
                        isWhite={isWhitePiece}
                        isSelected={isSelected}
                        size={56}
                      />
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
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-sm">
          <div className="glass-panel rounded-xl px-8 py-4 text-center">
            <p className="text-white font-bold text-lg">Game Over</p>
          </div>
        </div>
      )}
    </div>
  )
}
