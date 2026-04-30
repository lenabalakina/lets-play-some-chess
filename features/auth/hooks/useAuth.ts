'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '@/lib/supabase/types'

export function useAuth() {
  const [authUser, setAuthUser]   = useState<SupabaseUser | null>(null)
  const [profile, setProfile]     = useState<User | null>(null)
  const [loading, setLoading]     = useState(true)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthUser(user)
      if (user) fetchProfile(user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single()
    setProfile(data)
    setLoading(false)
  }

  return { authUser, profile, loading }
}
