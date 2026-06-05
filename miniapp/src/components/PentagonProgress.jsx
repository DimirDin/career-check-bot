// Pentagon vertices (top point first, clockwise)
const PTS = [
  [50,   5  ],
  [89.9, 34.1],
  [74.9, 81.1],
  [25.1, 81.1],
  [10.1, 34.1],
]
const QUESTIONS_PER_SIDE = 12

function lerp([x1, y1], [x2, y2], t) {
  return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)]
}

export function PentagonProgress({ answered, total = 60, size = 88 }) {
  const fullSides      = Math.floor(answered / QUESTIONS_PER_SIDE)
  const partialFrac    = (answered % QUESTIONS_PER_SIDE) / QUESTIONS_PER_SIDE

  return (
    <div className="pentagon-wrap" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 92" width={size} height={size}>

        {/* Background sides (dim) */}
        {PTS.map((p, i) => {
          const next = PTS[(i + 1) % 5]
          return (
            <line
              key={`bg-${i}`}
              x1={p[0]} y1={p[1]} x2={next[0]} y2={next[1]}
              stroke="rgba(255,255,255,0.13)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )
        })}

        {/* Filled sides */}
        {PTS.map((p, i) => {
          const next = PTS[(i + 1) % 5]
          let frac = 0
          if (i < fullSides) frac = 1
          else if (i === fullSides) frac = partialFrac
          if (frac === 0) return null

          const [fx2, fy2] = lerp(p, next, frac)
          return (
            <line
              key={`fill-${i}`}
              x1={p[0]} y1={p[1]} x2={fx2} y2={fy2}
              stroke="url(#penGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 3px rgba(115,71,230,0.8))' }}
            />
          )
        })}

        {/* Center text — bigger & cleaner */}
        <text
          x="50" y="44"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="18"
          fontWeight="800"
          fontFamily="-apple-system, Arial, sans-serif"
          fill="white"
        >
          {answered}
        </text>
        <text
          x="50" y="60"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="10"
          fontFamily="-apple-system, Arial, sans-serif"
          fill="rgba(255,255,255,0.5)"
        >
          /{total}
        </text>

        <defs>
          <linearGradient id="penGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7347e6" />
            <stop offset="100%" stopColor="#2ed1f2" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
