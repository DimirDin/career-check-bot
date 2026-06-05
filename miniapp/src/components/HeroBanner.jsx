import { formatDate } from '../utils/formatDate'
import { ProgressBar } from './ProgressBar'
import styles from '../styles/MenuPage.module.css'

const T = {
  ru: {
    newTitle:       'Добро пожаловать! 👋',
    newSub:         'Пройдите тест, чтобы узнать свои сильные стороны',
    newBtn:         'Начать тест',
    progressTitle:  (n) => `Вы на вопросе ${n} / 60`,
    progressSub:    'Тест в процессе',
    progressBtn:    'Продолжить',
    doneTitle:      (d) => `Тест пройден: ${d}`,
    doneSub:        'Результаты готовы',
    doneBtn:        'Посмотреть результаты',
    premiumTitle:   '⭐ Premium активен',
    premiumSub:     'Ваш персональный AI-отчёт готов',
    premiumBtn:     'Открыть PDF',
  },
  en: {
    newTitle:       'Welcome! 👋',
    newSub:         'Take the test to discover your strengths',
    newBtn:         'Start Test',
    progressTitle:  (n) => `You are on question ${n} / 60`,
    progressSub:    'Test in progress',
    progressBtn:    'Continue',
    doneTitle:      (d) => `Test completed: ${d}`,
    doneSub:        'Your results are ready',
    doneBtn:        'View Results',
    premiumTitle:   '⭐ Premium active',
    premiumSub:     'Your personal AI report is ready',
    premiumBtn:     'Open PDF',
  },
  hi: {
    newTitle:       'स्वागत है! 👋',
    newSub:         'अपनी ताकत जानने के लिए परीक्षण लें',
    newBtn:         'परीक्षण शुरू करें',
    progressTitle:  (n) => `आप प्रश्न ${n} / 60 पर हैं`,
    progressSub:    'परीक्षण जारी है',
    progressBtn:    'जारी रखें',
    doneTitle:      (d) => `परीक्षण पूर्ण: ${d}`,
    doneSub:        'परिणाम तैयार हैं',
    doneBtn:        'परिणाम देखें',
    premiumTitle:   '⭐ Premium सक्रिय',
    premiumSub:     'आपकी AI रिपोर्ट तैयार है',
    premiumBtn:     'PDF खोलें',
  },
  es: {
    newTitle:       '¡Bienvenido! 👋',
    newSub:         'Haz el test para conocer tus fortalezas',
    newBtn:         'Iniciar test',
    progressTitle:  (n) => `Estás en la pregunta ${n} / 60`,
    progressSub:    'Test en progreso',
    progressBtn:    'Continuar',
    doneTitle:      (d) => `Test completado: ${d}`,
    doneSub:        'Tus resultados están listos',
    doneBtn:        'Ver resultados',
    premiumTitle:   '⭐ Premium activo',
    premiumSub:     'Tu informe AI personal está listo',
    premiumBtn:     'Abrir PDF',
  },
  pt: {
    newTitle:       'Bem-vindo! 👋',
    newSub:         'Faça o teste para descobrir seus pontos fortes',
    newBtn:         'Iniciar teste',
    progressTitle:  (n) => `Você está na questão ${n} / 60`,
    progressSub:    'Teste em andamento',
    progressBtn:    'Continuar',
    doneTitle:      (d) => `Teste concluído: ${d}`,
    doneSub:        'Seus resultados estão prontos',
    doneBtn:        'Ver resultados',
    premiumTitle:   '⭐ Premium ativo',
    premiumSub:     'Seu relatório AI pessoal está pronto',
    premiumBtn:     'Abrir PDF',
  },
}

/**
 * @param {{ userState: import('../hooks/useUserState').UserState, onStartTest:()=>void, onContinueTest:()=>void, onViewResults:()=>void, onOpenPremium:()=>void }} props
 */
export function HeroBanner({ userState, onStartTest, onContinueTest, onViewResults, onOpenPremium }) {
  const t   = T[userState.language] || T.ru
  const date = formatDate(userState.lastResultDate, userState.language)

  let title, subtitle, btnText, onClick

  // Тест пройден и нет Premium — баннер не нужен (есть кнопка в QuickActionsGrid)
  if (userState.hasResults && !userState.hasPremium && !userState.testInProgress) {
    return null
  }

  if (userState.hasPremium) {
    title    = t.premiumTitle
    subtitle = t.premiumSub
    btnText  = t.premiumBtn
    onClick  = onOpenPremium
  } else if (userState.testInProgress) {
    title    = t.progressTitle(userState.currentQuestion)
    subtitle = t.progressSub
    btnText  = t.progressBtn
    onClick  = onContinueTest
  } else if (userState.hasResults) {
    title    = t.doneTitle(date)
    subtitle = t.doneSub
    btnText  = t.doneBtn
    onClick  = onViewResults
  } else {
    title    = t.newTitle
    subtitle = t.newSub
    btnText  = t.newBtn
    onClick  = onStartTest
  }

  return (
    <div className={styles.heroBanner}>
      <p className={styles.heroTitle}>{title}</p>
      <p className={styles.heroSubtitle}>{subtitle}</p>
      {userState.testInProgress && (
        <ProgressBar value={userState.currentQuestion} max={60} color="green" />
      )}
      <button className={styles.heroButton} onClick={onClick}>
        {btnText}
      </button>
    </div>
  )
}
