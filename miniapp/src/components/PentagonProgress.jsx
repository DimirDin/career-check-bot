import { useRef, useEffect } from 'react'

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

function spawnTrail(ctx, fromPt, toPt, scale) {
  const particles = [0, 40, 80, 120, 160].map((delay, i) => ({
    x: fromPt[0] * scale, y: fromPt[1] * scale,
    tx: toPt[0] * scale, ty: toPt[1] * scale,
    size: 4, alpha: 1,
    delay, startTime: null,
    color: i % 2 === 0 ? '#7347e6' : '#2ed1f2',
  }))
  const start = Date.now()
  const duration = 300
  let raf
  const draw = () => {
    const now = Date.now()
    let anyAlive = false
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    particles.forEach(p => {
      const elapsed = now - start - p.delay
      if (elapsed < 0) { anyAlive = true; return }
      const t = Math.min(elapsed / duration, 1)
      if (t >= 1) return
      anyAlive = true
      const x = p.x + (p.tx - p.x) * t
      const y = p.y + (p.ty - p.y) * t
      const size = p.size * (1 - t)
      ctx.globalAlpha = 1 - t
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(x, y, size / 2, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1
    if (anyAlive) raf = requestAnimationFrame(draw)
  }
  raf = requestAnimationFrame(draw)
  return () => cancelAnimationFrame(raf)
}

export function PentagonProgress({ answered, total = 60, size = 88 }) {
  const fullSides   = Math.floor(answered / QUESTIONS_PER_SIDE)
  const partialFrac = (answered % QUESTIONS_PER_SIDE) / QUESTIONS_PER_SIDE
  const canvasRef   = useRef(null)
  const prevAnswered = useRef(answered)

  useEffect(() => {
    if (answered === prevAnswered.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const scale = size / 100

    const prevFull  = Math.floor(prevAnswered.current / QUESTIONS_PER_SIDE)
    const prevFrac  = (prevAnswered.current % QUESTIONS_PER_SIDE) / QUESTIONS_PER_SIDE
    const fromPt = lerp(PTS[prevFull % 5], PTS[(prevFull + 1) % 5], prevFrac)
    const currFull = Math.floor(answered / QUESTIONS_PER_SIDE)
    const currFrac = (answered % QUESTIONS_PER_SIDE) / QUESTIONS_PER_SIDE
    const toPt   = lerp(PTS[currFull % 5], PTS[(currFull + 1) % 5], currFrac)

    const cancel = spawnTrail(ctx, fromPt, toPt, scale)
    prevAnswered.current = answered
    return cancel
  }, [answered, size])

  return (
    <div className="pentagon-wrap" style={{ width: size, height: size, position: 'relative' }}>
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
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      />
    </div>
  )
}
