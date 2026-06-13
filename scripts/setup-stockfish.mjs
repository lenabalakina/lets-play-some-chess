/**
 * Copy Stockfish worker + WASM into public/ for browser AI games.
 */
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BIN  = join(ROOT, 'node_modules/stockfish/bin')
const OUT  = join(ROOT, 'public')

const FILES = ['stockfish.js', 'stockfish.wasm']

for (const name of FILES) {
  const src = join(BIN, name)
  const dst = join(OUT, name)
  if (!existsSync(src)) {
    console.error(`Missing ${src} — run npm install`)
    process.exit(1)
  }
  copyFileSync(src, dst)
}

console.log('✓ Stockfish assets copied to public/')
