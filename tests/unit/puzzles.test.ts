import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { Chess } from 'chess.js'
import { PUZZLES, PUZZLE_COUNT } from '../../lib/puzzles.ts'

describe('puzzle library', () => {
  it('contains 777 puzzles', () => {
    assert.equal(PUZZLE_COUNT, 777)
    assert.equal(PUZZLES.length, 777)
  })

  it('all puzzle ids are unique', () => {
    const ids = new Set(PUZZLES.map(p => p.id))
    assert.equal(ids.size, PUZZLES.length)
  })

  it('getDailyPuzzle is stable for the same day', async () => {
    const { getDailyPuzzle } = await import('../../lib/puzzles.ts')
    const a = getDailyPuzzle('2026-06-13')
    const b = getDailyPuzzle('2026-06-13')
    assert.equal(a.id, b.id)
  })
})

describe('local puzzles', () => {
  // Spot-check every 50th puzzle plus the first and last
  const sample = PUZZLES.filter((_, i) => i === 0 || i === PUZZLES.length - 1 || i % 50 === 0)

  for (const puzzle of sample) {
    it(`${puzzle.id} has a legal solution line`, () => {
      if (puzzle.lastMove) {
        assert.notEqual(puzzle.lastMove.slice(0, 2), puzzle.lastMove.slice(2, 4),
          `${puzzle.id}: lastMove must not be from/to the same square`)
      }

      const chess = new Chess(puzzle.fen)
      const startTurn = chess.turn()

      for (let idx = 0; idx < puzzle.solution.length; idx++) {
        const uci = puzzle.solution[idx]
        const expectedTurn = idx % 2 === 0 ? startTurn : (startTurn === 'w' ? 'b' : 'w')
        assert.equal(chess.turn(), expectedTurn,
          `${puzzle.id} move ${idx} (${uci}): wrong side to move`)

        const result = chess.move({
          from:      uci.slice(0, 2),
          to:        uci.slice(2, 4),
          promotion: uci.length === 5 ? uci[4] : undefined,
        })
        assert.ok(result, `${puzzle.id} move ${idx} (${uci}) is illegal`)
      }
    })
  }
})
