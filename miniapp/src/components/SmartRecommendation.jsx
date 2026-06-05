import { IconArrow } from './Icon'
import styles from '../styles/MenuPage.module.css'

const T = {
  ru: { header: '🎯 Рекомендация дня', based: 'На основе вашего профиля', btn: 'Подробнее о профессии →' },
  en: { header: '🎯 Daily recommendation', based: 'Based on your profile', btn: 'Learn more →' },
  hi: { header: '🎯 आज की सिफारिश', based: 'आपके प्रोफ़ाइल के आधार पर', btn: 'अधिक जानें →' },
  es: { header: '🎯 Recomendación del día', based: 'Basado en tu perfil', btn: 'Más sobre la profesión →' },
  pt: { header: '🎯 Recomendação do dia', based: 'Baseado no seu perfil', btn: 'Saiba mais →' },
}

/**
 * @param {{ profession: {name:string, match:number, id:string}, language: string, onClick: ()=>void, haptic: object }} props
 */
export function SmartRecommendation({ profession, language, onClick, haptic }) {
  const t = T[language] || T.ru

  const matchColor = profession.match >= 75
    ? 'var(--accent-green)'
    : profession.match >= 50
      ? 'var(--accent-gold)'
      : 'var(--accent-orange)'

  return (
    <div className={styles.smartRec}>
      <div className={styles.smartRecHeader}>{t.header}</div>
      <p className={styles.smartRecBased}>{t.based}</p>
      <p className={styles.smartRecProfession}>{profession.name}</p>
      <p className={styles.smartRecMatch} style={{ color: matchColor }}>
        {profession.match}%
      </p>
      <button
        className={styles.smartRecButton}
        onClick={() => { haptic?.medium?.(); onClick() }}
      >
        {t.btn}
      </button>
    </div>
  )
}
