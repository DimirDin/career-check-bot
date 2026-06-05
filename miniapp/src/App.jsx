import { useState, useEffect, useCallback } from 'react'
import { useTelegram }       from './hooks/useTelegram'
import { NavigationContext } from './context/NavigationContext'
import { WelcomePage }       from './pages/WelcomePage'
import { QuizPage }          from './pages/QuizPage'
import { ResultsPage }       from './pages/ResultsPage'
import { MenuPage }          from './pages/MenuPage'
import { Onboarding }        from './components/Onboarding'
import { SplashScreen }      from './components/SplashScreen'
import { HistoryPage }       from './pages/HistoryPage'
import { QuickTestPage }     from './pages/QuickTestPage'
import { QuickResultsPage }  from './pages/QuickResultsPage'
import { ComparisonPage }    from './pages/ComparisonPage'
import { QuizLoadingSkeleton, ResultsLoadingSkeleton } from './components/Skeleton'
import { AIChatPage }           from './pages/AIChatPage'
import { SettingsPage }         from './pages/SettingsPage'
import { ProfessionsPage }      from './pages/ProfessionsPage'
import { ProfessionDetailPage } from './pages/ProfessionDetailPage'
import { PremiumPromoPage }     from './pages/PremiumPromoPage'
import { StarField }            from './components/StarField'
import { AuroraStreak }         from './components/AuroraStreak'
import { track }                from './hooks/useAnalytics'
import './styles.css'

const SCREEN = {
  SPLASH:       'splash',
  LOADING:      'loading',
  MENU:         'menu',
  WELCOME:      'welcome',
  ONBOARDING:   'onboarding',
  QUIZ:         'quiz',
  SAVING:       'saving',
  RESULTS:      'results',
  HISTORY:      'history',
  QUICK_TEST:   'quick_test',
  QUICK_RESULTS:'quick_results',
  COMPARISON:   'comparison',
  AI_CHAT:        'ai_chat',
  SETTINGS:       'settings',
  PROFESSIONS:    'professions',
  PROF_DETAIL:    'prof_detail',
  COMING_SOON:    'coming_soon',
  PREMIUM_PROMO:  'premium_promo',
  ERROR:        'error',
}

const QUESTIONS_CACHE_TTL = 3600 * 1000

function getCachedQuestions(lang) {
  try {
    const raw = sessionStorage.getItem(`cc_q_${lang}`)
    if (!raw) return null
    const { questions, ts } = JSON.parse(raw)
    if (Date.now() - ts > QUESTIONS_CACHE_TTL) return null
    return questions
  } catch { return null }
}

function setCachedQuestions(lang, questions) {
  try {
    sessionStorage.setItem(`cc_q_${lang}`, JSON.stringify({ questions, ts: Date.now() }))
  } catch {}
}

// Маршруты → экраны
const ROUTE_MAP = {
  '/menu':        SCREEN.MENU,
  '/test':        SCREEN.QUIZ,
  '/results':     SCREEN.RESULTS,
  '/welcome':     SCREEN.WELCOME,
  '/premium':     SCREEN.PREMIUM_PROMO,
  '/professions': SCREEN.COMING_SOON,
  '/history':     SCREEN.HISTORY,
  '/ai-chat':     SCREEN.AI_CHAT,
  '/settings':    SCREEN.SETTINGS,
  '/professions': SCREEN.PROFESSIONS,
  '/settings':    SCREEN.COMING_SOON,
  '/support':     SCREEN.COMING_SOON,
}

