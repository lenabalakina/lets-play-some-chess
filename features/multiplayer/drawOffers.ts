export interface DrawOfferGameState {
  status:          string
  player_white:    string
  player_black:    string | null
  draw_offered_by: string | null
}

function isPlayer(game: DrawOfferGameState, userId: string): boolean {
  return game.player_white === userId || game.player_black === userId
}

export function validateDrawOfferRequest(
  game: DrawOfferGameState,
  userId: string,
): string | null {
  if (game.status !== 'active') return 'Game not active'
  if (!isPlayer(game, userId)) return 'Not a player'
  if (game.draw_offered_by === userId) return 'Draw offer already sent'
  if (game.draw_offered_by) return 'Respond to the existing draw offer'
  return null
}

export function validateDrawAcceptanceRequest(
  game: DrawOfferGameState,
  userId: string,
): string | null {
  if (game.status !== 'active') return 'Game not active'
  if (!isPlayer(game, userId)) return 'Not a player'
  if (!game.draw_offered_by) return 'No draw offer to accept'
  if (game.draw_offered_by === userId) return 'Cannot accept your own draw offer'
  return null
}
