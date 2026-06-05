import { useEffect } from 'react'

const PTS = [
  [50,   5  ],
  [89.9, 34.1],
  [74.9, 81.1],
  [25.1, 81.1],
  [10.1, 34.1],
]
const SIDE_LEN = 50

export function SplashScreen({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="splash">
      <div className="splash-logo">
        {/* Variant 3: Mercury — blur кристаллизуется в пятиугольник */}
        <svg viewBox="0 0 100 92" width="80" height="74">
          <defs>
            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7347e6" />
              <stop offset="100%" stopColor="#2ed1f2" />
            </linearGradient>
            <filter id="mercuryBlur">
              <feGaussianBlur stdDeviation="0">
                <animate attributeName="stdDeviation" from="12" to="0"
                  dur="1s" begin="0.1s" fill="freeze" calcMode="spline"
                  keySplines="0.4 0 0.2 1" />
              </feGaussianBlur>
            </filter>
            <filter id="splashGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* Фоновые стороны */}
          {PTS.map((p, i) => {
            const next = PTS[(i + 1) % 5]
            return (
              <line key={`bg-${i}`}
                x1={p[0]} y1={p[1]} x2={next[0]} y2={next[1]}
                stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round"
              />
            )
          })}
          {/* Mercury — пятно сжимается в пятиугольник */}
          <g filter="url(#mercuryBlur)" style={{ opacity: 0.9 }}>
            {PTS.map((p, i) => {
              const next = PTS[(i + 1) % 5]
              return (
                <line key={`fg-${i}`}
                  className="splash-side"
                  x1={p[0]} y1={p[1]} x2={next[0]} y2={next[1]}
                  stroke="url(#splashGrad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={SIDE_LEN}
                  strokeDashoffset={SIDE_LEN}
                  style={{ animationDelay: `${i * 100}ms`, filter: 'url(#splashGlow)' }}
                />
              )
            })}
          </g>
        </svg>
      </div>
      <div className="splash-title">
        <span className="splash-career">Career</span>
        <span className="splash-check">Check</span>
      </div>
    </div>
  )
}
