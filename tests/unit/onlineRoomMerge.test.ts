import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mergeRemoteRoomState, type OnlineRoomState } from '../../hooks/useOnlineRoom.ts'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function roomState(overrides: Partial<OnlineRoomState> = {}): OnlineRoomState {
  return {
    fen: START_FEN,
    turn: 'w',
    status: 'playing',
    winner: null,
    moves: [],
    messages: [],
    connected: true,
    lastMove: null,
    drawOfferedBy: null,
    opponentTyping: false,
    opponentOnline: true,
    roomNotFound: false,
    ...overrides,
  }
}

describe('mergeRemoteRoomState', () => {
  it('does not rewind a finished room with an equal-ply stale snapshot', () => {
    const local = roomState({ status: 'finished', winner: 'b' })

    const merged = mergeRemoteRoomState(local, {
      fen: START_FEN,
      turn: 'w',
      status: 'playing',
      winner: null,
      moves: [],
      messages: [],
      drawOfferedBy: null,
    })

    assert.equal(merged, null)
  })

  it('still accepts a terminal remote snapshot', () => {
    const local = roomState()

    const merged = mergeRemoteRoomState(local, {
      fen: START_FEN,
      turn: 'w',
      status: 'finished',
      winner: 'draw',
      moves: [],
      messages: [],
      drawOfferedBy: null,
    })

    assert.equal(merged?.status, 'finished')
    assert.equal(merged?.winner, 'draw')
  })
})
