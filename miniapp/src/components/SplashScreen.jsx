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
    const t = setTimeout(onDone, 1800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="splash">
      <div className="splash-logo">
        <svg viewBox="0 0 100 92" width="88" height="80">
          <defs>
            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6C5CE7" />
              <stop offset="100%" stopColor="#0984E3" />
            </linearGradient>
            <linearGradient id="splashGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00CEC9" />
              <stop offset="100%" stopColor="#6C5CE7" />
            </linearGradient>
            <filter id="mercuryBlur">
              <feGaussianBlur stdDeviation="0">
                <animate attributeName="stdDeviation" from="14" to="0"
                  dur="1.1s" begin="0.1s" fill="freeze" calcMode="spline"
                  keySplines="0.4 0 0.2 1" />
              </feGaussianBlur>
            </filter>
            <filter id="splashGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Фоновые линии */}
          {PTS.map((p, i) => {
            const next = PTS[(i + 1) % 5]
            return (
              <line key={`bg-${i}`}
                x1={p[0]} y1={p[1]} x2={next[0]} y2={next[1]}
                stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeLinecap="round"
              />
            )
          })}

          {/* Радарные линии центр→вершина */}
          {PTS.map((p, i) => (
            <line key={`r-${i}`}
              x1="50" y1="46" x2={p[0]} y2={p[1]}
              stroke="rgba(108,92,231,0.25)" strokeWidth="1" strokeLinecap="round"
            />
          ))}

          {/* Mercury — пятно кристаллизуется в пятиугольник */}
          <g filter="url(#mercuryBlur)">
            {PTS.map((p, i) => {
              const next = PTS[(i + 1) % 5]
              return (
                <line key={`fg-${i}`}
                  className="splash-side"
                  x1={p[0]} y1={p[1]} x2={next[0]} y2={next[1]}
                  stroke="url(#splashGrad)"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeDasharray={SIDE_LEN}
                  strokeDashoffset={SIDE_LEN}
                  style={{ animationDelay: `${i * 80}ms`, filter: 'url(#splashGlow)' }}
                />
              )
            })}
          </g>

          {/* Вершины — точки */}
          {PTS.map((p, i) => (
            <circle key={`dot-${i}`}
              cx={p[0]} cy={p[1]} r="2.5"
              fill="#6C5CE7" opacity="0"
              style={{ animation: `splashDotIn 0.3s ${0.5 + i * 0.08}s ease forwards` }}
            />
          ))}

          {/* Центральная точка */}
          <circle cx="50" cy="46" r="3.5" fill="url(#splashGrad2)"
            style={{ animation: 'splashDotIn 0.4s 0.9s ease forwards', opacity: 0 }}
          />
        </svg>
      </div>

      <div className="splash-title">
        <span className="splash-career">Career</span>
        <span className="splash-check">Check</span>
      </div>

      <div className="splash-pulse">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}
