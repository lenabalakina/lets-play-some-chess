import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { MultiplayerGameLayout } from '@/components/game/MultiplayerGameLayout'
import { getGameMoves } from '@/server/database/queries/moves'
import type { Game, User } from '@/lib/supabase/types'
import type { MoveRecord, TimeControl, Color } from '@/features/chess/types/chess.types'

interface Props {
  params: Promise<{ gameId: string }>
}

export default async function GamePage({ params }: Props) {
  const { gameId } = await params
  const supabase   = await createClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load game
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single() as { data: Game | null }

  if (!game) notFound()

  // Validate user is a player
  const isWhite = game.player_white === user.id
  const isBlack = game.player_black === user.id
  if (!isWhite && !isBlack) redirect('/play')

  const myColor: Color     = isWhite ? 'w' : 'b'
  const opponentId: string = isWhite ? (game.player_black ?? '') : game.player_white

  type ProfileResult = { data: Pick<User, 'username' | 'elo_rating'> | null }

  async function fetchProfile(id: string): Promise<ProfileResult> {
    const res = await supabase.from('users').select('username, elo_rating').eq('id', id).single()
    return { data: (res.data as Pick<User, 'username' | 'elo_rating'> | null) ?? null }
  }

  // Load both player profiles
  const [{ data: myProfile }, { data: oppProfile }] = await Promise.all([
    fetchProfile(user.id),
    opponentId ? fetchProfile(opponentId) : Promise.resolve({ data: null } as ProfileResult),
  ])

  // Load move history for reconnect
  const rawMoves = await getGameMoves(supabase as unknown as Parameters<typeof getGameMoves>[0], gameId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const moveHistory: MoveRecord[] = rawMoves.map((m: any) => ({
    san:        m.move_san,
    from:       m.move_from,
    to:         m.move_to,
    fen:        m.fen_after,
    moveNumber: m.move_number,
    color:      m.color as Color,
    timeTakenMs: m.time_taken_ms ?? undefined,
  }))

  const me = {
    id:       user.id,
    username: myProfile?.username  ?? user.email?.split('@')[0] ?? 'You',
    elo:      myProfile?.elo_rating ?? 1200,
    color:    myColor,
  }
  const opp = {
    id:       opponentId,
    username: oppProfile?.username  ?? 'Opponent',
    elo:      oppProfile?.elo_rating ?? 1200,
    color:    (myColor === 'w' ? 'b' : 'w') as Color,
  }

  return (
    <MultiplayerGameLayout
      gameId={gameId}
      me={me}
      opponent={opp}
      initialFen={game.fen}
      initialMoves={moveHistory}
      whiteTimeMs={game.white_time_ms}
      blackTimeMs={game.black_time_ms}
      timeControl={game.time_control as TimeControl}
      status={game.status as 'active' | 'completed' | 'abandoned'}
      result={game.result}
    />
  )
}
