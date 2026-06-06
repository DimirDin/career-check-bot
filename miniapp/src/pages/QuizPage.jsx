import { useState, useEffect, useCallback, useRef } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { MilestoneCard } from '../components/MilestoneCard'
import { PentagonProgress } from '../components/PentagonProgress'
import { track } from '../hooks/useAnalytics'

const SCORE_LABELS = ['Совсем нет', 'Скорее нет', 'Нейтрально', 'Скорее да', 'Полностью да']
const SCORE_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']

const PROGRESS_KEY = 'cc_progress'
const MILESTONES   = [20, 40]

function saveProgress(questionIndex, answers) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      questionIndex,
      answers,
      ts: Date.now(),
    }))
  } catch {}
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return null
    const { questionIndex, answers, ts } = JSON.parse(raw)
    // Прогресс старше 24 часов не восстанавливаем
    if (Date.now() - ts > 86400 * 1000) {
      localStorage.removeItem(PROGRESS_KEY)
      return null
    }
    return { questionIndex, answers }
  } catch {
    return null
  }
}

function clearProgress() {
  try { localStorage.removeItem(PROGRESS_KEY) } catch {}
}

export function QuizPage({ questions, onFinish }) {
  const { haptic, tg, showBackButton, hideBackButton } = useTelegram()
  const lang = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'

  // Восстанавливаем прогресс из localStorage если есть
  const saved = loadProgress()
  const initIdx     = saved && saved.questionIndex < questions.length ? saved.questionIndex : 0
  const initAnswers = saved && saved.answers.length === initIdx ? saved.answers : []

  const [current,      setCurrent]      = useState(initIdx)
  const [answers,      setAnswers]      = useState(initAnswers)
  const [selected,     setSelected]     = useState(null)
  const [animDir,      setAnimDir]      = useState('in')
  const [transitioning,setTransitioning]= useState(false)
  const [milestone,    setMilestone]    = useState(null)
  const prefetchedRef  = useRef(false)

  const q        = questions[current]
  const progress = current / questions.length

  useEffect(() => {
    if (current > 0) showBackButton(() => handleBack())
    else hideBackButton()
  }, [current])

  // M1: test_start on mount
  useEffect(() => { track('test_start') }, [])

  // M1: milestone events
  useEffect(() => {
    if (current === 10)  track('q10_answered')
    if (current === 30)  track('q30_answered')
  }, [current])

  // F5: prefetch /results при вопросе 55 — результаты будут готовы мгновенно
  useEffect(() => {
    if (current >= 55 && !prefetchedRef.current && tg?.initData) {
      prefetchedRef.current = true
      const uid = tg?.initDataUnsafe?.user?.id
      if (uid) {
        fetch(`/api/results/${uid}?init_data=${encodeURIComponent(tg.initData)}`)
          .catch(() => {})
      }
    }
  }, [current, tg])

  useEffect(() => {
    setAnimDir('in')
    setSelected(null)
  }, [current])

  const handleSelect = useCallback(async (score) => {
    if (transitioning || milestone) return
    if (score <= 2)      haptic.light?.()
    else if (score === 3) haptic.medium?.()
    else                  haptic.rigid?.()
    setSelected(score)

    const newAnswer = {
      question_id:  q.id,
      trait:        q.trait,
      score,
      is_inverted:  q.is_inverted,
    }

    await new Promise(r => setTimeout(r, 220))

    setTransitioning(true)
    setAnimDir('out-left')
    await new Promise(r => setTimeout(r, 200))

    const newAnswers = [...answers, newAnswer]
    setAnswers(newAnswers)

    const nextIdx = current + 1

    if (nextIdx >= questions.length) {
      clearProgress()
      haptic.success()
      track('q60_answered')
      onFinish(newAnswers)
      return
    }

    // Сохраняем прогресс после каждого ответа
    saveProgress(nextIdx, newAnswers)

    // Milestone на вопросах 20 и 40
    if (MILESTONES.includes(nextIdx)) {
      haptic.success()
      setMilestone(newAnswers)
      setCurrent(nextIdx)
      setTransitioning(false)
      return
    }

    setCurrent(nextIdx)
    setTransitioning(false)
  }, [transitioning, milestone, current, answers, q, haptic, onFinish, questions.length])

  const handleBack = useCallback(async () => {
    if (current === 0 || transitioning || milestone) return
    haptic.light()
    setTransitioning(true)
    setAnimDir('out-right')
    await new Promise(r => setTimeout(r, 200))
    const prevAnswers = answers.slice(0, -1)
    setAnswers(prevAnswers)
    const prevIdx = current - 1
    setCurrent(prevIdx)
    saveProgress(prevIdx, prevAnswers)
    setTransitioning(false)
  }, [current, transitioning, milestone, answers, haptic])

  const animClass = {
    'in':         'q-enter',
    'out-left':   'q-exit-left',
    'out-right':  'q-exit-right',
  }[animDir]

  return (
    <div className="quiz-page">
      {/* Pentagon progress + trait badge */}
      <div className="quiz-header">
        <PentagonProgress answered={current} total={questions.length} size={108} />
        <span className="quiz-trait-badge" data-trait={q.trait}>{q.trait}</span>
      </div>
      <div className="quiz-header-spacer" />

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
            disabled={transitioning || !!milestone}
          >
            <span className="score-circle">{score}</span>
            <span className="score-label">{SCORE_LABELS[score - 1]}</span>
          </button>
        ))}
      </div>


      {/* Milestone overlay */}
      {milestone && (
        <MilestoneCard
          answers={milestone}
          totalQuestions={questions.length}
          lang={lang}
          onContinue={() => setMilestone(null)}
        />
      )}
    </div>
  )
}
