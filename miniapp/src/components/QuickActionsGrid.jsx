import { IconChart, IconStar, IconBook, IconHistory } from './Icon'
import styles from '../styles/MenuPage.module.css'

const T = {
  ru: { results: 'Мои результаты', premium: 'Premium PDF', professions: 'Профессии', history: 'История' },
  en: { results: 'My Results', premium: 'Premium PDF', professions: 'Professions', history: 'History' },
  hi: { results: 'मेरे परिणाम', premium: 'Premium PDF', professions: 'व्यवसाय', history: 'इतिहास' },
  es: { results: 'Mis resultados', premium: 'PDF Premium', professions: 'Profesiones', history: 'Historial' },
  pt: { results: 'Meus resultados', premium: 'PDF Premium', professions: 'Profissões', history: 'Histórico' },
}

/**
 * @param {{ userState: import('../hooks/useUserState').UserState, onResults:()=>void, onPremium:()=>void, onProfessions:()=>void, onHistory:()=>void, haptic: object }} props
 */
export function QuickActionsGrid({ userState, onResults, onPremium, onProfessions, onHistory, haptic }) {
  const t = T[userState.language] || T.ru

  const cards = [
    { icon: <IconChart size={24} color="var(--accent-cyan)" />,   label: t.results,     badge: null,     onClick: onResults,     color: 'cyan'   },
    { icon: <IconStar  size={24} color="var(--accent-gold)" />,   label: t.premium,     badge: '99 ⭐',  onClick: onPremium,     color: 'gold'   },
    { icon: <IconBook  size={24} color="var(--accent-purple)" />, label: t.professions, badge: '30+',    onClick: onProfessions, color: 'purple' },
    { icon: <IconHistory size={24} color="var(--accent-green)" />,label: t.history,     badge: userState.historyCount > 0 ? String(userState.historyCount) : null, onClick: onHistory, color: 'green' },
  ]

  const colorMap = {
    cyan:   'rgba(45,209,242,0.2)',
    gold:   'rgba(255,217,77,0.2)',
    purple: 'rgba(115,71,230,0.2)',
    green:  'rgba(63,217,143,0.2)',
  }

  return (
    <div className={styles.quickGrid}>
      {cards.map(({ icon, label, badge, onClick, color }, i) => (
        <div
          key={i}
          className={`${styles.quickCard} ${color === 'gold' ? 'card-holo' : ''}`}
          style={{ '--card-delay': `${(i + 1) * 0.08}s` }}
          onClick={() => { haptic?.medium?.(); onClick() }}
        >
          <div className={styles.quickIconWrap} style={{ background: colorMap[color] }}>
            {icon}
          </div>
          <span className={styles.quickLabel}>{label}</span>
          {badge && (
            <span
              className={styles.quickBadge}
              style={{ background: color === 'gold' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.15)', color: color === 'gold' ? '#000' : 'var(--text-primary)' }}
            >
              {badge}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
