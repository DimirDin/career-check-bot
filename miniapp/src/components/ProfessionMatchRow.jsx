/**
 * ProfessionMatchRow — одна строка в списке топ-профессий на ResultsPage.
 */

const MEDAL_COLORS = ['#FFD700', '#8892A4', '#CD8F5A']
const MEDALS       = ['🥇', '🥈', '🥉']

/**
 * @param {{
 *   rank: number,
 *   title: string,
 *   match: number,
 *   riasec?: string,
 *   onClick: () => void,
 * }} props
 */
export function ProfessionMatchRow({ rank, title, match, riasec, onClick }) {
  const medalColor = MEDAL_COLORS[rank - 1] || 'rgba(255,255,255,0.5)'
  const medal      = MEDALS[rank - 1] || `${rank}.`

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <span style={{
        fontSize: 13, fontWeight: 800,
        width: 24, flexShrink: 0,
        color: medalColor,
      }}>
        {medal}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: '#fff',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {title}
        </div>
        {riasec && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {riasec}
          </div>
        )}
      </div>
      <div style={{
        fontSize: 15, fontWeight: 700, color: '#00d4aa',
        minWidth: 44, textAlign: 'right',
      }}>
        {match}%
      </div>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>›</span>
    </div>
  )
}
