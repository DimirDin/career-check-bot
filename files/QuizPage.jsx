import { useState, useEffect, useCallback } from 'react'
import { useTelegram } from '../hooks/useTelegram'

// Вопросы загружаются с сервера или из props
// В dev-режиме используется заглушка

const SCORE_LABELS = ['Совсем нет', 'Скорее нет', 'Нейтрально', 'Скорее да', 'Полностью да']
const SCORE_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']

export function QuizPage({ questions, onFinish }) {
  const { haptic, showBackButton, hideBackButton } = useTelegram()

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState([])
  const [selected, setSelected] = useState(null)
  const [animDir, setAnimDir] = useState('in') // 'in' | 'out-left' | 'out-right'
  const [transitioning, setTransitioning] = useState(false)

  const q = questions[current]
  const progress = current / questions.length

  useEffect(() => {
    if (current > 0) {
      showBackButton(() => handleBack())
    } else {
      hideBackButton()
    }
  }, [current])

  // Анимация появления нового вопроса
  useEffect(() => {
    setAnimDir('in')
    setSelected(null)
  }, [current])

  const handleSelect = useCallback(async (score) => {
    if (transitioning) return
    haptic.select()
    setSelected(score)

    const newAnswer = {
      question_id: q.id,
      trait: q.trait,
      score,
      is_inverted: q.is_inverted,
    }

    await new Promise(r => setTimeout(r, 220))

    setTransitioning(true)
    setAnimDir('out-left')

    await new Promise(r => setTimeout(r, 200))

    const newAnswers = [...answers, newAnswer]
    setAnswers(newAnswers)

    if (current + 1 >= questions.length) {
      haptic.success()
      onFinish(newAnswers)
    } else {
      setCurrent(c => c + 1)
      setTransitioning(false)
    }
  }, [transitioning, current, answers, q, haptic, onFinish])

  const handleBack = useCallback(async () => {
    if (current === 0 || transitioning) return
    haptic.light()
    setTransitioning(true)
    setAnimDir('out-right')
    await new Promise(r => setTimeout(r, 200))
    setAnswers(a => a.slice(0, -1))
    setCurrent(c => c - 1)
    setTransitioning(false)
  }, [current, transitioning, haptic])

  const animClass = {
    'in':        'q-enter',
    'out-left':  'q-exit-left',
    'out-right': 'q-exit-right',
  }[animDir]

  return (
    <div className="quiz-page">
      {/* Progress bar */}
      <div className="progress-bar-wrap">
        <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* Counter */}
      <div className="quiz-counter">
        <span className="quiz-num">{current + 1}</span>
        <span className="quiz-total"> / {questions.length}</span>
        <span className="quiz-trait-badge" data-trait={q.trait}>{q.trait}</span>
      </div>

      {/* Question card */}
      <div className={`question-card ${animClass}`}>
        <p className="question-text">{q.question_text}</p>
      </div>

      {/* Score buttons */}
      <div className="score-grid">
        {[1, 2, 3, 4, 5].map(score => (
          <button
            key={score}
            className={`score-btn ${selected === score ? 'score-selected' : ''}`}
            style={{ '--accent': SCORE_COLORS[score - 1] }}
            onClick={() => handleSelect(score)}
            disabled={transitioning}
          >
            <span className="score-circle">{score}</span>
            <span className="score-label">{SCORE_LABELS[score - 1]}</span>
          </button>
        ))}
      </div>

      {/* Mini progress dots (last 5) */}
      <div className="progress-dots">
        {Array.from({ length: Math.min(current + 1, 5) }, (_, i) => (
          <div key={i} className="progress-dot done" />
        ))}
        <div className="progress-dot current" />
      </div>
    </div>
  )
}
