// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

export async function insertMove(db: DB, params: {
  gameId:      string
  playerId:    string
  moveSan:     string
  moveFrom:    string
  moveTo:      string
  fenAfter:    string
  moveNumber:  number
  color:       'w' | 'b'
  timeTakenMs: number
}) {
  const { data, error } = await db
    .from('moves')
    .insert({
      game_id:      params.gameId,
      player_id:    params.playerId,
      move_san:     params.moveSan,
      move_from:    params.moveFrom,
      move_to:      params.moveTo,
      fen_after:    params.fenAfter,
      move_number:  params.moveNumber,
      color:        params.color,
      time_taken_ms: params.timeTakenMs,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getGameMoves(db: DB, gameId: string) {
  const { data, error } = await db
    .from('moves')
    .select('*')
    .eq('game_id', gameId)
    .order('move_number', { ascending: true })

  if (error) return []
  return data ?? []
}
