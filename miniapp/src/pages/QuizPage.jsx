import { useState, useEffect, useCallback, useRef } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { MilestoneCard } from '../components/MilestoneCard'
import { track } from '../hooks/useAnalytics'

const SCORE_LABELS = ['Совсем нет', 'Скорее нет', 'Нейтрально', 'Скорее да', 'Полностью да']

// Киберпанк цвета для каждой черты
const TRAIT_COLORS = {
  O: { primary: '#06b6d4', glow: 'rgba(6,182,212,0.4)',  bg: 'rgba(6,182,212,0.08)',  label: 'Открытость' },
  C: { primary: '#7c3aed', glow: 'rgba(124,58,237,0.4)', bg: 'rgba(124,58,237,0.08)', label: 'Добросовестность' },
  E: { primary: '#fbbf24', glow: 'rgba(251,191,36,0.4)', bg: 'rgba(251,191,36,0.08)', label: 'Экстраверсия' },
  A: { primary: '#22d3a5', glow: 'rgba(34,211,165,0.4)', bg: 'rgba(34,211,165,0.08)', label: 'Доброжелательность' },
  S: { primary: '#f43f5e', glow: 'rgba(244,63,94,0.4)',  bg: 'rgba(244,63,94,0.08)',  label: 'Стабильность' },
}

const PROGRESS_KEY = 'cc_progress'
const MILESTONES   = [20, 40]

export function saveProgress(questionIndex, answers) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      questionIndex,
      answers,
      ts: Date.now(),
    }))
  } catch {}
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return null
    const { questionIndex, answers, ts } = JSON.parse(raw)
    if (Date.now() - ts > 86400 * 1000) {
      localStorage.removeItem(PROGRESS_KEY)
      return null
    }
    return { questionIndex, answers }
  } catch {
    return null
  }
}

export function clearProgress() {
  try { localStorage.removeItem(PROGRESS_KEY) } catch {}
}

