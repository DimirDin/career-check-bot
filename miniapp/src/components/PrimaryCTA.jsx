import { IconBrain } from './Icon'
import { ProgressBar } from './ProgressBar'
import styles from '../styles/MenuPage.module.css'

const T = {
  ru: { title: 'Пройти тест личности', sub: '60 вопросов · Big Five · ~8 минут', btnNew: 'Начать', btnResume: 'Продолжить', btnRetake: 'Пройти снова' },
  en: { title: 'Take Personality Test', sub: '60 questions · Big Five · ~8 min', btnNew: 'Start', btnResume: 'Continue', btnRetake: 'Retake' },
  hi: { title: 'व्यक्तित्व परीक्षण लें', sub: '60 प्रश्न · Big Five · ~8 मिनट', btnNew: 'शुरू करें', btnResume: 'जारी रखें', btnRetake: 'दोबारा लें' },
  es: { title: 'Hacer test de personalidad', sub: '60 preguntas · Big Five · ~8 min', btnNew: 'Comenzar', btnResume: 'Continuar', btnRetake: 'Repetir' },
  pt: { title: 'Fazer teste de personalidade', sub: '60 questões · Big Five · ~8 min', btnNew: 'Começar', btnResume: 'Continuar', btnRetake: 'Refazer' },
}

/**
 * @param {{ userState: import('../hooks/useUserState').UserState, onClick: ()=>void }} props
 */
export function PrimaryCTA({ userState, onClick }) {
  const t = T[userState.language] || T.ru
  const { testInProgress, hasResults, currentQuestion } = userState

  const btnText = testInProgress ? t.btnResume : hasResults ? t.btnRetake : t.btnNew
  const isPulsing = !hasResults && !testInProgress

  return (
    <div className={`${styles.primaryCTA} ${isPulsing ? styles.pulseGlow : ''}`}>
      <IconBrain size={48} color="var(--accent-cyan)" className={styles.ctaIcon} />
      <p className={styles.ctaTitle}>{t.title}</p>
      <p className={styles.ctaSubtitle}>{t.sub}</p>
      {testInProgress && (
        <>
          <ProgressBar value={currentQuestion} max={60} color="green" />
          <p className={styles.ctaProgress}>{currentQuestion} / 60</p>
        </>
      )}
      <button className={styles.ctaButton} onClick={onClick}>
        {btnText}
      </button>
    </div>
  )
}
