import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { completeGame } from '../../server/database/queries/games.ts'

function createDbStub() {
  const updates: unknown[] = []

  const db = {
    from(table: string) {
      assert.equal(table, 'games')
      return {
        update(payload: unknown) {
          updates.push(payload)
          return {
            async eq(column: string, value: string) {
              assert.equal(column, 'id')
              assert.equal(value, 'game-1')
              return { error: null }
            },
          }
        },
      }
    },
  }

  return { db, updates }
}

describe('completeGame', () => {
  it('can persist final board state with the terminal result', async () => {
    const { db, updates } = createDbStub()
    const finalMoves = [{ san: 'Qxf7#', from: 'h5', to: 'f7' }]

    await completeGame(db, 'game-1', 'white', {
      fen:         'rnbqkb1r/pppp1Qpp/5n2/4p3/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 4',
      moves:       finalMoves,
      whiteTimeMs: 590_000,
      blackTimeMs: 580_000,
    })

    assert.equal(updates.length, 1)
    const update = updates[0] as Record<string, unknown>
    assert.equal(update.status, 'completed')
    assert.equal(update.result, 'white')
    assert.equal(typeof update.completed_at, 'string')
    assert.equal(update.fen, 'rnbqkb1r/pppp1Qpp/5n2/4p3/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 0 4')
    assert.deepEqual(update.moves, finalMoves)
    assert.equal(update.white_time_ms, 590_000)
    assert.equal(update.black_time_ms, 580_000)
  })

  it('keeps result-only completion available for resignations and draws', async () => {
    const { db, updates } = createDbStub()

    await completeGame(db, 'game-1', 'draw')

    assert.equal(updates.length, 1)
    const update = updates[0] as Record<string, unknown>
    assert.equal(update.status, 'completed')
    assert.equal(update.result, 'draw')
    assert.equal('fen' in update, false)
    assert.equal('moves' in update, false)
    assert.equal('white_time_ms' in update, false)
    assert.equal('black_time_ms' in update, false)
  })
})
