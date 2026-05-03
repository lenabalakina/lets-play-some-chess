'use server'

import { redirect } from 'next/navigation'
import { validate, signUpSchema, signInSchema } from '@/lib/validate'

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return typeof url === 'string' && url.startsWith('http')
}

async function getClient() {
  if (!isSupabaseConfigured()) return null
  const { createClient } = await import('@/lib/supabase/server')
  return createClient()
}

export async function signUp(formData: FormData) {
  const input = validate(signUpSchema, {
    email:    formData.get('email'),
    password: formData.get('password'),
    username: formData.get('username'),
  })
  if ('error' in input) return { error: input.error }

  const supabase = await getClient()
  if (!supabase) return { error: 'Accounts are not enabled yet. Play as a guest instead.' }

  const { error } = await supabase.auth.signUp({
    email:    input.data.email,
    password: input.data.password,
    options:  { data: { username: input.data.username } },
  })

  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function signIn(formData: FormData) {
  const input = validate(signInSchema, {
    email:    formData.get('email'),
    password: formData.get('password'),
  })
  if ('error' in input) return { error: input.error }

  const supabase = await getClient()
  if (!supabase) return { error: 'Accounts are not enabled yet. Play as a guest instead.' }

  const { error } = await supabase.auth.signInWithPassword({
    email:    input.data.email,
    password: input.data.password,
  })
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await getClient()
  if (supabase) await supabase.auth.signOut()
  redirect('/login')
}

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email')?.toString().trim()
  if (!email) return { error: 'Email is required' }

  const supabase = await getClient()
  if (!supabase) return { error: 'Accounts are not enabled yet.' }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://letsplaysomechess.com'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })

  if (error) return { error: error.message }
  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password')?.toString()
  if (!password || password.length < 6) return { error: 'Password must be at least 6 characters' }

  const supabase = await getClient()
  if (!supabase) return { error: 'Accounts are not enabled yet.' }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: error.message }
  redirect('/dashboard')
}
