/**
 * Copy Stockfish worker + WASM into public/ for browser AI games.
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const FILES = [
  { source: 'stockfish-18-lite-single.js', target: 'stockfish.js' },
  { source: 'stockfish-18-lite-single.wasm', target: 'stockfish.wasm' },
]

export function setupStockfishAssets(root = ROOT) {
  const bin = join(root, 'node_modules/stockfish/bin')
  const out = join(root, 'public')

  mkdirSync(out, { recursive: true })

  for (const { source, target } of FILES) {
    const src = join(bin, source)
    const dst = join(out, target)
    if (!existsSync(src)) {
      throw new Error(`Missing ${src} — run npm install`)
    }
    copyFileSync(src, dst)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    setupStockfishAssets()
    console.log('✓ Stockfish lite-single assets copied to public/')
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  }
}
