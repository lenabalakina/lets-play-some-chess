interface Props {
  size?: number
  glow?: boolean
  className?: string
}

export function PawnIcon({ size = 22, glow = false, className }: Props) {
  return (
    <span
      className={`text-cyan-400 inline-block leading-none ${className ?? ''}`}
      style={{
        verticalAlign: 'middle',
        flexShrink: 0,
        filter: glow
          ? 'drop-shadow(0 0 24px rgba(6,182,212,1)) drop-shadow(0 0 60px rgba(6,182,212,0.5))'
          : 'drop-shadow(0 0 6px rgba(6,182,212,0.5))',
      }}
    >
      {/* Solid-fill pawn — inherits CSS color, same look as ♟ emoji on desktop */}
      <svg viewBox="0 0 45 45" width={size} height={size} fill="currentColor">
        <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.6 16 21c0 2.03.94 3.84 2.41 5.03L16.5 30h12l-1.91-3.97A6.02 6.02 0 0 0 29 21c0-2.4-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/>
        <path d="M14.5 30c0-3.87 3.13-7 8-7s8 3.13 8 7"/>
        <path d="M11.5 37c5.56 3.25 15.44 3.25 21 0v-7H11.5v7z"/>
      </svg>
    </span>
  )
}
