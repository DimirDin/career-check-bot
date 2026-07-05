/**
 * AchievementsCard — сетка 3×2 достижений на ProfilePage.
 */

const ACHIEVEMENTS = [
  { id: 'first_test', icon: '🎯', label: 'Первый тест',    labelEn: 'First test',     condition: u => u?.testCompleted  },
  { id: 'catalog',    icon: '📚', label: 'Изучил каталог', labelEn: 'Explored catalog', condition: u => u?.catalogViewed },
]

/**
 * @param {{ userData: object, lang?: string }} props
 */
export function AchievementsCard({ userData = {}, lang = 'ru' }) {
  const isRu = lang === 'ru'

  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)',
        marginBottom: 10,
      }}>
        {isRu ? 'Достижения' : 'Achievements'}
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8,
      }}>
        {ACHIEVEMENTS.map(a => {
          const unlocked = !!a.condition(userData)
          return (
            <div key={a.id} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 4, padding: '10px 6px',
              borderRadius: 12,
              border: unlocked
                ? '1px solid rgba(108,92,231,0.4)'
                : '1px solid rgba(255,255,255,0.08)',
              background: unlocked
                ? 'rgba(108,92,231,0.1)'
                : 'rgba(255,255,255,0.03)',
              opacity: unlocked ? 1 : 0.35,
              filter: unlocked ? 'none' : 'grayscale(1)',
              transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: 22 }}>{a.icon}</span>
              <span style={{
                fontSize: 10, textAlign: 'center',
                color: 'rgba(255,255,255,0.6)', lineHeight: 1.2,
              }}>
                {isRu ? a.label : a.labelEn}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
