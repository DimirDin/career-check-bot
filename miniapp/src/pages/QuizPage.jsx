import { useState, useEffect, useCallback, useRef } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { MilestoneCard } from '../components/MilestoneCard'
import { track } from '../hooks/useAnalytics'

const SCORE_LABELS = ['Совсем нет', 'Скорее нет', 'Нейтрально', 'Скорее да', 'Полностью да']

const TRAIT_COLORS = {
  O: { primary: '#06b6d4', glow: 'rgba(6,182,212,0.5)',  bg: 'rgba(6,182,212,0.08)',  label: 'Открытость' },
  C: { primary: '#a78bfa', glow: 'rgba(167,139,250,0.5)', bg: 'rgba(167,139,250,0.08)', label: 'Добросов.' },
  E: { primary: '#fbbf24', glow: 'rgba(251,191,36,0.5)', bg: 'rgba(251,191,36,0.08)', label: 'Экстраверсия' },
  A: { primary: '#22d3a5', glow: 'rgba(34,211,165,0.5)', bg: 'rgba(34,211,165,0.08)', label: 'Дружелюбие' },
  S: { primary: '#f43f5e', glow: 'rgba(244,63,94,0.5)',  bg: 'rgba(244,63,94,0.08)',  label: 'Стабильность' },
}

const SCORE_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e']

const PROGRESS_KEY = 'cc_progress'
const MILESTONES   = [20, 40]

export function saveProgress(questionIndex, answers) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ questionIndex, answers, ts: Date.now() }))
  } catch {}
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return null
    const { questionIndex, answers, ts } = JSON.parse(raw)
    if (Date.now() - ts > 86400 * 1000) { localStorage.removeItem(PROGRESS_KEY); return null }
    return { questionIndex, answers }
  } catch { return null }
}

