/**
 * QuickTestPage — 10 вопросов, 2 минуты, превью профиля.
 * Lead magnet: показывает размытый radar + топ-2 черты + CTA на полный тест.
 */
import { useState, useEffect } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { PentagonProgress } from '../components/PentagonProgress'
import { track } from '../hooks/useAnalytics'

const SCORE_LABELS_RU = ['Совсем нет', 'Скорее нет', 'Нейтрально', 'Скорее да', 'Полностью да']
const SCORE_LABELS_EN = ['Not at all', 'Rather no', 'Neutral', 'Rather yes', 'Completely']
const SCORE_COLORS    = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']

const TRAIT_INFO = {
  ru: {
    O: { name: 'Открытость к опыту',   emoji: '🎨', desc: 'Любопытство и тяга к новому' },
    C: { name: 'Сознательность',        emoji: '⚡', desc: 'Организованность и целеустремлённость' },
    E: { name: 'Экстраверсия',          emoji: '🌟', desc: 'Энергия от общения с людьми' },
    A: { name: 'Доброжелательность',    emoji: '🤝', desc: 'Эмпатия и умение работать в команде' },
    S: { name: 'Эмоц. стабильность',   emoji: '🧘', desc: 'Устойчивость в стрессовых ситуациях' },
  },
  en: {
    O: { name: 'Openness',          emoji: '🎨', desc: 'Curiosity and love of new experiences' },
    C: { name: 'Conscientiousness', emoji: '⚡', desc: 'Organization and goal-directedness' },
    E: { name: 'Extraversion',      emoji: '🌟', desc: 'Energy from socializing' },
    A: { name: 'Agreeableness',     emoji: '🤝', desc: 'Empathy and teamwork' },
    S: { name: 'Stability',         emoji: '🧘', desc: 'Resilience under stress' },
  },
}

export function QuickTestPage({ onFinish, onBack }) {
  const { tg, haptic, showBackButton, hideBackButton } = useTelegram()
  const lang   = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu   = lang !== 'en'
  const labels = isRu ? SCORE_LABELS_RU : SCORE_LABELS_EN
  const info   = TRAIT_INFO[isRu ? 'ru' : 'en']

  const [questions,     setQuestions]     = useState([])
  const [current,       setCurrent]       = useState(0)
  const [answers,       setAnswers]       = useState([])
  const [selected,      setSelected]      = useState(null)
  const [transitioning, setTransitioning] = useState(false)
  const [loading,       setLoading]       = useState(true)

  useEffect(() => {
    track('quick_test_start')
    fetch(`/api/quick-test/questions?lang=${lang}`)
      .then(r => r.json())
      .then(d => { setQuestions(d.questions || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [lang])

  useEffect(() => {
    if (current > 0) showBackButton(onBack)
    else hideBackButton()
  }, [current])

  async function handleSelect(score) {
    if (transitioning || !questions[current]) return
    haptic.select()
    setSelected(score)
    await new Promise(r => setTimeout(r, 220))
    setTransitioning(true)
    await new Promise(r => setTimeout(r, 180))

    const q = questions[current]
    const newAnswers = [...answers, { question_id: q.id, trait: q.trait, score, is_inverted: q.is_inverted }]
    setAnswers(newAnswers)

    if (current + 1 >= questions.length) {
      haptic.success()
      onFinish(newAnswers)
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setTransitioning(false)
    }
  }

  if (loading) {
    return (
      <div className="quick-page">
        <div className="loading-screen">
          <div className="loading-spinner" />
          <p className="loading-text">{isRu ? 'Загрузка…' : 'Loading…'}</p>
        </div>
      </div>
    )
  }

  if (!questions.length) return null
  const q = questions[current]
  const traitInfo = info[q.trait]

  return (
    <div className="quick-page">
      {/* Header */}
      <div className="quick-header">
        <div className="quick-badge">{isRu ? '⚡ Быстрый тест' : '⚡ Quick test'}</div>
        <PentagonProgress answered={current} total={questions.length} size={48} />
      </div>
      <div className="quick-header-spacer" />

      {/* Trait label */}
      <div className="quick-trait">
        <span className="quick-trait-emoji">{traitInfo.emoji}</span>
        <div>
          <div className="quick-trait-name">{traitInfo.name}</div>
          <div className="quick-trait-desc">{traitInfo.desc}</div>
        </div>
      </div>

      {/* Question */}
      <div className={`question-card ${transitioning ? 'q-exit-left' : 'q-enter'}`}>
        <p className="question-text">{q.question_text}</p>
      </div>

      {/* Score buttons */}
      <div className="score-grid">
        {[1,2,3,4,5].map(score => (
          <button
            key={score}
            className={`score-btn ${selected === score ? 'score-selected' : ''}`}
            style={{ '--accent': SCORE_COLORS[score - 1] }}
            onClick={() => handleSelect(score)}
            disabled={transitioning}
          >
            <span className="score-circle">{score}</span>
            <span className="score-label">{labels[score - 1]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
