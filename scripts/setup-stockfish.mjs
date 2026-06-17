/**
 * Copy Stockfish worker + WASM into public/ for browser AI games.
 */
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BIN  = join(ROOT, 'node_modules/stockfish/bin')
const OUT  = join(ROOT, 'public')

const ASSETS = [
  ['stockfish-18-lite-single.js', 'stockfish.js'],
  ['stockfish-18-lite-single.wasm', 'stockfish.wasm'],
]

for (const [sourceName, publicName] of ASSETS) {
  const src = join(BIN, sourceName)
  const dst = join(OUT, publicName)
  if (!existsSync(src)) {
    console.error(`Missing ${src} — run npm install`)
    process.exit(1)
  }
  copyFileSync(src, dst)
}

console.log('✓ Stockfish assets copied to public/')
