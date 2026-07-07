import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateDrawAcceptanceRequest,
  validateDrawOfferRequest,
  type DrawOfferGameState,
} from '../../features/multiplayer/drawOffers.ts'

const activeGame: DrawOfferGameState = {
  status:          'active',
  player_white:    'white-player',
  player_black:    'black-player',
  draw_offered_by: null,
}

describe('ranked draw offer validation', () => {
  it('allows a player to create a draw offer when no offer exists', () => {
    assert.equal(validateDrawOfferRequest(activeGame, 'white-player'), null)
  })

  it('rejects accepting a draw when no opponent offer exists', () => {
    assert.equal(
      validateDrawAcceptanceRequest(activeGame, 'white-player'),
      'No draw offer to accept',
    )
  })

  it('rejects accepting your own draw offer', () => {
    assert.equal(
      validateDrawAcceptanceRequest({ ...activeGame, draw_offered_by: 'white-player' }, 'white-player'),
      'Cannot accept your own draw offer',
    )
  })

  it('allows only the opponent to accept a recorded draw offer', () => {
    assert.equal(
      validateDrawAcceptanceRequest({ ...activeGame, draw_offered_by: 'white-player' }, 'black-player'),
      null,
    )
  })

  it('rejects non-players for offer and acceptance requests', () => {
    assert.equal(validateDrawOfferRequest(activeGame, 'spectator'), 'Not a player')
    assert.equal(
      validateDrawAcceptanceRequest({ ...activeGame, draw_offered_by: 'white-player' }, 'spectator'),
      'Not a player',
    )
  })
})
