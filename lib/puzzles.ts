import puzzlesJson from '../data/puzzles.json' with { type: 'json' }

export interface LocalPuzzle {
  id:         string
  fen:        string
  lastMove:   string
  solution:   string[]
  themes:     string[]
  rating:     number
  plays:      number
}

interface PuzzleDatabase {
  version: number
  count:   number
  source:  string
  puzzles: LocalPuzzle[]
}

const database = puzzlesJson as PuzzleDatabase

/** All imported puzzles (777 from Lichess open database). */
export const PUZZLES: LocalPuzzle[] = database.puzzles

export const PUZZLE_COUNT = PUZZLES.length

function dayIndex(day = new Date().toISOString().slice(0, 10)): number {
  let hash = 0
  for (let i = 0; i < day.length; i++) hash = (hash * 31 + day.charCodeAt(i)) | 0
  return Math.abs(hash) % PUZZLES.length
}

/** Same puzzle for everyone on a given UTC calendar day. */
export function getDailyPuzzle(day?: string): LocalPuzzle {
  return PUZZLES[dayIndex(day)]
}

export function getRandomPuzzle(excludeId?: string): LocalPuzzle {
  const pool = excludeId ? PUZZLES.filter(p => p.id !== excludeId) : PUZZLES
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getPuzzleById(id: string): LocalPuzzle | undefined {
  return PUZZLES.find(p => p.id === id)
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
