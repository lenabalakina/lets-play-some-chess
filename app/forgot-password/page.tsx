'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPasswordReset } from '@/features/auth/actions/auth'
import { PawnIcon } from '@/components/ui/PawnIcon'

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [sent,    setSent]    = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await requestPasswordReset(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSent(true)
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
          <p className="text-slate-500 text-sm">Reset your password</p>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">📧</div>
              <p className="text-white font-semibold">Check your email</p>
              <p className="text-slate-400 text-sm leading-relaxed">
                We&apos;ve sent a password reset link to your email address. Click the link to set a new password.
              </p>
              <p className="text-slate-600 text-xs">
                Didn&apos;t receive it? Check your spam folder.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-slate-400 text-sm">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-sm font-medium">Email</Label>
                <Input
                  id="email" name="email" type="email" required autoComplete="email"
                  placeholder="you@example.com"
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
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-slate-500 text-sm mt-4">
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
