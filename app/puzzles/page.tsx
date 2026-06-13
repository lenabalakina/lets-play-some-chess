import { PuzzleBoard } from '@/components/puzzle/PuzzleBoard'
import { getDailyPuzzle, PUZZLE_COUNT, toApiFormat } from '@/lib/puzzles'

export default function PuzzlesPage() {
  const puzzle = toApiFormat(getDailyPuzzle())
  return <PuzzleBoard initialPuzzle={puzzle} poolSize={PUZZLE_COUNT} daily />
}
