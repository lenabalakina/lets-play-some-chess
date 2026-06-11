// Crisp Staunton-style chess pieces — no blur, sharp vector edges

import type { PieceType } from '@/features/chess/types/chess.types'
import { PIECE_PALETTE } from '@/features/chess/types/chess.types'

interface PieceProps { fill: string; stroke: string; size?: number | string }

export function PawnSVG({ fill, stroke, size = 45 }: PieceProps) {
  return (
    <svg viewBox="0 0 45 45" width={size} height={size}>
      <path
        d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.6 16 21c0 2.03.94 3.84 2.41 5.03L16.5 30h12l-1.91-3.97A6.02 6.02 0 0 0 29 21c0-2.4-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
        fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M11.5 37c5.56 3.25 15.44 3.25 21 0v-7H11.5v7z"
        fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="butt" strokeLinejoin="round"
      />
      <path d="M11.5 30h22" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="butt"/>
      <path
        d="M14.5 30c0-3.87 3.13-7 8-7s8 3.13 8 7"
        fill={fill} stroke={stroke} strokeWidth="1.5"
      />
    </svg>
  )
}

export function RookSVG({ fill, stroke, size = 45 }: PieceProps) {
  return (
    <svg viewBox="0 0 45 45" width={size} height={size}>
      <path
        d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5H12.5zM12 36v-4h21v4H12z"
        fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M14 29.5v-13h17v13H14zM9.5 11.5h4v-4h5v4h8v-4h5v4h4"
        fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M34.5 11.5l-3 3.5H13.5l-3-3.5" fill={fill} stroke={stroke} strokeWidth="1.5"/>
    </svg>
  )
}

export function KnightSVG({ fill, stroke, size = 45 }: PieceProps) {
  return (
    <svg viewBox="0 0 45 45" width={size} height={size}>
      {/* Horse head silhouette — single closed path */}
      <path
        d="M16.5 37 C16 30 18 25 21 22 C18 21 16 18 17 13 C18.5 8 24 6 28 9 C34 11 37 18 35 24 C33 29 30 31 30 35 L30 37 Z"
        fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />

      {/* Base */}
      <path d="M9.5 37 H35.5 V39 H9.5 Z" fill={fill} stroke={stroke} strokeWidth="1.5"/>
      {/* Eye */}
      <circle cx="28" cy="14" r="1.5" fill={stroke}/>
    </svg>
  )
}

export function BishopSVG({ fill, stroke, size = 45 }: PieceProps) {
  return (
    <svg viewBox="0 0 45 45" width={size} height={size}>
      <path
        d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"
        fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path
        d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"
        fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx="22.5" cy="8" r="2.5" fill={fill} stroke={stroke} strokeWidth="1.5"/>
      <path d="M17.5 26h10M15 30h15" stroke={stroke} strokeWidth="1" fill="none" strokeLinejoin="miter"/>
    </svg>
  )
}

export function QueenSVG({ fill, stroke, size = 45 }: PieceProps) {
  return (
    <svg viewBox="0 0 45 45" width={size} height={size}>
      {/* 5 crown balls — symmetric around x=22.5 */}
      <circle cx="6"    cy="12" r="2.75" fill={fill} stroke={stroke} strokeWidth="1.5"/>
      <circle cx="14"   cy="9"  r="2.75" fill={fill} stroke={stroke} strokeWidth="1.5"/>
      <circle cx="22.5" cy="8"  r="2.75" fill={fill} stroke={stroke} strokeWidth="1.5"/>
      <circle cx="31"   cy="9"  r="2.75" fill={fill} stroke={stroke} strokeWidth="1.5"/>
      <circle cx="39"   cy="12" r="2.75" fill={fill} stroke={stroke} strokeWidth="1.5"/>
      {/* Body — explicitly symmetric: cubic mirrors around x=22.5 */}
      <path
        d="M9 26 C10 17 15.5 14 22.5 14 C29.5 14 35 17 36 26 L34 36 H11 L9 26Z"
        fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="butt" strokeLinejoin="round"
      />
      {/* Crown spike connectors — each pair mirrors around x=22.5 */}
      <path
        d="M6 14.5 L9 26 M14 11.5 L12 24 M22.5 10.75 L22.5 14 M31 11.5 L33 24 M39 14.5 L36 26"
        fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"
      />
      {/* Belt lines — symmetric */}
      <path d="M11.5 30 H33.5 M12 33.5 H33" fill="none" stroke={stroke} strokeWidth="1"/>
      {/* Base */}
      <path d="M9.5 36 H35.5 V39 H9.5 Z" fill={fill} stroke={stroke} strokeWidth="1.5"/>
    </svg>
  )
}

export function KingSVG({ fill, stroke, size = 45 }: PieceProps) {
  return (
    <svg viewBox="0 0 45 45" width={size} height={size}>
      <path d="M22.5 11.63V6M20 8h5" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <path
        d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5z"
        fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="butt" strokeLinejoin="round"
      />
      <path
        d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16.5 4v3.5v-3.5c-3-7.5-13-10.5-16-4-3 6 5 10 5 10V37z"
        fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="butt" strokeLinejoin="round"
      />
      <path d="M11.5 30c5.5-3 15.5-3 21 0M11.5 33.5c5.5-3 15.5-3 21 0M11.5 37c5.5-3 15.5-3 21 0"
        fill="none" stroke={stroke} strokeWidth="1"/>
    </svg>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface ChessPieceSVGProps {
  type:        PieceType
  isWhite:     boolean
  isSelected?: boolean
  size?:       number | string
}

export function ChessPieceSVG({ type, isWhite, isSelected, size = 45 }: ChessPieceSVGProps) {
  const { fill, stroke } = isWhite ? PIECE_PALETTE.white : PIECE_PALETTE.black

  const Piece = { p: PawnSVG, r: RookSVG, n: KnightSVG, b: BishopSVG, q: QueenSVG, k: KingSVG }[type]

  return (
    <div style={{
      transform:  isSelected ? 'scale(1.12)' : 'scale(1)',
      transition: 'transform 0.12s ease',
      lineHeight: 0,
      filter: isSelected
        ? (isWhite ? 'brightness(1.4) saturate(1.5)' : 'brightness(1.4) saturate(1.5)')
        : 'none',
    }}>
      <Piece fill={fill} stroke={stroke} size={size} />
    </div>
  )
}
