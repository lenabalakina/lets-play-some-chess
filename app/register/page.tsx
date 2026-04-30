import { RegisterForm } from '@/features/auth/components/RegisterForm'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#070d1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-4xl text-cyan-400">♟</span>
            <h1 className="text-xl font-bold tracking-wide neon-text">LET&apos;S PLAY SOME CHESS</h1>
          </div>
          <p className="text-slate-500 text-sm">Create your account</p>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <RegisterForm />
        </div>
      </div>
    </div>
  )
}
