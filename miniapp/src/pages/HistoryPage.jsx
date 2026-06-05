import { useEffect } from 'react'
import { useTelegram }  from '../hooks/useTelegram'
import { useUserState } from '../hooks/useUserState'

const T = {
  ru: {
    title: 'История тестов',
    empty_title: 'Ты ещё не проходил тест',
    empty_desc: 'Узнай свой карьерный профиль — это займёт около 10 минут',
    cta: 'Начать тест',
    one_title: 'Хочешь узнать, изменился ли ты?',
    one_desc: 'Личность меняется. Пройди тест повторно через 3 месяца и сравни результаты.',
    retake: 'Пройти снова',
    back: '← Назад',
    last: 'Последнее прохождение',
    count: (n) => `${n} прохождений`,
  },
  en: {
    title: 'Test History',
    empty_title: "You haven't taken the test yet",
    empty_desc: 'Discover your career profile — it takes about 10 minutes',
    cta: 'Start test',
    one_title: 'Want to see if you changed?',
    one_desc: 'Personality evolves. Retake the test in 3 months and compare.',
    retake: 'Retake test',
    back: '← Back',
    last: 'Last taken',
    count: (n) => `${n} attempts`,
  },
}

export function HistoryPage({ lastResult, onBack, onStartTest }) {
  const { tg, haptic, initData } = useTelegram()
  const { state, loading }        = useUserState(initData)
  const lang        = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const t           = T[lang] || T.en
  const historyCount = state?.historyCount ?? (lastResult ? 1 : 0)
  // Используем lastResult из props или из state
  const result = lastResult || (state?.hasResults ? { completed_at: state.lastResultDate, normalized_scores: {} } : null)

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  function handleCTA() {
    haptic.medium()
    onStartTest()
  }

  if (loading) {
    return (
      <div className="history-page">
        <div className="history-header"><h2 className="history-title">{t.title}</h2></div>
        <div className="loading-screen"><div className="loading-spinner" /><p className="loading-text">...</p></div>
      </div>
    )
  }

  // Empty state
  if (!result || historyCount === 0) {
    return (
      <div className="history-page">
        <div className="history-header">
          <h2 className="history-title">{t.title}</h2>
        </div>
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <circle cx="36" cy="36" r="35" stroke="rgba(124,58,237,0.3)" strokeWidth="1.5" strokeDasharray="4 4"/>
              <circle cx="36" cy="36" r="24" fill="rgba(124,58,237,0.08)" stroke="rgba(124,58,237,0.2)" strokeWidth="1"/>
              <path d="M28 36h16M36 28v16" stroke="#7347e6" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className="history-empty-title">{t.empty_title}</h3>
          <p className="history-empty-desc">{t.empty_desc}</p>
          <button className="history-cta-btn" onClick={handleCTA}>{t.cta}</button>
        </div>
        <button className="btn-back-results" style={{ margin: '0 16px' }} onClick={onBack}>{t.back}</button>
      </div>
    )
  }

  // Has results — show last result + retake CTA
  const norm     = result?.normalized_scores || {}
  const normEntries = Object.entries(norm).filter(([,v]) => v > 0)
  const topTrait = normEntries.length ? normEntries.sort((a, b) => b[1] - a[1])[0] : null
  const dateStr  = result?.completed_at || state?.lastResultDate

  return (
    <div className="history-page">
      <div className="history-header">
        <h2 className="history-title">{t.title}</h2>
        <span className="history-count">{t.count(historyCount)}</span>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Last result card */}
        <div className="history-result-card">
          <div className="history-result-label">{t.last}</div>
          {dateStr && (
            <div className="history-result-date">
              {new Date(dateStr).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </div>
          )}
          {topTrait && (
            <div className="history-top-trait">
              {lang === 'ru' ? 'Сильнейшая черта' : 'Top trait'}:{' '}
              <strong>{topTrait[0]}</strong> — {topTrait[1]}%
            </div>
          )}
        </div>

        {/* Retake CTA */}
        <div className="history-retake-card">
          <h3 className="history-retake-title">{t.one_title}</h3>
          <p className="history-retake-desc">{t.one_desc}</p>
          <button className="history-cta-btn" onClick={handleCTA}>{t.retake}</button>
        </div>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <button className="btn-back-results" onClick={onBack}>{t.back}</button>
      </div>
    </div>
  )
}
