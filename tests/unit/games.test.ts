import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { completeGame } from '../../server/database/queries/games.ts'

function createCompleteGameDb(data: unknown, error: { message: string } | null = null) {
  const calls: Array<{ op: string; args: unknown[] }> = []
  const builder = {
    update(...args: unknown[]) {
      calls.push({ op: 'update', args })
      return builder
    },
    eq(...args: unknown[]) {
      calls.push({ op: 'eq', args })
      return builder
    },
    select(...args: unknown[]) {
      calls.push({ op: 'select', args })
      return builder
    },
    async maybeSingle() {
      calls.push({ op: 'maybeSingle', args: [] })
      return { data, error }
    },
  }
  return {
    calls,
    db: {
      from(table: string) {
        calls.push({ op: 'from', args: [table] })
        return builder
      },
    },
  }
}

describe('game queries', () => {
  it('completeGame only succeeds when an active game row is updated', async () => {
    const completed = createCompleteGameDb({ id: 'game-1' })
    assert.equal(await completeGame(completed.db, 'game-1', 'white'), true)
    assert.ok(completed.calls.some(call =>
      call.op === 'eq' &&
      call.args[0] === 'status' &&
      call.args[1] === 'active',
    ))

    const alreadyCompleted = createCompleteGameDb(null)
    assert.equal(await completeGame(alreadyCompleted.db, 'game-1', 'white'), false)
  })
})
