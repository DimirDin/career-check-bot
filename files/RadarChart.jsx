/**
 * RadarChart — SVG-радар для Big Five и RIASEC.
 * Чистый SVG, без зависимостей.
 */

export function RadarChart({ values, labels, color, size = 200 }) {
  const N = labels.length
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38

  const angle = (i) => (Math.PI * 2 * i) / N - Math.PI / 2

  const point = (val, i) => {
    const a = angle(i)
    const dist = (val / 100) * r
    return [cx + dist * Math.cos(a), cy + dist * Math.sin(a)]
  }

  const gridLevels = [20, 40, 60, 80, 100]

  const gridPolygon = (level) => {
    return Array.from({ length: N }, (_, i) => {
      const [x, y] = point(level, i)
      return `${x},${y}`
    }).join(' ')
  }

  const dataPoints = Array.from({ length: N }, (_, i) => point(values[i] ?? 0, i))
  const polygonPoints = dataPoints.map(([x, y]) => `${x},${y}`).join(' ')

  const labelPos = (i) => {
    const a = angle(i)
    const dist = r + 22
    return [cx + dist * Math.cos(a), cy + dist * Math.sin(a)]
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Grid */}
      {gridLevels.map(lvl => (
        <polygon
          key={lvl}
          points={gridPolygon(lvl)}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="0.8"
        />
      ))}

      {/* Spokes */}
      {Array.from({ length: N }, (_, i) => {
        const [x, y] = point(100, i)
        return (
          <line
            key={i}
            x1={cx} y1={cy} x2={x} y2={y}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.8"
          />
        )
      })}

      {/* Data fill */}
      <polygon
        points={polygonPoints}
        fill={color}
        fillOpacity="0.18"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Dots */}
      {dataPoints.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill={color} />
      ))}

      {/* Labels */}
      {labels.map((lbl, i) => {
        const [x, y] = labelPos(i)
        return (
          <text
            key={i}
            x={x} y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="10"
            fontFamily="inherit"
            fill="rgba(255,255,255,0.6)"
          >
            {lbl}
          </text>
        )
      })}
    </svg>
  )
}
