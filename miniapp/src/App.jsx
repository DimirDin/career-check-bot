import { useState, useEffect, useCallback } from 'react'
import { useTelegram }       from './hooks/useTelegram'
import { NavigationContext } from './context/NavigationContext'
import { WelcomePage }       from './pages/WelcomePage'
import { QuizPage }          from './pages/QuizPage'
import { ResultsPage }       from './pages/ResultsPage'
import { MenuPage }          from './pages/MenuPage'
import './styles.css'

const SCREEN = {
  LOADING:      'loading',
  MENU:         'menu',
  WELCOME:      'welcome',
  QUIZ:         'quiz',
  SAVING:       'saving',
  RESULTS:      'results',
  COMING_SOON:  'coming_soon',
  ERROR:        'error',
}

// Маршруты → экраны
const ROUTE_MAP = {
  '/menu':        SCREEN.MENU,
  '/test':        SCREEN.QUIZ,
  '/results':     SCREEN.RESULTS,
  '/welcome':     SCREEN.WELCOME,
  '/premium':     SCREEN.COMING_SOON,
  '/professions': SCREEN.COMING_SOON,
  '/history':     SCREEN.COMING_SOON,
  '/settings':    SCREEN.COMING_SOON,
  '/support':     SCREEN.COMING_SOON,
}

export default function App() {
  const { user, initData, haptic, tg } = useTelegram()
  const [screen,    setScreen]    = useState(SCREEN.LOADING)
  const [route,     setRoute]     = useState('/menu')
  const [questions, setQuestions] = useState([])
  const [results,   setResults]   = useState(null)
  const [error,     setError]     = useState(null)
  const lang = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'

  // ── Навигация ────────────────────────────────────────────────────────────
  const navigate = useCallback((path) => {
    // Извлекаем базовый путь без параметров (/profession/123 → /profession)
    const base = '/' + path.replace(/^\//, '').split('/')[0]
    const target = ROUTE_MAP[path] || ROUTE_MAP[base] || SCREEN.COMING_SOON
    setRoute(path)
    setScreen(target)
  }, [])

  // ── Инициализация ────────────────────────────────────────────────────────
  const initApp = useCallback(async () => {
    try {
      const res = await fetch(`/api/questions?lang=${lang}`)
      if (!res.ok) throw new Error('Failed to load questions')
      const data = await res.json()
      setQuestions(data.questions)

      // Если есть initData — проверяем наличие результатов
      if (user && initData) {
        const rRes = await fetch(`/api/results/${user.id}?init_data=${encodeURIComponent(initData)}`)
        if (rRes.ok) {
          const rData = await rRes.json()
          setResults(rData)
        }
      }

      // Всегда показываем меню — оно само разберётся со статусом
      setScreen(SCREEN.MENU)
    } catch (e) {
      setError(e.message)
      setScreen(SCREEN.ERROR)
    }
  }, [user, initData, lang])

  useEffect(() => { initApp() }, [initApp])

  // ── Сохранение результатов теста ─────────────────────────────────────────
  async function handleFinish(answers) {
    setScreen(SCREEN.SAVING)
    try {
      const res = await fetch('/api/results/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData, answers, lang }),
      })
      if (!res.ok) throw new Error('Save error')
      const data = await res.json()
      setResults(data)
      setRoute('/results')
      setScreen(SCREEN.RESULTS)
    } catch (e) {
      setError(e.message)
      setScreen(SCREEN.ERROR)
    }
  }

  // ── Рендер ───────────────────────────────────────────────────────────────
  const renderScreen = () => {
    switch (screen) {
      case SCREEN.LOADING:
        return <LoadingScreen text="Загрузка..." />
      case SCREEN.SAVING:
        return <LoadingScreen text="Считаем результаты..." />
      case SCREEN.ERROR:
        return <ErrorScreen message={error} onRetry={initApp} />
      case SCREEN.MENU:
        return <MenuPage />
      case SCREEN.WELCOME:
        return <WelcomePage onStart={() => navigate('/test')} />
      case SCREEN.QUIZ:
        return (
          <QuizPage
            questions={questions}
            onFinish={handleFinish}
          />
        )
      case SCREEN.RESULTS:
        return (
          <ResultsPage
            results={results}
            onBack={() => navigate('/menu')}
          />
        )
      case SCREEN.COMING_SOON:
        return <ComingSoonScreen route={route} onBack={() => navigate('/menu')} tg={tg} />
      default:
        return <LoadingScreen text="..." />
    }
  }

  return (
    <NavigationContext.Provider value={{ navigate, current: route }}>
      {renderScreen()}
    </NavigationContext.Provider>
  )
}

// ── Вспомогательные компоненты ────────────────────────────────────────────

function LoadingScreen({ text }) {
  return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p className="loading-text">{text}</p>
    </div>
  )
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="error-screen">
      <div className="error-icon">⚠️</div>
      <p className="error-text">{message || 'Что-то пошло не так'}</p>
      <button className="btn-retry" onClick={onRetry}>Попробовать снова</button>
    </div>
  )
}

const COMING_LABELS = {
  '/premium':     { emoji: '⭐', title: 'Premium PDF', sub: 'Купить Premium PDF за 99 Stars можно в боте @CareerCheck_Bot' },
  '/professions': { emoji: '📚', title: 'Каталог профессий', sub: 'Скоро — 30+ профессий с детальным описанием' },
  '/history':     { emoji: '🔄', title: 'История тестов', sub: 'Скоро — все ваши прохождения в одном месте' },
  '/settings':    { emoji: '⚙️', title: 'Настройки', sub: 'Скоро — язык, уведомления, профиль' },
  '/support':     { emoji: '❓', title: 'Помощь', sub: 'По всем вопросам: @CareerCheckSupport' },
}

function ComingSoonScreen({ route, onBack, tg }) {
  const info = COMING_LABELS[route] || { emoji: '🚀', title: 'Скоро', sub: 'В разработке' }

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  return (
    <div style={{
      minHeight: '100dvh', background: '#0d0f1a', color: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '24px', textAlign: 'center', gap: '16px',
    }}>
      <div style={{ fontSize: 52 }}>{info.emoji}</div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{info.title}</h2>
      <p style={{ margin: 0, fontSize: 15, color: 'rgba(255,255,255,0.6)', maxWidth: 280, lineHeight: 1.6 }}>{info.sub}</p>
      <button
        onClick={onBack}
        style={{
          marginTop: 8, background: '#7347e6', border: 'none', borderRadius: 12,
          padding: '13px 28px', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
        }}
      >
        ← Назад
      </button>
    </div>
  )
}
