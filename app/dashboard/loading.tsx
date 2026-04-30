export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#070d1a]">
      {/* Header skeleton */}
      <div className="border-b border-slate-800/50 px-6 py-4 flex items-center justify-between">
        <div className="h-5 w-48 bg-slate-800 rounded animate-pulse" />
        <div className="h-5 w-24 bg-slate-800 rounded animate-pulse" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="h-24 bg-slate-800/40 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-800/40 rounded-xl animate-pulse" style={{ opacity: 1 - i * 0.15 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
