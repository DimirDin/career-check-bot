import { getProgress } from '../utils/xpLevels'

/**
 * XP progress bar — shows current level, XP, and progress to next level.
 * @param {{ xp: number, lang?: string }} props
 */
export function XPBar({ xp = 0, lang = 'ru' }) {
  const { current, next, percent } = getProgress(xp)
  const levelName = lang === 'ru' ? current.name : current.nameEn

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 16px',
      background: 'rgba(124,58,237,0.08)',
      border: '1px solid rgba(124,58,237,0.15)',
      borderRadius: 12, marginBottom: 16,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', whiteSpace: 'nowrap' }}>
        Ур.{current.level}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{
          height: 6, background: 'rgba(255,255,255,0.1)',
          borderRadius: 3, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #6C5CE7, #00d4aa)',
            borderRadius: 3,
            transition: 'width 0.6s ease',
          }} />
        </div>
      </div>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap' }}>
        {levelName}
      </span>
      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
        {xp}{next ? `/${next.minXP}` : ''} XP
      </span>
    </div>
  )
}
