import { useState, useEffect } from 'react'
import { useTelegram } from './hooks/useTelegram'
import { WelcomePage }  from './pages/WelcomePage'
import { QuizPage }     from './pages/QuizPage'
import { ResultsPage }  from './pages/ResultsPage'
import './styles.css'

// Состояния приложения
const SCREEN = {
  LOADING:  'loading',
  WELCOME:  'welcome',
  QUIZ:     'quiz',
  SAVING:   'saving',
  RESULTS:  'results',
  ERROR:    'error',
}

export default function App() {
  const { user, initData, haptic, tg } = useTelegram()
  const [screen, setScreen] = useState(SCREEN.LOADING)
  const [questions, setQuestions] = useState([])
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const lang = tg?.initDataUnsafe?.user?.language_code || 'ru'

  useEffect(() => {
    initApp()
  }, [])

  async function initApp() {
    try {
      // 1. Загружаем вопросы
      const res = await fetch(`/api/questions?lang=${lang}`)
      if (!res.ok) throw new Error('Не удалось загрузить вопросы')
      const data = await res.json()
      setQuestions(data.questions)

      // 2. Проверяем, есть ли уже результаты
      if (user && initData) {
        const rRes = await fetch(`/api/results/${user.id}?init_data=${encodeURIComponent(initData)}`)
        if (rRes.ok) {
          const rData = await rRes.json()
          setResults(rData)
          setScreen(SCREEN.RESULTS)
          return
        }
      }

      setScreen(SCREEN.WELCOME)
    } catch (e) {
      setError(e.message)
      setScreen(SCREEN.ERROR)
    }
  }

  async function handleFinish(answers) {
    setScreen(SCREEN.SAVING)
    try {
      const res = await fetch('/api/results/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData, answers, lang }),
      })
      if (!res.ok) throw new Error('Ошибка сохранения')
      const data = await res.json()
      setResults(data)
      setScreen(SCREEN.RESULTS)
    } catch (e) {
      setError(e.message)
      setScreen(SCREEN.ERROR)
    }
  }

  // Screens
  if (screen === SCREEN.LOADING) return <LoadingScreen text="Загрузка..." />
  if (screen === SCREEN.SAVING)  return <LoadingScreen text="Считаем результаты..." />
  if (screen === SCREEN.ERROR)   return <ErrorScreen message={error} onRetry={initApp} />
  if (screen === SCREEN.WELCOME) return <WelcomePage onStart={() => setScreen(SCREEN.QUIZ)} />
  if (screen === SCREEN.QUIZ)    return <QuizPage questions={questions} onFinish={handleFinish} />
  if (screen === SCREEN.RESULTS) return <ResultsPage results={results} />

  return null
}

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