export function clearProgress() {
  try { localStorage.removeItem(PROGRESS_KEY) } catch {}
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
  const prefetchedRef = useRef(false)

  const q       = questions[current]
  const trait   = q?.trait || 'O'
  const tc      = TRAIT_COLORS[trait] || TRAIT_COLORS.O
  const pct     = Math.round((current / questions.length) * 100)

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
  }, [current])

  const handleSelect = useCallback(async (score) => {
    if (transitioning || milestone) return
    if (score <= 2)       haptic.light?.()
    else if (score === 3) haptic.medium?.()
    else                  haptic.rigid?.()
    setSelected(score)

    const newAnswer = { question_id: q.id, trait: q.trait, score, is_inverted: q.is_inverted }
    await new Promise(r => setTimeout(r, 230))

    setTransitioning(true)
    setAnimDir('out-left')
    await new Promise(r => setTimeout(r, 190))

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
  }, [transitioning, milestone, current, answers, q, haptic, onFinish, questions.length])

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    // После показа BackButton Telegram обновляет contentSafeAreaInsets —
    // пересчитываем CSS-переменную чтобы шапка встала на правильную позицию
    const refreshInsets = () => {
      const contentTop = tg.contentSafeAreaInsets?.top ?? 0
      const safeTop    = tg.safeAreaInsets?.top        ?? 0
      let top = Math.max(contentTop, safeTop)
      if (tg.isFullscreen && contentTop <= safeTop + 10 && safeTop > 0) top = safeTop + 44
      if (top > 0) document.documentElement.style.setProperty('--tg-header-h', top + 'px')
    }
    const t = setTimeout(refreshInsets, 150)
    return () => {
      clearTimeout(t)
      tg.BackButton.offClick(onBack)
      tg.BackButton.hide()
    }
  }, [tg, onBack])

  const animStyle = {
    'in':         { animation: 'qSlideIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both' },
    'out-left':   { animation: 'qSlideOutL 0.19s ease both' },
    'out-right':  { animation: 'qSlideOutR 0.19s ease both' },
  }[animDir]

  if (!q) return null

  return (
    <>
      <style>{`
        @keyframes qSlideIn    { from { opacity:0; transform: translateX(40px) } to { opacity:1; transform:translateX(0) } }
        @keyframes qSlideOutL  { from { opacity:1; transform: translateX(0)    } to { opacity:0; transform:translateX(-40px) } }
        @keyframes qSlideOutR  { from { opacity:1; transform: translateX(0)    } to { opacity:0; transform:translateX(40px) } }
        @keyframes qNeonPulse  {
          0%,100% { box-shadow: 0 0 10px ${tc.glow}, 0 0 24px ${tc.glow}; }
          50%     { box-shadow: 0 0 20px ${tc.glow}, 0 0 48px ${tc.glow}; }
        }
        @keyframes qBarShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes qBtnPop {
          0%  { transform: scale(1); }
          35% { transform: scale(0.96); }
          70% { transform: scale(1.02); }
          100%{ transform: scale(1); }
        }
      `}</style>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        background: 'linear-gradient(170deg, #04040e 0%, #08081a 55%, #060614 100%)',
        overflowX: 'hidden',
      }}>

        {/* ── Шапка: счётчик вопросов ── */}
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 200,
          background: 'rgba(4,4,14,0.92)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          borderBottom: `1px solid ${tc.primary}30`,
          padding: 'var(--tg-header-h, env(safe-area-inset-top, 0px)) 14px 0',
        }}>
          {/* Строка: название черты слева, счётчик по центру */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 44,
            position: 'relative',
          }}>
            <span style={{
              position: 'absolute', left: 0,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: `${tc.primary}70`,
            }}>
              {tc.label}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: tc.primary, lineHeight: 1 }}>
                {current + 1}
              </span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
                / {questions.length}
              </span>
            </div>
          </div>

          {/* Прогресс-полоса под шапкой */}
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: `linear-gradient(90deg, #7c3aed, ${tc.primary})`,
              backgroundSize: '200% 100%',
              animation: 'qBarShimmer 2s linear infinite',
              borderRadius: '0 2px 2px 0',
              transition: 'width 0.4s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: `0 0 8px ${tc.glow}`,
            }}/>
          </div>
        </div>

        {/* Спейсер под fixed header */}
        <div style={{ height: 'calc(var(--tg-header-h, env(safe-area-inset-top, 0px)) + 47px)', flexShrink: 0 }} />

        {/* ── Тело страницы ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 16px 0',
        }}>

          {/* Карточка вопроса */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '28px 22px',
              background: 'rgba(8,8,24,0.72)',
              borderRadius: 20,
              border: `1.5px solid ${tc.primary}`,
              boxShadow: `0 0 16px ${tc.glow}, 0 0 40px rgba(0,0,0,0.5), inset 0 0 24px rgba(0,0,0,0.3)`,
              marginBottom: 14,
              position: 'relative',
              overflow: 'hidden',
              animation: 'qNeonPulse 2.8s ease-in-out infinite',
              ...animStyle,
            }}
          >
            {/* фоновый gradient-spot */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `radial-gradient(ellipse at top right, ${tc.bg} 0%, transparent 65%)`,
            }}/>
            <p style={{
              fontSize: 19,
              fontWeight: 500,
              lineHeight: 1.6,
              color: '#f0eeff',
              textAlign: 'center',
              position: 'relative',
              zIndex: 1,
            }}>
              {q.question_text}
            </p>
          </div>

          {/* Кнопки ответа */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))',
          }}>
            {[1, 2, 3, 4, 5].map(score => {
              const isSelected = selected === score
              const c = SCORE_COLORS[score - 1]
              return (
                <button
                  key={score}
                  onClick={() => handleSelect(score)}
                  disabled={transitioning || !!milestone}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    background: isSelected
                      ? `rgba(${hexToRgb(c)}, 0.1)`
                      : 'rgba(10,10,26,0.7)',
                    border: `1px solid ${isSelected ? c : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 14,
                    padding: '13px 16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    color: '#f0eeff',
                    textAlign: 'left',
                    boxShadow: isSelected ? `0 0 14px ${c}40` : 'none',
                    animation: isSelected ? 'qBtnPop 0.28s ease' : 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span style={{
                    width: 32, height: 32,
                    borderRadius: '50%',
                    border: `1.5px solid ${isSelected ? c : 'rgba(255,255,255,0.18)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, flexShrink: 0,
                    color: isSelected ? c : 'rgba(255,255,255,0.4)',
                    background: isSelected ? `${c}18` : 'transparent',
                    boxShadow: isSelected ? `0 0 8px ${c}60` : 'none',
                    transition: 'all 0.15s ease',
                  }}>
                    {score}
                  </span>
                  <span style={{
                    fontSize: 14,
                    color: isSelected ? '#f0eeff' : 'rgba(255,255,255,0.5)',
                    transition: 'color 0.15s',
                  }}>
                    {SCORE_LABELS[score - 1]}
                  </span>
                </button>
              )
            })}
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
      </div>
    </>
  )
}

// Конвертер hex → "r, g, b" для rgba()
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
