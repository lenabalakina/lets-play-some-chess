import { getRandomPuzzle, toApiFormat } from '@/lib/puzzles'

export async function GET() {
  try {
    const res = await fetch('https://lichess.org/api/puzzle/daily', {
      headers: { Accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (res.ok) return Response.json(await res.json())
  } catch {
    // Lichess unavailable — fall through to local puzzles
  }
  return Response.json(toApiFormat(getRandomPuzzle()))
}
