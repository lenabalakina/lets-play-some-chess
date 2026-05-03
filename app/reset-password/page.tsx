'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { PawnIcon } from '@/components/ui/PawnIcon'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const supabase     = createClient()

  const [ready,    setReady]    = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState(false)

  // Exchange the code from the URL for a valid session
  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      setError('Invalid or expired reset link. Please request a new one.')
      return
    }
    supabase.auth.exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) setError('This link has expired. Please request a new reset link.')
        else setReady(true)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd       = new FormData(e.currentTarget)
    const password = fd.get('password')?.toString() ?? ''
    const confirm  = fd.get('confirm')?.toString() ?? ''

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-[#070d1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <PawnIcon size={36} />
            <h1 className="text-xl font-bold tracking-wide neon-text">LET&apos;S PLAY SOME CHESS</h1>
          </div>
          <p className="text-slate-500 text-sm">Set a new password</p>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          {success ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">✅</div>
              <p className="text-white font-semibold">Password updated!</p>
              <p className="text-slate-400 text-sm">Redirecting you to your dashboard…</p>
            </div>
          ) : error && !ready ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">⚠️</div>
              <p className="text-red-400 text-sm">{error}</p>
              <a
                href="/forgot-password"
                className="inline-block mt-2 text-cyan-400 hover:text-cyan-300 text-sm"
              >
                Request a new link →
              </a>
            </div>
          ) : !ready ? (
            <div className="text-center py-4">
              <div className="text-slate-400 text-sm animate-pulse">Verifying link…</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300 text-sm font-medium">
                  New password
                </Label>
                <Input
                  id="password" name="password" type="password" required
                  minLength={6} autoComplete="new-password"
                  placeholder="At least 6 characters"
                  className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-slate-300 text-sm font-medium">
                  Confirm password
                </Label>
                <Input
                  id="confirm" name="confirm" type="password" required
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit" disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition-all
                  bg-cyan-500 hover:bg-cyan-400 text-slate-950
                  disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
              >
                {loading ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
