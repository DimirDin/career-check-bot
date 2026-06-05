import { useRef } from 'react'

export function MagneticBtn({ children, strength = 0.18, className, style, onClick, disabled, ...props }) {
  const ref = useRef(null)

  const handleMove = (e) => {
    if (disabled || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const cx = rect.left + rect.width  / 2
    const cy = rect.top  + rect.height / 2
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const dx = (clientX - cx) * strength
    const dy = (clientY - cy) * strength
    ref.current.style.transform = `translate(${dx}px, ${dy}px)`
  }

  const handleLeave = () => {
    if (ref.current) ref.current.style.transform = 'translate(0,0)'
  }

  return (
    <button
      ref={ref}
      className={className}
      style={{ ...style, transition: 'transform .15s ease' }}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onTouchMove={handleMove}
      onTouchEnd={handleLeave}
      {...props}
    >
      {children}
    </button>
  )
}
