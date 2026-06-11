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
  const s1 = glowStrong ? 2.2 : 1.6
  const s2 = glowStrong ? 5   : 3.5
  const s3 = glowStrong ? 9   : 6
  const o1 = glowStrong ? 1   : 0.9
  const o2 = glowStrong ? 0.85 : 0.7
  const o3 = glowStrong ? 0.55 : 0.4

  return (
    <svg
      viewBox="0 0 45 45"
      width={size}
      height={size}
      style={{ overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <filter
          id={glowId}
          x="-120%"
          y="-120%"
          width="340%"
          height="340%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow dx="0" dy="0" stdDeviation={s1} floodColor={glowColor} floodOpacity={o1} />
          <feDropShadow dx="0" dy="0" stdDeviation={s2} floodColor={glowColor} floodOpacity={o2} />
          <feDropShadow dx="0" dy="0" stdDeviation={s3} floodColor={glowColor} floodOpacity={o3} />
        </filter>
      </defs>
      <g filter={`url(#${glowId})`}>{children}</g>
    </svg>
  )
}
