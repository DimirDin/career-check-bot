import { useEffect } from 'react'

// Pentagon points (r=42, cx=50, cy=47, first point at top)
const PTS = [
  [50,   5  ],
  [89.9, 34.1],
  [74.9, 81.1],
  [25.1, 81.1],
  [10.1, 34.1],
]

// Length of each side ≈ 49.4 px
const SIDE_LEN = 50

export function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="splash">
      <div className="splash-logo">
        <svg viewBox="0 0 100 92" width="80" height="74">
          {/* Background pentagon */}
          {PTS.map((p, i) => {
            const next = PTS[(i + 1) % 5]
            return (
              <line
                key={`bg-${i}`}
                x1={p[0]} y1={p[1]} x2={next[0]} y2={next[1]}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )
          })}
          {/* Animated pentagon sides */}
          {PTS.map((p, i) => {
            const next = PTS[(i + 1) % 5]
            return (
              <line
                key={`fg-${i}`}
                className="splash-side"
                x1={p[0]} y1={p[1]} x2={next[0]} y2={next[1]}
                stroke="url(#splashGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={SIDE_LEN}
                strokeDashoffset={SIDE_LEN}
                style={{ animationDelay: `${i * 120}ms` }}
              />
            )
          })}
          <defs>
            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7347e6" />
              <stop offset="100%" stopColor="#2ed1f2" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="splash-title">
        <span className="splash-career">Career</span>
        <span className="splash-check">Check</span>
      </div>
    </div>
  )
}
