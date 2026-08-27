// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

export async function findActiveGameForUser(
  db: DB,
  userId: string
): Promise<{ gameId: string } | null> {
  const { data } = await db
    .from('games')
    .select('id')
    .or(`player_white.eq.${userId},player_black.eq.${userId}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null
  return { gameId: data.id }
}
