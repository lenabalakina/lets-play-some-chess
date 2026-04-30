export type GameResult = 'win' | 'loss' | 'draw'

function kFactor(gamesPlayed: number): number {
  // K=40 for first 5 games, K=20 for first 30, K=10 after
  if (gamesPlayed < 5)  return 40
  if (gamesPlayed < 30) return 20
  return 10
}

function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400))
}

function score(result: GameResult): number {
  return result === 'win' ? 1 : result === 'draw' ? 0.5 : 0
}

export interface EloUpdate {
  whiteNewElo: number
  blackNewElo: number
  whiteDelta:  number
  blackDelta:  number
}

export function calculateElo(
  whiteElo: number,
  blackElo: number,
  whiteGamesPlayed: number,
  blackGamesPlayed: number,
  result: 'white' | 'black' | 'draw'
): EloUpdate {
  const whiteResult: GameResult = result === 'white' ? 'win' : result === 'draw' ? 'draw' : 'loss'
  const blackResult: GameResult = result === 'black' ? 'win' : result === 'draw' ? 'draw' : 'loss'

  const whiteExpected = expectedScore(whiteElo, blackElo)
  const blackExpected = expectedScore(blackElo, whiteElo)

  const whiteDelta = Math.round(kFactor(whiteGamesPlayed) * (score(whiteResult) - whiteExpected))
  const blackDelta = Math.round(kFactor(blackGamesPlayed) * (score(blackResult) - blackExpected))

  return {
    whiteNewElo: Math.max(100, whiteElo + whiteDelta),
    blackNewElo: Math.max(100, blackElo + blackDelta),
    whiteDelta,
    blackDelta,
  }
}
