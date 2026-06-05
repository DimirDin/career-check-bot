/**
 * RadarChart — SVG-радар для Big Five и RIASEC.
 * V5: tap по точке показывает tooltip с названием и значением.
 */

import { useState } from 'react'
import { useTelegram } from '../hooks/useTelegram'

const TRAIT_FULL = {
  O: 'Открытость к опыту',
  C: 'Сознательность',
  E: 'Экстраверсия',
  A: 'Доброжелательность',
  S: 'Эмоц. стабильность',
  R: 'Реалистичный',
  I: 'Исследовательский',
  A2: 'Артистичный',
}

export function RadarChart({ values, labels, color, size = 200, interactive = false }) {
  const [activeIdx, setActiveIdx] = useState(null)
  const { haptic } = useTelegram()

  const N  = labels.length
  const cx = size / 2
  const cy = size / 2
  const r  = size * 0.38

  const angle = (i) => (Math.PI * 2 * i) / N - Math.PI / 2
  const point = (val, i) => {
    const a = angle(i)
    const dist = (val / 100) * r
    return [cx + dist * Math.cos(a), cy + dist * Math.sin(a)]
  }
  const labelPos = (i) => {
    const a = angle(i)
    return [cx + (r + 22) * Math.cos(a), cy + (r + 22) * Math.sin(a)]
  }

  const gridLevels   = [20, 40, 60, 80, 100]
  const dataPoints   = Array.from({ length: N }, (_, i) => point(values[i] ?? 0, i))
  const polygonPoints = dataPoints.map(([x, y]) => `${x},${y}`).join(' ')

  const gridPolygon = (level) =>
    Array.from({ length: N }, (_, i) => {
      const [x, y] = point(level, i)
      return `${x},${y}`
    }).join(' ')

  function handleDotClick(i) {
    if (!interactive) return
    haptic.selection?.()
    setActiveIdx(activeIdx === i ? null : i)
  }

  const active = activeIdx !== null ? {
    label: labels[activeIdx],
    value: values[activeIdx] ?? 0,
    full:  TRAIT_FULL[labels[activeIdx]] || labels[activeIdx],
    pos:   labelPos(activeIdx),
  } : null

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg
        width={size} height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
        onClick={() => interactive && setActiveIdx(null)}
      >
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
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
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
          <circle
            key={i}
            cx={x} cy={y}
            r={activeIdx === i ? 5.5 : 3.5}
            fill={activeIdx === i ? '#fff' : color}
            stroke={activeIdx === i ? color : 'none'}
            strokeWidth="1.5"
            style={{
              cursor: interactive ? 'pointer' : 'default',
              transition: 'r 0.15s',
            }}
            onClick={(e) => { e.stopPropagation(); handleDotClick(i) }}
          />
        ))}
        {/* Labels */}
        {labels.map((lbl, i) => {
          const [x, y] = labelPos(i)
          return (
            <text
              key={i} x={x} y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
              fontFamily="inherit"
              fill={activeIdx === i ? '#fff' : 'rgba(255,255,255,0.6)'}
              style={{ cursor: interactive ? 'pointer' : 'default' }}
              onClick={(e) => { e.stopPropagation(); handleDotClick(i) }}
            >
              {lbl}
            </text>
          )
        })}
      </svg>

      {/* Tooltip */}
      {active && interactive && (
        <div
          className="radar-tooltip"
          style={{
            left: active.pos[0] - size / 2,
            top:  active.pos[1] - size / 2 - 52,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div className="radar-tooltip-label">{active.full || active.label}</div>
          <div className="radar-tooltip-val">{active.value}%</div>
        </div>
      )}
    </div>
  )
}
