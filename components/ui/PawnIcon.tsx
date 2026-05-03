import { PawnSVG } from '@/components/game/ChessPieceSVG'

interface Props {
  size?: number
  glow?: boolean
  className?: string
}

export function PawnIcon({ size = 22, glow = false, className }: Props) {
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        lineHeight: 0,
        verticalAlign: 'middle',
        flexShrink: 0,
        filter: glow
          ? 'drop-shadow(0 0 18px rgba(6,182,212,0.8)) drop-shadow(0 0 40px rgba(6,182,212,0.4))'
          : 'drop-shadow(0 0 6px rgba(6,182,212,0.5))',
      }}
    >
      <PawnSVG fill="#e8f9ff" stroke="#06b6d4" size={size} />
    </span>
  )
}
