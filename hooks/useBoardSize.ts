'use client'

import { useEffect, useRef, useState } from 'react'

export function useBoardSize(max = 640) {
  const ref  = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(400)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      setSize(Math.min(width, height, max))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [max])

  return { ref, size }
}
