import { PuzzleBoard } from '@/components/puzzle/PuzzleBoard'
import { getRandomPuzzle, toApiFormat } from '@/lib/puzzles'

async function getDailyPuzzle() {
  try {
    const res = await fetch('https://lichess.org/api/puzzle/daily', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (res.ok) return res.json()
  } catch {
    // fall through
  }
  return toApiFormat(getRandomPuzzle())
}

export default async function PuzzlesPage() {
  const puzzle = await getDailyPuzzle()
  return <PuzzleBoard initialPuzzle={puzzle} />
}
