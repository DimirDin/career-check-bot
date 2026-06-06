const PTS = [
  [50, 5],
  [89.9, 34.1],
  [74.9, 81.1],
  [25.1, 81.1],
  [10.1, 34.1],
]

export function Logo({ size = 48, variant = 'icon' }) {
  const svgSize = variant === 'full' ? size * 2.8 : size
  const svgH    = size

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <svg
        viewBox="0 0 100 92"
        width={size}
        height={svgH}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={`logoGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6C5CE7" />
            <stop offset="100%" stopColor="#0984E3" />
          </linearGradient>
          <linearGradient id={`logoGrad2-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00CEC9" />
            <stop offset="100%" stopColor="#6C5CE7" />
          </linearGradient>
          <filter id={`logoGlow-${size}`}>
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Фоновые линии */}
        {PTS.map((p, i) => {
          const next = PTS[(i + 1) % 5]
          return (
            <line key={`bg-${i}`}
              x1={p[0]} y1={p[1]} x2={next[0]} y2={next[1]}
              stroke="rgba(255,255,255,0.08)" strokeWidth="2" strokeLinecap="round"
            />
          )
        })}

        {/* Основные стороны */}
        {PTS.map((p, i) => {
          const next = PTS[(i + 1) % 5]
          return (
            <line key={`fg-${i}`}
              x1={p[0]} y1={p[1]} x2={next[0]} y2={next[1]}
              stroke={`url(#logoGrad-${size})`}
              strokeWidth="4"
              strokeLinecap="round"
              filter={`url(#logoGlow-${size})`}
            />
          )
        })}

        {/* Радарные линии */}
        {PTS.map((p, i) => (
          <line key={`r-${i}`}
            x1="50" y1="46" x2={p[0]} y2={p[1]}
            stroke="rgba(108,92,231,0.3)" strokeWidth="1" strokeLinecap="round"
          />
        ))}

        {/* Точки вершин */}
        {PTS.map((p, i) => (
          <circle key={`dot-${i}`} cx={p[0]} cy={p[1]} r="2.5" fill="#6C5CE7" />
        ))}

        {/* Центр */}
        <circle cx="50" cy="46" r="3.5" fill={`url(#logoGrad2-${size})`} />
      </svg>

      {variant === 'full' && (
        <span style={{
          fontSize: size * 0.58,
          fontWeight: 800,
          letterSpacing: '-0.5px',
          lineHeight: 1,
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
        }}>
          <span style={{ color: '#ffffff' }}>Career</span>
          <span style={{ color: '#6C5CE7' }}>Check</span>
        </span>
      )}
    </span>
  )
}
