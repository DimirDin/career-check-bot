import { useState, useEffect } from 'react'

export function OdometerNumber({ value, duration = 1200, delay = 0 }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const start = Date.now() + delay
    let frame
    const tick = () => {
      const now = Date.now()
      if (now < start) { frame = requestAnimationFrame(tick); return }
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setCurrent(Math.round(ease * value))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration, delay])

  return <span>{current}</span>
}
