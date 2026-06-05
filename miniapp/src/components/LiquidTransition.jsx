import { useEffect, useRef } from 'react'

export function LiquidTransition({ active, origin }) {
  const circleRef = useRef(null)

  useEffect(() => {
    if (!active || !circleRef.current) return
    // Перезапускаем анимацию через cloneNode
    const circle = circleRef.current
    const parent = circle.parentNode
    const clone  = circle.cloneNode(true)
    parent.replaceChild(clone, circle)
    circleRef.current = clone
  }, [active])

  if (!active) return null

  const cx = origin?.x ?? window.innerWidth  / 2
  const cy = origin?.y ?? window.innerHeight / 2

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'none' }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <clipPath id="liquid-clip">
            <circle ref={circleRef} cx={cx} cy={cy} r="0">
              <animate attributeName="r" from="0" to="120vmax"
                dur="0.55s" fill="freeze" calcMode="spline"
                keySplines="0.4 0 0.2 1" />
            </circle>
          </clipPath>
        </defs>
        <rect width="100%" height="100%" fill="#0d0d1a" clipPath="url(#liquid-clip)" />
      </svg>
    </div>
  )
}
