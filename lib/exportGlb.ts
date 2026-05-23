import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

// Mirrors the primitive helpers in PieceShapes.tsx — pure Three.js, no React.
function disc(r: number, h: number, y: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.1, h, 20))
  m.position.y = y
  return m
}
function cyl(rt: number, rb: number, h: number, y: number, seg = 16): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg))
  m.position.y = y
  return m
}
function sph(r: number, y: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16))
  m.position.y = y
  return m
}
function cone(r: number, h: number, y: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 16))
  m.position.y = y
  return m
}
function box(w: number, h: number, d: number, x = 0, y: number, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d))
  m.position.set(x, y, z)
  return m
}

function buildPawn(): THREE.Group {
  const g = new THREE.Group(); g.name = 'Pawn'
  g.add(disc(0.30, 0.07, 0.035), cyl(0.14, 0.18, 0.18, 0.16), sph(0.20, 0.40))
  return g
}
function buildRook(): THREE.Group {
  const g = new THREE.Group(); g.name = 'Rook'
  g.add(
    disc(0.34, 0.07, 0.035),
    cyl(0.18, 0.22, 0.28, 0.21),
    cyl(0.26, 0.24, 0.12, 0.41, 4),
    box(0.10, 0.10, 0.10, -0.14, 0.52),
    box(0.10, 0.10, 0.10,  0.14, 0.52),
    box(0.10, 0.10, 0.10,  0,    0.52,  0.14),
    box(0.10, 0.10, 0.10,  0,    0.52, -0.14),
  )
  return g
}
function buildKnight(): THREE.Group {
  const g = new THREE.Group(); g.name = 'Knight'
  g.add(disc(0.33, 0.07, 0.035), cyl(0.16, 0.21, 0.20, 0.17))
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.40, 0.16))
  head.position.set(0, 0.46, 0.04); head.rotation.x = 0.35
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.16))
  snout.position.set(0, 0.33, 0.16); snout.rotation.x = 0.6
  g.add(head, snout)
  return g
}
function buildBishop(): THREE.Group {
  const g = new THREE.Group(); g.name = 'Bishop'
  g.add(
    disc(0.33, 0.07, 0.035),
    cyl(0.13, 0.18, 0.30, 0.22),
    cyl(0.16, 0.16, 0.06, 0.40),
    cone(0.15, 0.32, 0.57),
    sph(0.06, 0.74),
  )
  return g
}
function buildQueen(): THREE.Group {
  const g = new THREE.Group(); g.name = 'Queen'
  g.add(disc(0.36, 0.07, 0.035), cyl(0.13, 0.19, 0.36, 0.25), sph(0.24, 0.56))
  for (let i = 0; i < 5; i++) {
    const angle = Math.PI / 2 + (i / 5) * Math.PI * 2
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8))
    m.position.set(Math.cos(angle) * 0.2, 0.75, Math.sin(angle) * 0.2)
    g.add(m)
  }
  return g
}
function buildKing(): THREE.Group {
  const g = new THREE.Group(); g.name = 'King'
  g.add(
    disc(0.36, 0.07, 0.035),
    cyl(0.13, 0.19, 0.36, 0.25),
    cyl(0.20, 0.20, 0.10, 0.47),
    box(0.07, 0.28, 0.07, 0, 0.62),
    box(0.22, 0.07, 0.07, 0, 0.70),
  )
  return g
}

async function downloadGlb(root: THREE.Object3D, filename: string): Promise<void> {
  const exporter = new GLTFExporter()
  const glb = await exporter.parseAsync(root, { binary: true }) as ArrayBuffer
  const blob = new Blob([glb], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportPiecesAsGlb(): Promise<void> {
  const scene = new THREE.Scene()
  const builders = [buildPawn, buildRook, buildKnight, buildBishop, buildQueen, buildKing]
  builders.forEach((build, i) => {
    const piece = build()
    piece.position.x = (i - 2.5) * 1.2
    scene.add(piece)
  })
  await downloadGlb(scene, 'chess-pieces.glb')
}

export async function exportSceneAsGlb(scene: THREE.Scene): Promise<void> {
  await downloadGlb(scene, 'chess-board.glb')
}
