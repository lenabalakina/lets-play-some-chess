import { Chess } from 'chess.js'
import type { Color, Square } from './types/chess.types'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const

/** Which side of the board the local player sits on (white = +Z, black = -Z). */
export function getPlayerPerspective(playerColor: Color): Color {
  return playerColor
}

/**
 * Display order for ranks/files (matches ChessBoard2D).
 * Used when rendering a 2D-style grid; 3D uses world coords instead.
 */
export function getDisplayFiles(playerColor: Color): readonly string[] {
  return playerColor === 'b' ? [...FILES].reverse() : FILES
}

export function getDisplayRanks(playerColor: Color): readonly string[] {
  return playerColor === 'b' ? [...RANKS].reverse() : RANKS
}

/**
 * Map a chess square to 3D world coordinates for the given player perspective.
 * Chess logic always uses standard squares; only rendering position changes.
 */
export function chessSquareToWorld3D(sq: Square, perspective: Color): [number, number, number] {
  const file = sq.charCodeAt(0) - 97
  const rank = parseInt(sq[1], 10) - 1
  const x = perspective === 'b' ? 3.5 - file : file - 3.5
  return [x, 0, 3.5 - rank]
}

/** Alias for clarity at click-handling boundaries (identity — meshes carry chess square ids). */
export function visualSquareToChessSquare(sq: Square): Square {
  return sq
}

export function chessSquareToVisualSquare(sq: Square): Square {
  return sq
}

/** Whether the player may select a piece on this square (turn + ownership + has moves). */
export function canPlayerSelectPiece(
  fen: string,
  square: Square,
  playerColor: Color,
  isMyTurn: boolean,
): boolean {
  if (!isMyTurn) return false
  try {
    const chess = new Chess(fen)
    const piece = chess.get(square as Parameters<typeof chess.get>[0])
    if (!piece || piece.color !== playerColor) return false
    const moves = chess.moves({
      square: square as Parameters<typeof chess.moves>[0]['square'],
      verbose: true,
    })
    return moves.length > 0
  } catch {
    return false
  }
}

/** Legal move targets for a square, filtered to the player's color only. */
export function getLegalTargetsForPlayer(
  fen: string,
  square: Square,
  playerColor: Color,
): string[] {
  try {
    const chess = new Chess(fen)
    const piece = chess.get(square as Parameters<typeof chess.get>[0])
    if (!piece || piece.color !== playerColor) return []
    const moves = chess.moves({
      square: square as Parameters<typeof chess.moves>[0]['square'],
      verbose: true,
    })
    return moves.map(m => m.to)
  } catch {
    return []
  }
}
