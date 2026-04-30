export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen bg-[#070d1a]">
      <div className="border-b border-slate-800/50 px-6 py-4">
        <div className="h-5 w-40 bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-3">
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-slate-800/40 rounded-xl animate-pulse"
            style={{ opacity: Math.max(0.3, 1 - i * 0.05) }}
          />
        ))}
      </div>
    </div>
  )
}
