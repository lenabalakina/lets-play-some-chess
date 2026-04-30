'use client'

import { useState } from 'react'
import { signIn } from '../actions/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const fd = new FormData(e.currentTarget)
    const result = await signIn(fd)
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-300 text-sm font-medium">Email</Label>
        <Input
          id="email" name="email" type="email" required autoComplete="email"
          placeholder="you@example.com"
          className="bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-300 text-sm font-medium">Password</Label>
        <Input
          id="password" name="password" type="password" required autoComplete="current-password"
          placeholder="••••••••"
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
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <p className="text-center text-slate-400 text-sm">
        No account?{' '}
        <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
          Create one
        </Link>
      </p>
    </form>
  )
}
