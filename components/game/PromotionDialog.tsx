'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { Color } from '@/features/chess/types/chess.types'

type PromoPiece = 'q' | 'r' | 'b' | 'n'

const PROMO_PIECES: { type: PromoPiece; label: string; unicode: string; desc: string }[] = [
  { type: 'q', label: 'Queen',  unicode: '♛', desc: 'Most powerful' },
  { type: 'r', label: 'Rook',   unicode: '♜', desc: 'Ranks & files' },
  { type: 'b', label: 'Bishop', unicode: '♝', desc: 'Diagonals' },
  { type: 'n', label: 'Knight', unicode: '♞', desc: 'Leaps over' },
]

interface Props {
  open:       boolean
  color:      Color
  onSelect:   (piece: PromoPiece) => void
}

export function PromotionDialog({ open, color, onSelect }: Props) {
  const isWhite = color === 'w'
  const glowColor = isWhite ? 'rgba(6,182,212,0.4)' : 'rgba(168,85,247,0.4)'
  const textColor = isWhite ? 'text-cyan-300'  : 'text-purple-300'
  const borderColor = isWhite ? 'border-cyan-500/50' : 'border-purple-500/50'

  const unicodeWhite: Record<PromoPiece, string> = { q: '♕', r: '♖', b: '♗', n: '♘' }
  const unicodeBlack: Record<PromoPiece, string> = { q: '♛', r: '♜', b: '♝', n: '♞' }
  const icons = isWhite ? unicodeWhite : unicodeBlack

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              className={`glass-panel rounded-2xl p-6 w-full max-w-sm border ${borderColor}`}
              style={{ boxShadow: `0 0 60px ${glowColor}` }}
            >
              <h2 className={`text-center text-sm font-bold tracking-widest uppercase mb-5 ${textColor}`}>
                Promote Pawn
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {PROMO_PIECES.map(p => (
                  <motion.button
                    key={p.type}
                    onClick={() => onSelect(p.type)}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.96 }}
                    className={`
                      flex flex-col items-center gap-2 p-4 rounded-xl
                      bg-slate-900/60 border ${borderColor}
                      hover:bg-slate-800/80 transition-colors
                    `}
                  >
                    <span
                      className="text-4xl leading-none"
                      style={{
                        color: isWhite ? '#e0f8ff' : '#d8b4fe',
                        textShadow: isWhite
                          ? '0 0 12px rgba(6,182,212,0.9)'
                          : '0 0 12px rgba(168,85,247,0.9)',
                      }}
                    >
                      {icons[p.type]}
                    </span>
                    <div className="text-center">
                      <p className={`text-xs font-bold ${textColor}`}>{p.label}</p>
                      <p className="text-slate-600 text-[10px]">{p.desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export type { PromoPiece }