// CSS для киберпанк-анимаций — инжектируется один раз
const QUIZ_CSS = `
  @keyframes quiz-neon-pulse {
    0%, 100% { box-shadow: 0 0 8px var(--qt-glow), 0 0 20px var(--qt-glow), inset 0 0 8px rgba(0,0,0,0.3); }
    50%       { box-shadow: 0 0 16px var(--qt-glow), 0 0 40px var(--qt-glow), inset 0 0 12px rgba(0,0,0,0.3); }
  }
  @keyframes quiz-border-flow {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes quiz-slide-in {
    from { opacity: 0; transform: translateX(48px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes quiz-slide-out-left {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(-48px); }
  }
  @keyframes quiz-slide-out-right {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(48px); }
  }
  @keyframes quiz-ripple {
    0%   { transform: scale(0); opacity: 0.6; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  @keyframes quiz-progress-glow {
    0%, 100% { filter: blur(3px) brightness(1); }
    50%       { filter: blur(5px) brightness(1.4); }
  }
  @keyframes quiz-particle {
    0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0.6; }
    100% { transform: translateY(-60px) translateX(var(--px)) scale(0); opacity: 0; }
  }
  @keyframes quiz-counter-pop {
    0%   { transform: scale(1); }
    40%  { transform: scale(1.25); }
    100% { transform: scale(1); }
  }
  @keyframes quiz-btn-select {
    0%   { transform: scale(1); }
    30%  { transform: scale(0.96); }
    70%  { transform: scale(1.02); }
    100% { transform: scale(1); }
  }

  .quiz-cyber-page {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    background: linear-gradient(160deg, #020208 0%, #080818 50%, #050512 100%);
    overflow: hidden;
    position: relative;
  }

  /* Header */
  .quiz-cyber-header {
    position: fixed;
    top: 0; left: 0; right: 0;
    z-index: 100;
    background: rgba(2,2,8,0.88);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-bottom: 1px solid rgba(6,182,212,0.15);
    padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .quiz-cyber-back-btn {
    display: flex; align-items: center; gap: 6px;
    background: rgba(6,182,212,0.08);
    border: 1px solid rgba(6,182,212,0.25);
    border-radius: 10px;
    padding: 7px 12px;
    color: #06b6d4;
    font-size: 13px; font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .quiz-cyber-back-btn:active { background: rgba(6,182,212,0.18); }

  .quiz-cyber-counter {
    display: flex; align-items: baseline; gap: 3px;
    flex-shrink: 0;
  }
  .quiz-cyber-num {
    font-size: 22px; font-weight: 800;
    background: linear-gradient(135deg, #06b6d4, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
  }
  .quiz-cyber-total {
    font-size: 13px; color: rgba(255,255,255,0.3); font-weight: 500;
  }

  /* Progress bar */
  .quiz-cyber-progress-wrap {
    position: relative;
    height: 4px;
    background: rgba(255,255,255,0.06);
    margin-top: 1px;
  }
  .quiz-cyber-progress-fill {
    position: absolute;
    top: 0; left: 0; bottom: 0;
    background: linear-gradient(90deg, #7c3aed, #06b6d4, #a78bfa);
    background-size: 200% 100%;
    animation: quiz-border-flow 3s linear infinite;
    transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    border-radius: 0 2px 2px 0;
  }
  .quiz-cyber-progress-glow {
    position: absolute;
    top: -2px; bottom: -2px;
    right: 0;
    width: 16px;
    background: linear-gradient(90deg, transparent, #06b6d4);
    filter: blur(3px);
    animation: quiz-progress-glow 1.5s ease-in-out infinite;
    border-radius: 2px;
  }

  /* Trait badge */
  .quiz-cyber-trait {
    flex: 1;
    display: flex;
    justify-content: center;
  }
  .quiz-cyber-trait-chip {
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 20px;
    border: 1px solid var(--qt-primary);
    color: var(--qt-primary);
    background: var(--qt-bg);
    box-shadow: 0 0 8px var(--qt-glow);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 160px;
  }

  /* Spacer under fixed header */
  .quiz-cyber-header-spacer {
    flex-shrink: 0;
    height: calc(68px + 4px + env(safe-area-inset-top, 0px));
  }

  /* Body */
  .quiz-cyber-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 16px 16px 0;
  }

  /* Question card */
  .quiz-cyber-card {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 28px 24px;
    background: rgba(8,8,24,0.7);
    border-radius: 20px;
    border: 1px solid var(--qt-primary);
    box-shadow: 0 0 12px var(--qt-glow), 0 0 32px rgba(0,0,0,0.6), inset 0 0 20px rgba(0,0,0,0.3);
    position: relative;
    overflow: hidden;
    animation: quiz-neon-pulse 2.5s ease-in-out infinite;
    margin-bottom: 16px;
  }
  .quiz-cyber-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at top right, var(--qt-bg) 0%, transparent 60%);
    pointer-events: none;
  }
  .quiz-cyber-card-text {
    font-size: 19px;
    font-weight: 500;
    line-height: 1.55;
    color: #f0eeff;
    text-align: center;
    position: relative;
    z-index: 1;
  }

  /* Card animation classes */
  .quiz-cyber-card.anim-in    { animation: quiz-slide-in 0.25s cubic-bezier(0.34,1.56,0.64,1) both, quiz-neon-pulse 2.5s ease-in-out 0.25s infinite; }
  .quiz-cyber-card.anim-out-l { animation: quiz-slide-out-left  0.2s ease both; }
  .quiz-cyber-card.anim-out-r { animation: quiz-slide-out-right 0.2s ease both; }

  /* Answer buttons */
  .quiz-cyber-answers {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 0 calc(24px + env(safe-area-inset-bottom, 0px));
  }
  .quiz-cyber-answer {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(8,8,24,0.75);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 13px 16px;
    cursor: pointer;
    transition: border-color 0.18s, background 0.18s, transform 0.12s;
    color: #f0eeff;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
  }
  .quiz-cyber-answer:active { transform: scale(0.98); }
  .quiz-cyber-answer.selected {
    border-color: var(--qt-primary);
    background: var(--qt-bg);
    box-shadow: 0 0 12px var(--qt-glow), inset 0 0 8px rgba(0,0,0,0.2);
    animation: quiz-btn-select 0.3s ease;
  }
  .quiz-cyber-answer-num {
    width: 32px; height: 32px;
    border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-weight: 700;
    color: rgba(255,255,255,0.4);
    flex-shrink: 0;
    transition: border-color 0.18s, color 0.18s, background 0.18s;
  }
  .quiz-cyber-answer.selected .quiz-cyber-answer-num {
    border-color: var(--qt-primary);
    color: var(--qt-primary);
    background: var(--qt-bg);
    box-shadow: 0 0 8px var(--qt-glow);
  }
  .quiz-cyber-answer-label {
    font-size: 14px;
    color: rgba(255,255,255,0.5);
    transition: color 0.18s;
  }
  .quiz-cyber-answer.selected .quiz-cyber-answer-label {
    color: #f0eeff;
  }
  /* Ripple */
  .quiz-cyber-ripple {
    position: absolute;
    width: 80px; height: 80px;
    border-radius: 50%;
    background: var(--qt-primary);
    opacity: 0;
    transform: scale(0);
    animation: quiz-ripple 0.5s ease-out forwards;
    pointer-events: none;
    margin-left: -40px; margin-top: -40px;
  }

  /* Floating particles */
  .quiz-cyber-particle {
    position: fixed;
    width: 4px; height: 4px;
    border-radius: 50%;
    background: var(--qt-primary, #06b6d4);
    pointer-events: none;
    z-index: 0;
    opacity: 0;
    animation: quiz-particle 1.2s ease-out forwards;
  }
`

