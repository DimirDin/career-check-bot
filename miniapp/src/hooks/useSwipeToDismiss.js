import { useRef } from 'react'

export function useSwipeToDismiss(onDismiss, threshold = 80) {
  const startY = useRef(0)
  const startX = useRef(0)
  const el     = useRef(null)

  const handlers = {
    onTouchStart: (e) => {
      startY.current = e.touches[0].clientY
      startX.current = e.touches[0].clientX
      if (el.current) {
        el.current.style.transition = 'none'
      }
    },
    onTouchMove: (e) => {
      const dy = e.touches[0].clientY - startY.current
      const dx = e.touches[0].clientX - startX.current
      if (dy > 0 && dy > Math.abs(dx) && el.current) {
        el.current.style.transform = `translateY(${dy * 0.4}px)`
        el.current.style.opacity   = `${1 - dy / 300}`
      }
    },
    onTouchEnd: (e) => {
      const dy = e.changedTouches[0].clientY - startY.current
      if (el.current) {
        el.current.style.transition = 'transform .2s ease, opacity .2s ease'
      }
      if (dy > threshold) {
        onDismiss()
      } else if (el.current) {
        el.current.style.transform = ''
        el.current.style.opacity   = ''
      }
    },
  }

  return { ref: el, handlers }
}
