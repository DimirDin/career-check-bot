import { useEffect, useRef } from 'react'

/**
 * Aurora Streak — полупрозрачный луч aurora-цветов поверх экрана.
 * pointer-events: none — не блокирует никакие тапы.
 * Чисто декоративный, контент меняется мгновенно.
 */
export function AuroraStreak({ active }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!active || !ref.current) return
    const el = ref.current
    // Сброс и перезапуск анимации
    el.style.animation = 'none'
    void el.offsetWidth // reflow
    el.style.animation = ''
  }, [active])

  if (!active) return null

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div className="aurora-streak-band" />
    </div>
  )
}
