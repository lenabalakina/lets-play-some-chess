'use client'

import { EffectComposer, Bloom } from '@react-three/postprocessing'

/** Subtle bloom — board frame only, keeps pieces sharp */
export function NeonBloom() {
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <Bloom
        luminanceThreshold={0.72}
        luminanceSmoothing={0.35}
        intensity={0.42}
        mipmapBlur={false}
        radius={0.35}
      />
    </EffectComposer>
  )
}
