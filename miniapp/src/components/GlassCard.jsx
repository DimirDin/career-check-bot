/**
 * Базовая glassmorphism-карточка Aurora.
 * @param {{ children: React.ReactNode, className?: string, onClick?: ()=>void, glow?: 'purple'|'cyan'|'gold'|'green' }} props
 */
export function GlassCard({ children, className = '', onClick, glow }) {
  const glowMap = {
    purple: 'rgba(115,71,230,0.35)',
    cyan:   'rgba(45,209,242,0.35)',
    gold:   'rgba(255,217,77,0.35)',
    green:  'rgba(63,217,143,0.35)',
  }
  const borderColor = glow ? glowMap[glow] : 'rgba(255,255,255,0.1)'

  return (
    <div
      className={className}
      onClick={onClick}
      style={{ border: `1px solid ${borderColor}` }}
    >
      {children}
    </div>
  )
}
