import { useState, useEffect, useCallback, useRef } from 'react'
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
import { SettingsPage }         from './pages/SettingsPage'
import { ProfessionsPage }      from './pages/ProfessionsPage'
import { ProfessionDetailPage } from './pages/ProfessionDetailPage'
import { AdminPage }            from './pages/AdminPage'
import { StarField }            from './components/StarField'
import { AuroraStreak }         from './components/AuroraStreak'
import { BottomNav }            from './components/BottomNav/BottomNav'
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
  SETTINGS:       'settings',
  PROFESSIONS:    'professions',
  PROF_DETAIL:    'prof_detail',
  COMING_SOON:    'coming_soon',
  ADMIN:          'admin',
  TEST_HUB:       'test_hub',
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
  '/test-hub':    SCREEN.TEST_HUB,
  '/results':     SCREEN.RESULTS,
  '/welcome':     SCREEN.WELCOME,
  '/professions': SCREEN.PROFESSIONS,
  '/history':     SCREEN.HISTORY,
  '/settings':    SCREEN.SETTINGS,
  '/comparison':  SCREEN.COMPARISON,
  '/admin':       SCREEN.ADMIN,
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
  const [gateState, setGateState] = useState('checking') // checking | blocked | ok | error
  const [gateChannel, setGateChannel] = useState('@claudedry')
  const [gateRechecking, setGateRechecking] = useState(false)
  const lang = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const targetScreenRef = useRef(SCREEN.MENU)

  // ── Навигация ────────────────────────────────────────────────────────────
  const navigate = useCallback((path, opts = {}) => {
    if (path === '/test') {
      if (opts.fresh) {
        // Явный запрос начать заново — сбрасываем прогресс
        localStorage.removeItem('cc_progress')
      }
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

      // N2: обрабатываем start_param для comparison или deep-link
      const startParam = tg?.initDataUnsafe?.start_param || ''
      // Также проверяем query-параметр ?start=results (от кнопки бота)
      const urlStart = new URLSearchParams(window.location.search).get('start') || ''
      if (startParam.startsWith('compare_')) {
        setCompareHash(startParam.replace('compare_', ''))
        targetScreenRef.current = SCREEN.COMPARISON
      } else if (startParam === 'results' || urlStart === 'results') {
        targetScreenRef.current = SCREEN.RESULTS
      } else {
        targetScreenRef.current = SCREEN.MENU
      }
    } catch (e) {
      setError(e.message)
      targetScreenRef.current = SCREEN.ERROR
    }
  }, [user, initData, lang])

  useEffect(() => { track('app_open') }, [])

  // ── Гейт по подписке — доступ только у подписчиков gateChannel ────────────
  useEffect(() => {
    if (!user || !initData) {
      // Нет Telegram-контекста (локальная разработка) — не блокируем
      const t = setTimeout(() => setGateState(prev => prev === 'checking' ? 'ok' : prev), 3000)
      return () => clearTimeout(t)
    }
    fetch(`/api/gate/check?init_data=${encodeURIComponent(initData)}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => {
        setGateChannel(d.channel || '@claudedry')
        setGateState(d.subscribed ? 'ok' : 'blocked')
      })
      .catch(() => setGateState('error'))
  }, [user, initData])

  const recheckGate = useCallback(async () => {
    if (!initData || gateRechecking) return
    setGateRechecking(true)
    try {
      const res = await fetch('/api/gate/recheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData }),
      })
      const d = await res.json()
      setGateState(d.subscribed ? 'ok' : 'blocked')
    } catch {}
    setGateRechecking(false)
  }, [initData, gateRechecking])

  useEffect(() => { if (gateState === 'ok') initApp() }, [gateState]) // eslint-disable-line

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
        return <SplashScreen onDone={() => setScreen(targetScreenRef.current || SCREEN.MENU)} />
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
            onBack={() => navigate('/menu')}
          />
        )
      case SCREEN.TEST_HUB:
        return (
          <TestHubScreen
            results={results}
            onViewResults={() => navigate('/results')}
            onRetake={() => navigate('/test', { fresh: true })}
            onBack={() => navigate('/menu')}
            tg={tg}
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
      case SCREEN.COMING_SOON:
        return <ComingSoonScreen route={route} onBack={() => navigate('/menu')} tg={tg} />
      case SCREEN.ADMIN:
        return <AdminPage onBack={() => navigate('/menu')} />
      default:
        return <LoadingScreen text="..." />
    }
  }

  // V3: экраны без transition-анимации (у них своя)
  const NO_TRANSITION = [SCREEN.SPLASH, SCREEN.QUIZ, SCREEN.QUICK_TEST]
  const transitionKey = NO_TRANSITION.includes(screen) ? undefined : screen // eslint-disable-line

  // Экраны без BottomNav
  const NO_BOTTOM_NAV = [
    SCREEN.SPLASH, SCREEN.LOADING, SCREEN.QUICK_TEST, SCREEN.ONBOARDING, SCREEN.ADMIN,
  ]
  const showBottomNav = !NO_BOTTOM_NAV.includes(screen)

  if (gateState === 'checking') {
    return <SplashScreen onDone={() => {}} />
  }
  if (gateState === 'blocked' || gateState === 'error') {
    const isRu = lang === 'ru'
    return (
      <GateScreen
        isRu={isRu}
        error={gateState === 'error'}
        channel={gateChannel}
        rechecking={gateRechecking}
        onRecheck={recheckGate}
        tg={tg}
      />
    )
  }

  return (
    <NavigationContext.Provider value={{ navigate, current: route }}>
      <StarField count={55} />
      <AuroraStreak active={liquidActive} />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        position: 'relative',
        zIndex: 1,
        paddingBottom: showBottomNav ? 'var(--bottom-nav-total)' : 0,
        background: 'linear-gradient(160deg, #05050b 0%, #0c0c1e 60%, #08081a 100%)',
      }}>
        {renderScreen()}
      </div>
      {showBottomNav && <BottomNav />}
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

function GateScreen({ isRu, error, channel, rechecking, onRecheck, tg }) {
  const openChannel = () => {
    const url = `https://t.me/${channel.replace('@', '')}`
    if (tg?.openTelegramLink) tg.openTelegramLink(url)
    else window.open(url, '_blank')
  }
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #05050b 0%, #0c0c1e 60%, #08081a 100%)',
      color: '#f0eeff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', gap: 16, textAlign: 'center',
    }}>
      <div style={{ fontSize: 52 }}>{error ? '📡' : '🔒'}</div>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
        {error
          ? (isRu ? 'Не удалось проверить доступ' : 'Could not verify access')
          : (isRu ? 'Доступ по подписке' : 'Subscribers only')}
      </h2>
      <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.6)', maxWidth: 300, lineHeight: 1.6 }}>
        {error
          ? (isRu ? 'Проверь интернет и попробуй снова' : 'Check your connection and try again')
          : (isRu
              ? `Тест CareerCheck доступен подписчикам ${channel}. Подпишись и нажми «Проверить подписку».`
              : `The CareerCheck test is available to subscribers of ${channel}. Subscribe and tap "Check subscription".`)}
      </p>
      {!error && (
        <button onClick={openChannel} style={{
          background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
          border: 'none', borderRadius: 14, padding: '13px 28px',
          color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
        }}>
          {isRu ? `Подписаться на ${channel}` : `Subscribe to ${channel}`}
        </button>
      )}
      <button onClick={onRecheck} disabled={rechecking} style={{
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 14, padding: '11px 24px', color: '#f0eeff', fontSize: 14, fontWeight: 600,
        cursor: rechecking ? 'default' : 'pointer', opacity: rechecking ? 0.6 : 1,
      }}>
        {rechecking ? (isRu ? 'Проверяю…' : 'Checking…') : (isRu ? 'Проверить подписку' : 'Check subscription')}
      </button>
    </div>
  )
}

