/**
 * Import validated puzzles from the Lichess open puzzle database.
 * Usage: node scripts/import-puzzles.mjs [count]
 * Default count: 777
 */
import { spawn } from 'node:child_process'
import { createWriteStream, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'

const TARGET = Number(process.argv[2] ?? 777)
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'data', 'puzzles.json')
const URL = 'https://database.lichess.org/lichess_db_puzzle.csv.zst'

function validateLine(fen, moves) {
  try {
    const chess = new Chess(fen)
    const startTurn = chess.turn()
    for (let i = 0; i < moves.length; i++) {
      const uci = moves[i]
      const expectedTurn = i % 2 === 0 ? startTurn : (startTurn === 'w' ? 'b' : 'w')
      if (chess.turn() !== expectedTurn) return false
      const result = chess.move({
        from:      uci.slice(0, 2),
        to:        uci.slice(2, 4),
        promotion: uci.length === 5 ? uci[4] : undefined,
      })
      if (!result) return false
    }
    return true
  } catch {
    return false
  }
}

function parseCsvLine(line) {
  // Simple CSV parse — Lichess puzzle fields don't contain commas in values
  const parts = line.split(',')
  if (parts.length < 8) return null
  const [id, fen, movesRaw, rating, , , plays, themesRaw] = parts
  if (!id || !fen || !movesRaw) return null
  const solution = movesRaw.trim().split(/\s+/).filter(Boolean)
  if (solution.length === 0) return null
  return {
    id,
    fen,
    lastMove: '',
    solution,
    themes: themesRaw ? themesRaw.split(/\s+/).filter(Boolean) : [],
    rating: Number(rating) || 1200,
    plays:  Number(plays) || 0,
  }
}

async function streamPuzzles() {
  const puzzles = []
  let skipped = 0

  const curl = spawn('curl', ['-s', URL], { stdio: ['ignore', 'pipe', 'inherit'] })
  const zstd = spawn('zstd', ['-d', '-c'], { stdio: ['pipe', 'pipe', 'inherit'] })

  curl.stdout.pipe(zstd.stdin)
  zstd.stdin.on('error', () => {}) // EPIPE when we kill early

  let buffer = ''
  let headerDone = false
  let finished = false

  await new Promise((resolve, reject) => {
    const finish = () => {
      if (finished) return
      finished = true
      curl.stdout.unpipe(zstd.stdin)
      curl.kill('SIGTERM')
      zstd.kill('SIGTERM')
      resolve()
    }

    zstd.stdout.on('data', (chunk) => {
      if (puzzles.length >= TARGET) {
        finish()
        return
      }

      buffer += chunk.toString('utf8')
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (puzzles.length >= TARGET) break
        if (!headerDone) {
          headerDone = true
          continue
        }

        const row = parseCsvLine(line.trim())
        if (!row) continue
        if (!validateLine(row.fen, row.solution)) {
          skipped++
          continue
        }
        puzzles.push(row)
        if (puzzles.length % 100 === 0) {
          process.stdout.write(`\r  ${puzzles.length}/${TARGET} validated (${skipped} skipped)`)
        }
      }
    })

    zstd.stdout.on('end', () => { if (!finished) resolve() })
    curl.on('error', reject)
    zstd.on('error', reject)
    curl.on('close', () => { if (!finished) resolve() })
    zstd.on('close', () => { if (!finished) resolve() })
  })

  process.stdout.write('\n')
  return { puzzles, skipped }
}

mkdirSync(dirname(OUT), { recursive: true })

console.log(`Importing ${TARGET} puzzles from Lichess database…`)
const { puzzles, skipped } = await streamPuzzles()

if (puzzles.length < TARGET) {
  console.error(`Only collected ${puzzles.length} valid puzzles (wanted ${TARGET})`)
  process.exit(1)
}

const payload = {
  version: 1,
  count:   puzzles.length,
  source:  'lichess.org/database',
  puzzles,
}

await new Promise((resolve, reject) => {
  const ws = createWriteStream(OUT)
  ws.write(JSON.stringify(payload))
  ws.end()
  ws.on('finish', resolve)
  ws.on('error', reject)
})

console.log(`✓ Wrote ${puzzles.length} puzzles to ${OUT} (${skipped} invalid rows skipped)`)