export default function App() {
  const { user, initData, haptic, tg } = useTelegram()
  const [screen,           setScreen]           = useState(SCREEN.SPLASH)
  const [route,            setRoute]            = useState('/menu')
  const [quickResults,     setQuickResults]     = useState(null)
  const [compareHash,      setCompareHash]      = useState(null)
  const [selectedProfTitle,setSelectedProfTitle]= useState(null)
  const [questions, setQuestions] = useState([])
  const [results,   setResults]   = useState(null)
  const [error,     setError]     = useState(null)
  const [liquidActive, setLiquidActive] = useState(false)
  const lang = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'

  // ── Навигация ────────────────────────────────────────────────────────────
  const navigate = useCallback((path) => {
    if (path === '/test') {
      // Сбрасываем старый прогресс чтобы не начинать с прерванного места
      localStorage.removeItem('cc_progress')
      if (!localStorage.getItem('cc_onboarding_done')) {
        setRoute('/test')
        setScreen(SCREEN.ONBOARDING)
        return
      }
    }
    const base = '/' + path.replace(/^\//, '').split('/')[0]
    const target = ROUTE_MAP[path] || ROUTE_MAP[base] || SCREEN.COMING_SOON

    // Aurora Streak — мгновенная смена экрана + декоративный луч
    setRoute(path)
    setScreen(target)
    setLiquidActive(true)
    setTimeout(() => setLiquidActive(false), 400)
  }, []) // eslint-disable-line

  // ── Инициализация ────────────────────────────────────────────────────────
  const initApp = useCallback(async () => {
    try {
      // F2: sessionStorage cache (TTL 1h)
      const cached = getCachedQuestions(lang)
      if (cached) {
        setQuestions(cached)
      } else {
        const res = await fetch(`/api/questions?lang=${lang}`)
        if (!res.ok) throw new Error('Failed to load questions')
        const data = await res.json()
        setQuestions(data.questions)
        setCachedQuestions(lang, data.questions)
      }

      // Если есть initData — проверяем наличие результатов
      if (user && initData) {
        const rRes = await fetch(`/api/results/${user.id}?init_data=${encodeURIComponent(initData)}`)
        if (rRes.ok) {
          const rData = await rRes.json()
          setResults(rData)
        }
      }

      // N2: обрабатываем start_param для comparison
      const startParam = tg?.initDataUnsafe?.start_param || ''
      if (startParam.startsWith('compare_')) {
        setCompareHash(startParam.replace('compare_', ''))
        setScreen(SCREEN.COMPARISON)
      } else {
        setScreen(SCREEN.MENU)
      }
    } catch (e) {
      setError(e.message)
      setScreen(SCREEN.ERROR)
    }
  }, [user, initData, lang])

  useEffect(() => { track('app_open') }, [])
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
      case SCREEN.SPLASH:
        return <SplashScreen onDone={() => setScreen(SCREEN.LOADING)} />
      case SCREEN.LOADING:
        return <QuizLoadingSkeleton />
      case SCREEN.SAVING:
        return <SavingScreen />
      case SCREEN.ERROR:
        return <ErrorScreen message={error} onRetry={initApp} />
      case SCREEN.MENU:
        return <MenuPage />
      case SCREEN.WELCOME:
        return <WelcomePage onStart={() => navigate('/test')} />
      case SCREEN.ONBOARDING:
        return (
          <Onboarding onDone={() => {
            localStorage.setItem('cc_onboarding_done', '1')
            setScreen(SCREEN.QUIZ)
          }} />
        )
      case SCREEN.QUIZ:
        return (
          <QuizPage
            questions={questions}
            onFinish={handleFinish}
          />
        )
      case SCREEN.RESULTS:
        if (!results?.normalized_scores) {
          // Результаты ещё не загружены — грузим из API
          if (user && initData) {
            fetch(`/api/results/${user.id}?init_data=${encodeURIComponent(initData)}`)
              .then(r => r.ok ? r.json() : null)
              .then(d => d && setResults(d))
              .catch(() => {})
          }
          return <ResultsLoadingSkeleton />
        }
        return (
          <ResultsPage
            results={results}
            onBack={() => navigate('/menu')}
          />
        )
      case SCREEN.QUICK_TEST:
        return (
          <QuickTestPage
            onFinish={async (answers) => {
              setScreen(SCREEN.SAVING)
              try {
                const res = await fetch('/api/quick-test/results', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ init_data: initData, answers, lang }),
                })
                const data = await res.json()
                setQuickResults(data)
                setScreen(SCREEN.QUICK_RESULTS)
              } catch {
                setScreen(SCREEN.QUICK_TEST)
              }
            }}
            onBack={() => navigate('/menu')}
          />
        )
      case SCREEN.QUICK_RESULTS:
        return (
          <QuickResultsPage
            results={quickResults}
            onFullTest={() => navigate('/test')}
            onBack={() => navigate('/menu')}
          />
        )
      case SCREEN.COMPARISON:
        return (
          <ComparisonPage
            hashCode={compareHash}
            myResults={results}
            onStartTest={() => navigate('/test')}
            onBack={() => navigate('/menu')}
          />
        )
      case SCREEN.AI_CHAT:
        return <AIChatPage onBack={() => navigate('/results')} />
      case SCREEN.SETTINGS:
        return <SettingsPage onBack={() => navigate('/menu')} />
      case SCREEN.PROFESSIONS:
        return (
          <ProfessionsPage
            userResults={results}
            onBack={() => navigate('/menu')}
            onSelectProfession={(title) => {
              setSelectedProfTitle(title)
              setScreen(SCREEN.PROF_DETAIL)
            }}
          />
        )
      case SCREEN.PROF_DETAIL:
        return (
          <ProfessionDetailPage
            professionTitle={selectedProfTitle}
            userResults={results}
            onBack={() => setScreen(SCREEN.PROFESSIONS)}
          />
        )
      case SCREEN.HISTORY:
        return (
          <HistoryPage
            lastResult={results}
            historyCount={results ? 1 : 0}
            onBack={() => navigate('/menu')}
            onStartTest={() => navigate('/test')}
          />
        )
      case SCREEN.PREMIUM_PROMO:
        return (
          <PremiumPromoPage
            onBack={() => navigate('/menu')}
            onBuy={() => navigate('/results')}
          />
        )
      case SCREEN.COMING_SOON:
        return <ComingSoonScreen route={route} onBack={() => navigate('/menu')} tg={tg} />
      default:
        return <LoadingScreen text="..." />
    }
  }

  // V3: экраны без transition-анимации (у них своя)
  const NO_TRANSITION = [SCREEN.SPLASH, SCREEN.QUIZ, SCREEN.QUICK_TEST]
  const transitionKey = NO_TRANSITION.includes(screen) ? undefined : screen

  return (
    <NavigationContext.Provider value={{ navigate, current: route }}>
      <StarField count={55} />
      <AuroraStreak active={liquidActive} />
      <div key={transitionKey} className={transitionKey ? 'screen-enter' : undefined} style={{ position: 'relative', zIndex: 1, display: 'contents' }}>
        {renderScreen()}
      </div>
    </NavigationContext.Provider>
  )
}

// ── Вспомогательные компоненты ────────────────────────────────────────────

function SavingScreen() {
  return (
    <div className="saving-screen">
      <ResultsLoadingSkeleton />
      <p className="saving-label">Считаем результаты…</p>
    </div>
  )
}

function ErrorScreen({ message, onRetry }) {
  const isNetwork = !message || /fetch|Failed|network|соединени/i.test(message)
  const icon  = isNetwork ? '📡' : '⚠️'
  const title = isNetwork ? 'Нет соединения' : 'Что-то пошло не так'
  const desc  = isNetwork
    ? 'Проверь интернет и попробуй снова'
    : message
  return (
    <div className="error-screen">
      <div className="error-icon">{icon}</div>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{title}</h3>
      <p className="error-text">{desc}</p>
      <button className="btn-retry" onClick={onRetry}>Попробовать снова</button>
    </div>
  )
}

const COMING_LABELS = {
  '/premium':     { emoji: '⭐', title: 'Premium PDF', sub: 'Сначала пройдите тест — Premium PDF строится на ваших результатах' },
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
