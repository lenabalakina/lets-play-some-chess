export default function GameLoading() {
  return (
    <div className="h-screen bg-[#070d1a] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="text-5xl text-cyan-400 animate-pulse select-none" style={{ textShadow: '0 0 30px rgba(6,182,212,0.6)' }}>
          ♟
        </div>
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">Joining game…</p>
      </div>
    </div>
  )
}
