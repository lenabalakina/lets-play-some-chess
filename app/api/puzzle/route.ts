import { getRandomPuzzle, PUZZLE_COUNT, toApiFormat } from '@/lib/puzzles'

export async function GET() {
  return Response.json(toApiFormat(getRandomPuzzle()), {
    headers: { 'X-Puzzle-Pool-Size': String(PUZZLE_COUNT) },
  })
}
