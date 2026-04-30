import { MatchmakingLobby } from '@/features/multiplayer/components/MatchmakingLobby'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@/lib/supabase/types'

export default async function PlayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('username, elo_rating')
    .eq('id', user.id)
    .single() as { data: Pick<User, 'username' | 'elo_rating'> | null }

  const username = profile?.username ?? user.email?.split('@')[0] ?? 'You'
  const elo      = profile?.elo_rating ?? 1200

  return <MatchmakingLobby username={username} elo={elo} />
}
