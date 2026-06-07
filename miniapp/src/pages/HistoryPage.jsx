import { useEffect, useState } from 'react'
import { useTelegram }          from '../hooks/useTelegram'
import { useSwipeToDismiss }    from '../hooks/useSwipeToDismiss'
import { AppHeader }            from '../components/AppHeader/AppHeader'

const TRAITS     = ['O', 'C', 'E', 'A', 'S']
const TRAIT_RU   = { O:'Открытость', C:'Сознат.', E:'Экстравер.', A:'Доброжелат.', S:'Стабильность' }
const TRAIT_EN   = { O:'Openness',   C:'Consc.',  E:'Extraver.',  A:'Agreeable.',  S:'Stability' }
const TRAIT_COLOR= { O:'#2ed1f2', C:'#7347e6', E:'#fbbf24', A:'#3fd98f', S:'#f97316' }

function formatDate(iso, lang) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function MiniTraitBar({ trait, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <span style={{ width: 16, fontSize: 11, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>{trait}</span>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: TRAIT_COLOR[trait], borderRadius: 3 }} />
      </div>
      <span style={{ width: 30, fontSize: 11, color: '#2ed1f2', textAlign: 'right', flexShrink: 0 }}>{value}%</span>
    </div>
  )
}

function DeltaBadge({ delta }) {
  if (Math.abs(delta) < 2) return <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>≈</span>
  const up = delta > 0
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: up ? '#3fd98f' : '#f97316' }}>
      {up ? '↑' : '↓'}{Math.abs(delta)}%
    </span>
  )
}

export function HistoryPage({ lastResult, onBack, onStartTest }) {
  const { tg, haptic, initData } = useTelegram()
  const lang  = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu  = lang !== 'en'
  const tn    = isRu ? TRAIT_RU : TRAIT_EN
  const { ref: swipeRef, handlers: swipeHandlers } = useSwipeToDismiss(onBack)

  const [results,  setResults]  = useState(null)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  useEffect(() => {
    if (!initData) { setLoading(false); return }
    fetch(`/api/history?init_data=${encodeURIComponent(initData)}`)
      .then(r => r.json())
      .then(d => { setResults(d.results || []); setLoading(false) })
      .catch(() => { setResults([]); setLoading(false) })
  }, [initData])

  const T = {
    title:     isRu ? 'История тестов'          : 'Test History',
    empty:     isRu ? 'Ты ещё не проходил тест' : "You haven't taken the test yet",
    emptyDesc: isRu ? 'Пройди тест чтобы увидеть историю и динамику' : 'Take the test to see your history and dynamics',
    cta:       isRu ? 'Начать тест'             : 'Start test',
    test:      isRu ? 'Тест'                    : 'Test',
    top:       isRu ? 'Топ профессия'           : 'Top career',
    change:    isRu ? 'Изменения относительно первого теста' : 'Changes from first test',
    back:      isRu ? '← Назад'                : '← Back',
    retake:    isRu ? 'Пройти снова'            : 'Retake',
    count:     (n) => isRu ? `${n} прохождений` : `${n} attempts`,
  }

  if (loading) {
    return (
      <div className="history-page">
        <div className="history-header"><h2 className="history-title">{T.title}</h2></div>
        <div className="history-header-spacer" />
        <div className="loading-screen"><div className="loading-spinner" /></div>
      </div>
    )
  }

  if (!results || results.length === 0) {
    return (
      <div className="history-page">
        <div className="history-header"><h2 className="history-title">{T.title}</h2></div>
        <div className="history-header-spacer" />
        <div className="history-empty">
          <div className="history-empty-icon">
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <circle cx="36" cy="36" r="35" stroke="rgba(124,58,237,0.3)" strokeWidth="1.5" strokeDasharray="4 4"/>
              <circle cx="36" cy="36" r="24" fill="rgba(124,58,237,0.08)" stroke="rgba(124,58,237,0.2)" strokeWidth="1"/>
              <path d="M28 36h16M36 28v16" stroke="#7347e6" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className="history-empty-title">{T.empty}</h3>
          <p className="history-empty-desc">{T.emptyDesc}</p>
          <button className="history-cta-btn" onClick={() => { haptic.medium(); onStartTest() }}>{T.cta}</button>
        </div>
        <button className="btn-back-results" style={{ margin: '0 16px' }} onClick={onBack}>{T.back}</button>
      </div>
    )
  }

  const first  = results[0]
  const latest = results[results.length - 1]
  const multi  = results.length > 1

  return (
    <div className="history-page swipe-page" ref={swipeRef} {...swipeHandlers}>
      <AppHeader />

      <div style={{ padding: '0 16px', paddingTop: 'var(--page-top)', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Счётчик */}
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: -6 }}>
          {T.count(results.length)}
        </div>

        {/* Динамика изменений (если 2+ теста) */}
        {multi && (
          <div className="history-delta-card">
            <div className="history-delta-title">{T.change}</div>
            <div className="history-delta-grid">
              {TRAITS.map(t => {
                const delta = (latest.normalized_scores?.[t] || 0) - (first.normalized_scores?.[t] || 0)
                return (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', width: '55%' }}>{tn[t]}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, color: TRAIT_COLOR[t] }}>{first.normalized_scores?.[t] || 0}%</span>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>→</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: TRAIT_COLOR[t] }}>{latest.normalized_scores?.[t] || 0}%</span>
                      <DeltaBadge delta={delta} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Лента результатов — от новых к старым */}
        {[...results].reverse().map((r, idx) => {
          const num    = results.length - idx
          const norm   = r.normalized_scores || {}
          const top    = r.top_professions?.[0]
          const dom    = r.riasec_profile
            ? Object.entries(r.riasec_profile).sort((a, b) => b[1] - a[1])[0]?.[0]
            : '?'

          return (
            <div key={idx} className="history-entry-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {T.test} #{num}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginTop: 2 }}>
                    {formatDate(r.completed_at, lang)}
                  </div>
                </div>
                {top && (
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{T.top}</div>
                    <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 600, maxWidth: 130, textAlign: 'right' }}>{top.title}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24' }}>{top.match}%</div>
                  </div>
                )}
              </div>

              {/* Mini Big Five bars */}
              <div>
                {TRAITS.map(t => (
                  <MiniTraitBar key={t} trait={t} value={norm[t] || 0} />
                ))}
              </div>

              {/* RIASEC type */}
              <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>RIASEC</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#7347e6', background: 'rgba(115,71,230,0.15)', borderRadius: 4, padding: '2px 8px' }}>{dom}</span>
              </div>
            </div>
          )
        })}

        {/* Retake CTA */}
        <button className="history-cta-btn" onClick={() => { haptic.medium(); onStartTest() }}>
          {T.retake}
        </button>

        <button className="btn-back-results" onClick={onBack}>{T.back}</button>
      </div>
    </div>
  )
}
