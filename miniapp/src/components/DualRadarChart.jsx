/**
 * DualRadarChart — два профиля на одном SVG.
 * Цвет A: cyan (#2ed1f2), цвет B: orange (#f59e0b).
 */

export function DualRadarChart({ valuesA, valuesB, labels, size = 200 }) {
  const N  = labels.length
  const cx = size / 2
  const cy = size / 2
  const r  = size * 0.38

  const angle = (i) => (Math.PI * 2 * i) / N - Math.PI / 2
  const point = (val, i) => {
    const a = angle(i)
    return [cx + (val / 100) * r * Math.cos(a), cy + (val / 100) * r * Math.sin(a)]
  }
  const labelPos = (i) => {
    const a = angle(i)
    return [cx + (r + 22) * Math.cos(a), cy + (r + 22) * Math.sin(a)]
  }
  const gridPolygon = (level) =>
    Array.from({ length: N }, (_, i) => {
      const [x, y] = point(level, i)
      return `${x},${y}`
    }).join(' ')

  const ptsA = Array.from({ length: N }, (_, i) => point(valuesA[i] ?? 0, i))
  const ptsB = Array.from({ length: N }, (_, i) => point(valuesB[i] ?? 0, i))
  const polyA = ptsA.map(([x, y]) => `${x},${y}`).join(' ')
  const polyB = ptsB.map(([x, y]) => `${x},${y}`).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {[20, 40, 60, 80, 100].map(lvl => (
        <polygon key={lvl} points={gridPolygon(lvl)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
      ))}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = point(100, i)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
      })}
      {/* Profile A (you) */}
      <polygon points={polyA} fill="#2ed1f2" fillOpacity="0.15" stroke="#2ed1f2" strokeWidth="2" strokeLinejoin="round" />
      {ptsA.map(([x, y], i) => <circle key={`a${i}`} cx={x} cy={y} r="3" fill="#2ed1f2" />)}
      {/* Profile B (friend) */}
      <polygon points={polyB} fill="#f59e0b" fillOpacity="0.15" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" strokeDasharray="5 3" />
      {ptsB.map(([x, y], i) => <circle key={`b${i}`} cx={x} cy={y} r="3" fill="#f59e0b" />)}
      {/* Labels */}
      {labels.map((lbl, i) => {
        const [x, y] = labelPos(i)
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="10" fontFamily="inherit" fill="rgba(255,255,255,0.55)">
            {lbl}
          </text>
        )
      })}
    </svg>
  )
}
