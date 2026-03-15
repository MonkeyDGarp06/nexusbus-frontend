import { useEffect, useState } from 'react'

export default function SplashScreen({ onDone }) {
  const [fade, setFade] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFade(true), 1800)
    const t2 = setTimeout(() => onDone(), 2300)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500
      ${fade ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)' }}>

      {/* Logo */}
      <div className="relative mb-6">
        <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-2xl">
          <svg className="w-14 h-14 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 001 1h1a1 1 0 001-1v-1h8v1a1 1 0 001 1h1a1 1 0 001-1v-1.78A3 3 0 0020 16V8c0-3.5-3.58-4-8-4s-8 .5-8 4v8zm3.5 1a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm9 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM6 9h12v4H6V9z"/>
          </svg>
        </div>
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-3xl border-2 border-white/40 animate-ping" />
      </div>

      {/* App name */}
      <h1 className="text-white font-black text-4xl tracking-tight mb-2">NexusBus</h1>
      <p className="text-blue-200 text-sm font-medium">Real-time bus tracking</p>

      {/* Loading dots */}
      <div className="flex gap-2 mt-10">
        {[0, 1, 2].map(i => (
          <div key={i}
            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