const COMING_LABELS = {
  '/professions': { emoji: '📚', title: 'Каталог профессий', sub: 'Скоро — 30+ профессий с детальным описанием' },
  '/history':     { emoji: '🔄', title: 'История тестов', sub: 'Скоро — все ваши прохождения в одном месте' },
  '/settings':    { emoji: '⚙️', title: 'Настройки', sub: 'Скоро — язык, уведомления, профиль' },
}

function TestHubScreen({ results, onViewResults, onRetake, onBack, tg }) {
  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  const hasResult = !!results?.normalized_scores
  const top1 = results?.top_professions?.[0]

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #05050b 0%, #0c0c1e 60%, #08081a 100%)',
      color: '#f0eeff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      gap: 16,
    }}>
      <div style={{ fontSize: 52, marginBottom: 8 }}>🧬</div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, textAlign: 'center' }}>
        {hasResult ? 'Тест пройден' : 'Карьерный тест'}
      </h2>
      {hasResult && top1 && (
        <div style={{
          background: 'rgba(124,58,237,0.12)',
          border: '1px solid rgba(124,58,237,0.3)',
          borderRadius: 16,
          padding: '14px 20px',
          textAlign: 'center',
          width: '100%',
          maxWidth: 320,
        }}>
          <div style={{ fontSize: 11, color: '#9b97c0', letterSpacing: '0.1em', marginBottom: 6, textTransform: 'uppercase' }}>
            Лучшее совпадение
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#a78bfa' }}>{top1.title}</div>
          <div style={{ fontSize: 14, color: '#22d3a5', marginTop: 4 }}>{top1.match}% совпадение</div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 320 }}>
        {hasResult && (
          <button onClick={onViewResults} style={{
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            border: 'none', borderRadius: 14, padding: '14px',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
          }}>
            📊 Мои результаты
          </button>
        )}
        <button onClick={onRetake} style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '13px',
          color: '#9b97c0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          🔄 Пройти тест заново
        </button>
      </div>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: '#5a5878', fontSize: 13, marginTop: 4,
      }}>
        ← Назад в меню
      </button>
    </div>
  )
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
