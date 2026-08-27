import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { findActiveGameForUser } from '../../features/multiplayer/matchmakingActiveGame.ts'

class GamesQuery {
  selected: string | null = null
  orFilter: string | null = null
  eqFilters: Array<[string, unknown]> = []
  orderArgs: [string, { ascending: boolean }] | null = null
  limitValue: number | null = null
  private readonly data: { id: string } | null

  constructor(data: { id: string } | null) {
    this.data = data
  }

  select(columns: string) {
    this.selected = columns
    return this
  }

  or(filter: string) {
    this.orFilter = filter
    return this
  }

  eq(column: string, value: unknown) {
    this.eqFilters.push([column, value])
    return this
  }

  order(column: string, options: { ascending: boolean }) {
    this.orderArgs = [column, options]
    return this
  }

  limit(value: number) {
    this.limitValue = value
    return this
  }

  async single() {
    return { data: this.data }
  }
}

function createDb(data: { id: string } | null) {
  const query = new GamesQuery(data)
  return {
    query,
    db: {
      from(table: string) {
        assert.equal(table, 'games')
        return query
      },
    },
  }
}

describe('findActiveGameForUser', () => {
  it('returns the latest active game for either player color', async () => {
    const { db, query } = createDb({ id: 'game-123' })

    const result = await findActiveGameForUser(db, 'player-1')

    assert.deepEqual(result, { gameId: 'game-123' })
    assert.equal(query.selected, 'id')
    assert.equal(query.orFilter, 'player_white.eq.player-1,player_black.eq.player-1')
    assert.deepEqual(query.eqFilters, [['status', 'active']])
    assert.deepEqual(query.orderArgs, ['created_at', { ascending: false }])
    assert.equal(query.limitValue, 1)
  })

  it('returns null when no active game exists', async () => {
    const { db } = createDb(null)

    const result = await findActiveGameForUser(db, 'player-1')

    assert.equal(result, null)
  })
})
