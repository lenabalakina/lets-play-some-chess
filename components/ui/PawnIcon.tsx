interface Props {
  size?: number
  glow?: boolean
  className?: string
}

export function PawnIcon({ size = 22, glow = false, className }: Props) {
  return (
    <span
      className={`text-cyan-400 select-none inline-block leading-none ${className ?? ''}`}
      style={{
        fontSize: size,
        verticalAlign: 'middle',
        flexShrink: 0,
        // Force text-glyph rendering so iOS doesn't override with black Apple emoji
        fontVariantEmoji: 'text',
        textShadow: glow
          ? '0 0 30px rgba(6,182,212,0.9), 0 0 80px rgba(6,182,212,0.5)'
          : undefined,
      }}
    >
      ♟︎
    </span>
  )
}
