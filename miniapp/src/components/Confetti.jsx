import { useRef, useEffect } from 'react'

const COLORS = ['#7F77DD', '#1D9E75', '#EF9F27', '#D4537E', '#2ed1f2', '#a78bfa']

function randomBetween(a, b) { return a + Math.random() * (b - a) }

function createParticle(W) {
  return {
    x:   randomBetween(0, W),
    y:   randomBetween(-20, -5),
    vx:  randomBetween(-2.5, 2.5),
    vy:  randomBetween(2, 5),
    rot: randomBetween(0, Math.PI * 2),
    rotV: randomBetween(-0.08, 0.08),
    w:   randomBetween(7, 13),
    h:   randomBetween(5, 9),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    alpha: 1,
  }
}

export function Confetti({ active }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef({ particles: [], raf: null, startedAt: 0 })

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = window.innerWidth
    const H = window.innerHeight
    canvas.width  = W
    canvas.height = H

    const s = stateRef.current
    s.startedAt = Date.now()
    s.particles = Array.from({ length: 60 }, () => createParticle(W))

    function tick() {
      const elapsed = Date.now() - s.startedAt
      ctx.clearRect(0, 0, W, H)

      s.particles.forEach(p => {
        p.vy  += 0.12
        p.vx  *= 0.99
        p.x   += p.vx
        p.y   += p.vy
        p.rot += p.rotV
        if (elapsed > 2000) p.alpha = Math.max(0, p.alpha - 0.015)

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = p.alpha
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })

      s.particles = s.particles.filter(p => p.alpha > 0 && p.y < H + 20)

      if (s.particles.length > 0 && elapsed < 3500) {
        s.raf = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, W, H)
      }
    }

    s.raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(s.raf)
  }, [active])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        pointerEvents: 'none',
        zIndex: 999,
      }}
    />
  )
}
