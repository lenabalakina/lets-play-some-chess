/**
 * Sync puzzles with Lichess API (FEN, solution, lastMove) when valid.
 * Usage: node scripts/enrich-puzzle-lastmove.mjs
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Chess } from 'chess.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATA = join(ROOT, 'data', 'puzzles.json')
const TEMP_DATA = `${DATA}.tmp`
const DELAY_MS = 35

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

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

const payload = JSON.parse(readFileSync(DATA, 'utf8'))
let updated = 0
let failed = 0

console.log(`Syncing ${payload.puzzles.length} puzzles from Lichess API…`)

for (let i = 0; i < payload.puzzles.length; i++) {
  const p = payload.puzzles[i]
  try {
    const res = await fetch(`https://lichess.org/api/puzzle/${p.id}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) { failed++; await sleep(DELAY_MS); continue }

    const data = await res.json()
    const api = data.puzzle
    if (!api?.fen || !api?.solution?.length) { failed++; await sleep(DELAY_MS); continue }

    if (!validateLine(api.fen, api.solution)) { failed++; await sleep(DELAY_MS); continue }

    p.fen = api.fen
    p.solution = api.solution
    p.lastMove = api.lastMove ?? ''
    p.rating = api.rating ?? p.rating
    p.plays = api.plays ?? p.plays
    p.themes = api.themes ?? p.themes
    updated++
  } catch {
    failed++
  }

  if ((i + 1) % 50 === 0) {
    process.stdout.write(`\r  ${i + 1}/${payload.puzzles.length} (${updated} synced, ${failed} skipped)`)
  }
  await sleep(DELAY_MS)
}

process.stdout.write('\n')
writeFileSync(TEMP_DATA, JSON.stringify(payload))
renameSync(TEMP_DATA, DATA)
console.log(`✓ Done — ${updated} puzzles synced with lastMove, ${failed} kept from CSV`)
