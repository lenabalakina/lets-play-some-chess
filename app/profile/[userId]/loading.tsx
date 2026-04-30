export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[#070d1a]">
      <div className="border-b border-slate-800/50 px-6 py-4">
        <div className="h-5 w-32 bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
        <div className="h-28 bg-slate-800/40 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-16 bg-slate-800/40 rounded-xl animate-pulse" />
        <div className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-800/40 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.1 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
