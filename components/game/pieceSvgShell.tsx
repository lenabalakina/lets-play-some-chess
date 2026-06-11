import type { ReactNode } from 'react'

export interface PieceProps {
  fill:       string
  stroke:     string
  size?:      number | string
  glowColor:  string
  glowId:     string
  glowStrong?: boolean
}

export function PieceSvgShell({
  children, size = 45, glowColor, glowId, glowStrong = false,
}: {
  children:    ReactNode
  size?:       number | string
  glowColor:   string
  glowId:      string
  glowStrong?: boolean
}) {
  const blur = glowStrong ? 1.4 : 1.0
  const opacity = glowStrong ? 0.62 : 0.48

  return (
    <svg
      viewBox="0 0 45 45"
      width={size}
      height={size}
      style={{ overflow: 'visible' }}
      shapeRendering="geometricPrecision"
      aria-hidden
    >
      <defs>
        <filter
          id={glowId}
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="0" stdDeviation={blur} floodColor={glowColor} floodOpacity={opacity} />
        </filter>
      </defs>
      <g filter={`url(#${glowId})`}>{children}</g>
    </svg>
  )
}
