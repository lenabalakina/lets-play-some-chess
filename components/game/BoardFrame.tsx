'use client'

import type { BoardTheme } from '@/features/chess/types/chess.types'

const THEME_GLOW: Record<BoardTheme, string> = {
  neon:   'rgba(6,182,212,0.35)',
  void:   'rgba(139,92,246,0.35)',
  ember:  'rgba(249,115,22,0.35)',
  arctic: 'rgba(148,226,213,0.3)',
}

interface Props {
  theme:    BoardTheme
  children: React.ReactNode
  className?: string
}

export function BoardFrame({ theme, children, className = '' }: Props) {
  const glow = THEME_GLOW[theme]

  return (
    <div className={`board-frame w-full h-full ${className}`}>
      <div
        className="board-frame-glow"
        style={{ boxShadow: `0 0 48px ${glow}, 0 0 96px ${glow.replace('0.35', '0.12').replace('0.3', '0.1')}` }}
        aria-hidden
      />
      {/* Corner accents */}
      {(['tl', 'tr', 'bl', 'br'] as const).map(corner => (
        <span
          key={corner}
          aria-hidden
          className="absolute w-3 h-3 z-[6] pointer-events-none opacity-40"
          style={{
            top:    corner.startsWith('t') ? 6 : 'auto',
            bottom: corner.startsWith('b') ? 6 : 'auto',
            left:   corner.endsWith('l') ? 6 : 'auto',
            right:  corner.endsWith('r') ? 6 : 'auto',
            borderTop:    corner.startsWith('t') ? `1px solid ${glow}` : undefined,
            borderBottom: corner.startsWith('b') ? `1px solid ${glow}` : undefined,
            borderLeft:   corner.endsWith('l') ? `1px solid ${glow}` : undefined,
            borderRight:  corner.endsWith('r') ? `1px solid ${glow}` : undefined,
          }}
        />
      ))}
      <div className="board-frame-inner w-full h-full">{children}</div>
    </div>
  )
}
