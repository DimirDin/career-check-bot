import { useState } from 'react'
import { COMPAT_QUESTIONS } from '../data/compatQuestions'
import { useNavigate } from '../context/NavigationContext'

export function ProfessionCompatTest({ riasecType }) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('idle')
  const [questionIdx, setQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState([])
  const [fading, setFading] = useState(false)

  const questions = COMPAT_QUESTIONS[riasecType] || COMPAT_QUESTIONS['I']

  function startTest() {
    setAnswers([])
    setQuestionIdx(0)
    setPhase('questions')
  }

  function answer(yes) {
    const next = [...answers, yes]
    if (fading) return
    setFading(true)
    setTimeout(() => {
      setAnswers(next)
      if (next.length >= questions.length) {
        setPhase('result')
      } else {
        setQuestionIdx(next.length)
      }
      setFading(false)
    }, 200)
  }

  const yesCount = answers.filter(Boolean).length
  const pct = Math.round((yesCount / questions.length) * 100)

  function getMatchLabel() {
    if (pct >= 80) return 'Отличное совпадение'
    if (pct >= 60) return 'Хорошее совпадение'
    if (pct >= 20) return 'Частичное совпадение'
    return 'Возможно не твоё'
  }

  if (phase === 'idle') {
    return (
      <div className="compat-test">
        <button className="compat-start-btn" onClick={startTest}>
          🎯 Проверь совместимость →
        </button>
      </div>
    )
  }

  if (phase === 'questions') {
    const q = questions[questionIdx]
    return (
      <div className="compat-test">
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 8 }}>
          {questionIdx + 1} из {questions.length}
        </div>
        <div className={`compat-question-wrap${fading ? ' compat-question-wrap--hidden' : ''}`}>
          <div className="compat-question-text">{q.q}</div>
          <div className="compat-answers">
            <button className="compat-btn-yes" onClick={() => answer(true)}>Да</button>
            <button className="compat-btn-no" onClick={() => answer(false)}>Нет</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="compat-test">
      <div className="compat-result">
        <div className="compat-result-pct">{pct}%</div>
        <div className="compat-result-label">{getMatchLabel()}</div>
        <div className="compat-result-sub">На основе {questions.length} вопросов</div>
        {pct < 60 ? (
          <button
            onClick={() => navigate('/results')}
            style={{
              width: '100%', padding: '13px',
              background: 'rgba(108,92,231,0.12)', border: '1px solid rgba(108,92,231,0.3)',
              borderRadius: 12, color: '#6C5CE7', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Посмотри свои профессии →
          </button>
        ) : (
          <button
            onClick={() => navigate('/premium')}
            style={{
              width: '100%', padding: '13px',
              background: 'linear-gradient(135deg, #6C5CE7, #00d4aa)',
              border: 'none', borderRadius: 12, color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Узнай детали → Premium PDF
          </button>
        )}
        <button
          onClick={() => { setPhase('idle'); setAnswers([]); }}
          style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
            fontSize: 13, cursor: 'pointer', marginTop: 12,
          }}
        >
          Пройти снова
        </button>
      </div>
    </div>
  )
}
