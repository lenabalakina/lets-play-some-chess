export interface LocalPuzzle {
  id:         string
  fen:        string
  lastMove:   string
  solution:   string[]
  themes:     string[]
  rating:     number
  plays:      number
}

// Each puzzle: FEN is the position BEFORE the player moves.
// lastMove = the opponent's last move that set up the puzzle.
// solution = player's moves in UCI (alternating player/opponent until done).
export const PUZZLES: LocalPuzzle[] = [
  {
    id: 'back-rank-1',
    fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    lastMove: 'e8f8',
    solution: ['d1d8'],
    themes: ['backRankMate', 'mate', 'mateIn1'],
    rating: 800,
    plays: 12400,
  },
  {
    id: 'fork-queen-1',
    fen: '3k4/8/8/4n3/8/8/3K1R2/8 b - - 0 1',
    lastMove: 'f1f2',
    solution: ['e5c4', 'd2e3', 'c4e3'],
    themes: ['fork', 'knightEndgame'],
    rating: 900,
    plays: 9800,
  },
  {
    id: 'pin-win-1',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5',
    lastMove: 'f8b4',
    solution: ['c1d2', 'b4d2', 'd1d2'],
    themes: ['pin', 'discoveredAttack'],
    rating: 1000,
    plays: 7300,
  },
  {
    id: 'smothered-mate',
    fen: '6rk/6pp/7N/8/8/8/6PP/6K1 w - - 0 1',
    lastMove: 'g8g8',
    solution: ['h6f7', 'h8g8', 'f7h6', 'g8h8', 'h6g8'],
    themes: ['smotheredMate', 'mate', 'mateIn3'],
    rating: 1200,
    plays: 6100,
  },
  {
    id: 'skewer-1',
    fen: '4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 1',
    lastMove: 'e8e7',
    solution: ['e2e8', 'e7e8', 'e1e8'],
    themes: ['skewer', 'rookEndgame'],
    rating: 850,
    plays: 11200,
  },
  {
    id: 'queen-sacrifice',
    fen: '4r1k1/pp3ppp/2p5/8/4Q3/8/PP3PPP/5RK1 w - - 0 1',
    lastMove: 'e8e8',
    solution: ['e4e8', 'f8e8', 'f1e1'],
    themes: ['sacrifice', 'attraction', 'rookEndgame'],
    rating: 1100,
    plays: 5400,
  },
  {
    id: 'discovered-check',
    fen: 'r1bqkb1r/ppp2ppp/2n5/3pp3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
    lastMove: 'd8d6',
    solution: ['f3e5', 'c6e5', 'c4d5'],
    themes: ['discoveredAttack', 'fork'],
    rating: 1050,
    plays: 8700,
  },
  {
    id: 'rook-7th',
    fen: '8/1p4k1/p7/P7/8/8/1r4K1/3R4 b - - 0 1',
    lastMove: 'd1d4',
    solution: ['b2b1', 'd1b1', 'b7b1'],
    themes: ['rookEndgame', 'backRankMate'],
    rating: 950,
    plays: 9100,
  },
  {
    id: 'zwischenzug',
    fen: 'r1bqkb1r/pp3ppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 7',
    lastMove: 'f8b4',
    solution: ['f3e5', 'd6e5', 'c4f7', 'e8f7', 'd1h5'],
    themes: ['fork', 'attraction', 'middlegame'],
    rating: 1300,
    plays: 4200,
  },
  {
    id: 'mate-in-2-ladder',
    fen: '5rk1/pp4pp/2p5/8/8/8/PP4PP/3R1RK1 w - - 0 1',
    lastMove: 'f8f8',
    solution: ['d1d8', 'f8d8', 'f1d1'],
    themes: ['doubleRook', 'mate', 'mateIn2'],
    rating: 1000,
    plays: 7800,
  },
  {
    id: 'bishop-endgame',
    fen: '8/pp3pk1/2p3p1/2P5/P3B3/8/5PPP/6K1 w - - 0 1',
    lastMove: 'f7g7',
    solution: ['e4b7', 'a7b7', 'a4a5'],
    themes: ['bishopEndgame', 'pawnEndgame'],
    rating: 1150,
    plays: 3900,
  },
  {
    id: 'remove-defender',
    fen: 'r1b1k2r/ppppqppp/2n2n2/4p3/2B1P3/3P4/PPPN1PPP/R1BQK2R w KQkq - 0 7',
    lastMove: 'e7e7',
    solution: ['c4f7', 'e8f7', 'd1h5', 'f7e6', 'h5e5'],
    themes: ['attraction', 'sacrifice', 'removeDefender'],
    rating: 1250,
    plays: 5600,
  },
  {
    id: 'pawn-promotion',
    fen: '8/P6k/8/8/8/8/7K/8 w - - 0 1',
    lastMove: 'h7h7',
    solution: ['a7a8q', 'h7g7', 'a8g2'],
    themes: ['promotion', 'queenEndgame'],
    rating: 900,
    plays: 10300,
  },
  {
    id: 'greek-gift',
    fen: 'r1bq1rk1/ppp2ppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQR1K1 w - - 0 8',
    lastMove: 'g8h8',
    solution: ['c4h7', 'h8h7', 'f3g5', 'h7g8', 'd1h5'],
    themes: ['sacrifice', 'attack', 'greekGift'],
    rating: 1400,
    plays: 3800,
  },
  {
    id: 'endgame-king',
    fen: '8/8/3k4/3p4/3P4/3K4/8/8 w - - 0 1',
    lastMove: 'd6d6',
    solution: ['d3e3', 'd6e6', 'e3f4', 'e6f6', 'f4e4'],
    themes: ['kingEndgame', 'opposition'],
    rating: 1100,
    plays: 6700,
  },
]

export function getRandomPuzzle(excludeId?: string): LocalPuzzle {
  const pool = excludeId ? PUZZLES.filter(p => p.id !== excludeId) : PUZZLES
  return pool[Math.floor(Math.random() * pool.length)]
}

export function toApiFormat(p: LocalPuzzle) {
  return {
    game: { pgn: '', id: p.id },
    puzzle: {
      id:         p.id,
      rating:     p.rating,
      plays:      p.plays,
      solution:   p.solution,
      themes:     p.themes,
      initialPly: 0,
      fen:        p.fen,
      lastMove:   p.lastMove,
    },
  }
}
