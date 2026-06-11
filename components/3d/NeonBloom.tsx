'use client'

import { EffectComposer, Bloom } from '@react-three/postprocessing'

/** Bloom only on the bright cyan board frame — pieces stay sharp */
export function NeonBloom() {
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      <Bloom
        luminanceThreshold={0.82}
        luminanceSmoothing={0.28}
        intensity={0.72}
        mipmapBlur={false}
        radius={0.45}
      />
    </EffectComposer>
  )
}