let quizCssInjected = false
function injectQuizCSS() {
  if (quizCssInjected) return
  quizCssInjected = true
  const s = document.createElement('style')
  s.textContent = QUIZ_CSS
  document.head.appendChild(s)
}

export function QuizPage({ questions, onFinish, onBack }) {
  const { haptic, tg } = useTelegram()
  const lang = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'

  const saved     = loadProgress()
  const initIdx   = saved && saved.questionIndex < questions.length ? saved.questionIndex : 0
  const initAns   = saved && saved.answers.length === initIdx ? saved.answers : []

  const [current,       setCurrent]       = useState(initIdx)
  const [answers,       setAnswers]       = useState(initAns)
  const [selected,      setSelected]      = useState(null)
  const [animDir,       setAnimDir]       = useState('in')
  const [transitioning, setTransitioning] = useState(false)
  const [milestone,     setMilestone]     = useState(null)
  const [ripples,       setRipples]       = useState([])
  const [counterAnim,   setCounterAnim]   = useState(false)
  const prefetchedRef   = useRef(false)

  const q        = questions[current]
  const trait    = q?.trait || 'O'
  const tc       = TRAIT_COLORS[trait] || TRAIT_COLORS.O
  const progress = (current / questions.length) * 100

  useEffect(() => { injectQuizCSS() }, [])
  useEffect(() => { track('test_start') }, [])
  useEffect(() => {
    if (current === 10) track('q10_answered')
    if (current === 30) track('q30_answered')
  }, [current])

  useEffect(() => {
    if (current >= 55 && !prefetchedRef.current && tg?.initData) {
      prefetchedRef.current = true
      const uid = tg?.initDataUnsafe?.user?.id
      if (uid) fetch(`/api/results/${uid}?init_data=${encodeURIComponent(tg.initData)}`).catch(() => {})
    }
  }, [current, tg])

  useEffect(() => {
    setAnimDir('in')
    setSelected(null)
    setCounterAnim(true)
    const t = setTimeout(() => setCounterAnim(false), 300)
    return () => clearTimeout(t)
  }, [current])

  const addRipple = useCallback((e, btnEl) => {
    const rect   = btnEl.getBoundingClientRect()
    const touch  = e.touches?.[0] || e
    const x      = (touch.clientX - rect.left)
    const y      = (touch.clientY - rect.top)
    const id     = Date.now()
    setRipples(r => [...r, { id, x, y }])
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== id)), 600)
  }, [])

  const handleSelect = useCallback(async (score, e) => {
    if (transitioning || milestone) return

    // Ripple
    if (e?.currentTarget) addRipple(e, e.currentTarget)

    if (score <= 2)       haptic.light?.()
    else if (score === 3) haptic.medium?.()
    else                  haptic.rigid?.()
    setSelected(score)

    const newAnswer = {
      question_id: q.id,
      trait:       q.trait,
      score,
      is_inverted: q.is_inverted,
    }

    await new Promise(r => setTimeout(r, 240))

    setTransitioning(true)
    setAnimDir('out-left')
    await new Promise(r => setTimeout(r, 200))

    const newAnswers = [...answers, newAnswer]
    setAnswers(newAnswers)
    const nextIdx = current + 1

    if (nextIdx >= questions.length) {
      clearProgress()
      haptic.success?.()
      track('q60_answered')
      onFinish(newAnswers)
      return
    }

    saveProgress(nextIdx, newAnswers)

    if (MILESTONES.includes(nextIdx)) {
      haptic.success?.()
      setMilestone(newAnswers)
      setCurrent(nextIdx)
      setTransitioning(false)
      return
    }

    setCurrent(nextIdx)
    setTransitioning(false)
  }, [transitioning, milestone, current, answers, q, haptic, onFinish, questions.length, addRipple])

  const handleBack = useCallback(async () => {
    if (current === 0 || transitioning || milestone) return
    haptic.light?.()
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
    'in':         'anim-in',
    'out-left':   'anim-out-l',
    'out-right':  'anim-out-r',
  }[animDir]

  const cssVars = {
    '--qt-primary': tc.primary,
    '--qt-glow':    tc.glow,
    '--qt-bg':      tc.bg,
  }

  if (!q) return null

  return (
    <div className="quiz-cyber-page" style={cssVars}>

      {/* Fixed header */}
      <div className="quiz-cyber-header">
        <button className="quiz-cyber-back-btn" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Меню
        </button>

        <div className="quiz-cyber-trait">
          <div className="quiz-cyber-trait-chip" style={cssVars}>
            {tc.label}
          </div>
        </div>

        <div className="quiz-cyber-counter">
          <span
            className="quiz-cyber-num"
            style={{ display: 'inline-block', animation: counterAnim ? 'quiz-counter-pop 0.3s ease' : 'none' }}
          >
            {current + 1}
          </span>
          <span className="quiz-cyber-total">/{questions.length}</span>
        </div>
      </div>

      {/* Progress bar (right below header) */}
      <div className="quiz-cyber-progress-wrap">
        <div
          className="quiz-cyber-progress-fill"
          style={{ width: `${progress}%` }}
        />
        {progress > 0 && (
          <div
            className="quiz-cyber-progress-glow"
            style={{ left: `calc(${progress}% - 16px)`, background: `linear-gradient(90deg, transparent, ${tc.primary})` }}
          />
        )}
      </div>

      {/* Spacer */}
      <div className="quiz-cyber-header-spacer" />

      {/* Body */}
      <div className="quiz-cyber-body">
        {/* Question card */}
        <div className={`quiz-cyber-card ${animClass}`} style={cssVars}>
          <p className="quiz-cyber-card-text">{q.question_text}</p>
        </div>

        {/* Answer buttons */}
        <div className="quiz-cyber-answers">
          {[1, 2, 3, 4, 5].map(score => (
            <button
              key={score}
              className={`quiz-cyber-answer ${selected === score ? 'selected' : ''}`}
              style={cssVars}
              onClick={(e) => handleSelect(score, e)}
              disabled={transitioning || !!milestone}
            >
              {/* Ripples for this button */}
              {ripples.map(rp => (
                <span
                  key={rp.id}
                  className="quiz-cyber-ripple"
                  style={{ left: rp.x, top: rp.y, background: tc.primary }}
                />
              ))}
              <span className="quiz-cyber-answer-num">{score}</span>
              <span className="quiz-cyber-answer-label">{SCORE_LABELS[score - 1]}</span>
            </button>
          ))}
        </div>
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

      {/* Back on first question — handled by Telegram back button or our header */}
      {current > 0 && (
        <div style={{ display: 'none' }} /* Telegram back button in useTelegram */ />
      )}
    </div>
  )
}
