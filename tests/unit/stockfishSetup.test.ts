import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('Stockfish setup', () => {
  it('copies the browser-safe lite single-threaded engine files', async () => {
    const root = mkdtempSync(join(tmpdir(), 'stockfish-setup-'))
    const bin = join(root, 'node_modules/stockfish/bin')
    const out = join(root, 'public')
    mkdirSync(bin, { recursive: true })
    mkdirSync(out, { recursive: true })

    writeFileSync(join(bin, 'stockfish-18.js'), 'full threaded js')
    writeFileSync(join(bin, 'stockfish-18.wasm'), 'full threaded wasm')
    writeFileSync(join(bin, 'stockfish-18-lite-single.js'), 'lite single js')
    writeFileSync(join(bin, 'stockfish-18-lite-single.wasm'), 'lite single wasm')

    const { setupStockfishAssets } = await import('../../scripts/setup-stockfish.mjs')
    setupStockfishAssets(root)

    assert.equal(readFileSync(join(out, 'stockfish.js'), 'utf8'), 'lite single js')
    assert.equal(readFileSync(join(out, 'stockfish.wasm'), 'utf8'), 'lite single wasm')
  })
})
