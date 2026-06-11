export type Color = 'w' | 'b'
export type GameResultColor = 'white' | 'black' | 'draw'
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
export type Square = string  // e.g. 'e4', 'a1'

/** Convert DB game result ('white'/'black'/'draw') to chess Color or 'draw' */
export function resultToWinner(result: GameResultColor): Color | 'draw' {
  if (result === 'white') return 'w'
  if (result === 'black') return 'b'
  return 'draw'
}

/** Convert chess Color or 'draw' to DB game result */
export function winnerToResult(winner: Color | 'draw'): GameResultColor {
  if (winner === 'w') return 'white'
  if (winner === 'b') return 'black'
  return 'draw'
}

export interface Piece {
  type: PieceType
  color: Color
}

export type TimeControl = 'bullet_1' | 'blitz_3' | 'blitz_5' | 'rapid_10' | 'classic_15'

export const TIME_CONTROL_MS: Record<TimeControl, number> = {
  bullet_1:  1  * 60 * 1000,
  blitz_3:   3  * 60 * 1000,
  blitz_5:   5  * 60 * 1000,
  rapid_10:  10 * 60 * 1000,
  classic_15: 15 * 60 * 1000,
}

export const TIME_CONTROL_LABELS: Record<TimeControl, string> = {
  bullet_1:  '1M',
  blitz_3:   '3M',
  blitz_5:   '5M',
  rapid_10:  '10M',
  classic_15: '15M',
}

export interface MoveRecord {
  san:       string
  from:      Square
  to:        Square
  fen:       string
  moveNumber: number
  color:     Color
  timeTakenMs?: number
}

export interface GameState {
  fen:          string
  turn:         Color
  moveHistory:  MoveRecord[]
  isCheck:      boolean
  isCheckmate:  boolean
  isStalemate:  boolean
  isDraw:       boolean
  isGameOver:   boolean
  winner:       Color | 'draw' | null
  legalMoves:   string[]         // target squares for selected piece
  selectedSquare: Square | null
  lastMove:     { from: Square; to: Square } | null
}

export type BoardTheme = 'neon' | 'void' | 'ember' | 'arctic'

export const THEME_COLORS: Record<BoardTheme, {
  light: string; dark: string; highlight: string; move: string; selected: string; check: string
}> = {
  neon: {
    light:     '#1a3d6b',   // brighter blue — more visible on mobile
    dark:      '#071220',   // very dark navy
    highlight: 'rgba(6, 182, 212, 0.60)',
    move:      'rgba(6, 182, 212, 0.35)',
    selected:  'rgba(6, 182, 212, 0.70)',
    check:     'rgba(239, 68, 68, 0.75)',
  },
  void: {
    light:     '#312244',   // medium purple
    dark:      '#150d22',   // very dark purple
    highlight: 'rgba(139, 92, 246, 0.55)',
    move:      'rgba(139, 92, 246, 0.30)',
    selected:  'rgba(139, 92, 246, 0.65)',
    check:     'rgba(239, 68, 68, 0.70)',
  },
  ember: {
    light:     '#4a2510',   // medium burnt orange
    dark:      '#1a0a04',   // very dark brown
    highlight: 'rgba(249, 115, 22, 0.55)',
    move:      'rgba(249, 115, 22, 0.30)',
    selected:  'rgba(249, 115, 22, 0.65)',
    check:     'rgba(239, 68, 68, 0.70)',
  },
  arctic: {
    light:     '#2a4a5f',   // medium teal-blue
    dark:      '#0e1e2a',   // very dark teal
    highlight: 'rgba(148, 226, 213, 0.55)',
    move:      'rgba(148, 226, 213, 0.30)',
    selected:  'rgba(148, 226, 213, 0.6)',
    check:     'rgba(239, 68, 68, 0.6)',
  },
}

/** 2D + 3D piece palette — ice white vs soft pink (reference hero look) */
export const PIECE_PALETTE = {
  white: { fill: '#eef6ff', stroke: '#06b6d4' },
  black: { fill: '#fce7f3', stroke: '#f472b6' },
} as const

/** 3D satin pieces — sharp bodies, subtle rim glow */
export const PIECE_3D = {
  white: {
    color:             '#f0f9ff',
    emissive:          '#67e8f9',
    emissiveIntensity: 0.14,
  },
  black: {
    color:             '#fdf2f8',
    emissive:          '#f9a8d4',
    emissiveIntensity: 0.16,
  },
} as const
