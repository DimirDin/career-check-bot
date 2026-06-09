import { useEffect, useState } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss'

const TRAITS    = ['O','C','E','A','S']
const TRAIT_RU  = { O:'Открытость', C:'Сознательность', E:'Экстраверсия', A:'Доброжелательность', S:'Стабильность' }
const TRAIT_EN  = { O:'Openness',   C:'Conscientiousness', E:'Extraversion', A:'Agreeableness', S:'Stability' }
const TRAIT_CLR = { O:'#2ed1f2', C:'#7347e6', E:'#fbbf24', A:'#3fd98f', S:'#f97316' }
const GROWTH_COLOR = { 'Высокий':'#3fd98f','High':'#3fd98f','Средний':'#fbbf24','Medium':'#fbbf24','Низкий':'#f97316','Low':'#f97316' }

export function ProfessionDetailPage({ professionTitle, userResults, onBack }) {
  const { tg, haptic } = useTelegram()
  const lang  = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu  = lang !== 'en'
  const tn    = isRu ? TRAIT_RU : TRAIT_EN
  const { ref: swipeRef, handlers: swipeHandlers } = useSwipeToDismiss(onBack)

  const [prof,    setProf]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  useEffect(() => {
    if (!professionTitle) return
    fetch(`/api/professions/detail?title=${encodeURIComponent(professionTitle)}&lang=${lang}`)
      .then(r => r.json())
      .then(d => { setProf(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [professionTitle, lang])

  const T = {
    required:   isRu ? 'Требуемые черты личности' : 'Required personality traits',
    yourProfile: isRu ? 'Твой профиль'            : 'Your profile',
    required_s: isRu ? 'Требуется'                : 'Required',
    pros:        isRu ? 'Плюсы'                   : 'Pros',
    cons:        isRu ? 'Минусы'                  : 'Cons',
    reality:     isRu ? 'Реальность профессии'    : 'Career reality',
    salary:      isRu ? 'Зарплатный диапазон'     : 'Salary range',
    growth:      isRu ? 'Перспективность'         : 'Growth potential',
    back:        isRu ? '← Назад'                 : '← Back',
    loading:     isRu ? 'Загрузка...'             : 'Loading...',
    notfound:    isRu ? 'Профессия не найдена'    : 'Profession not found',
  }

  if (loading) {
    return (
      <div className="prof-detail-page">
        <div className="loading-screen"><div className="loading-spinner" /><p className="loading-text">{T.loading}</p></div>
      </div>
    )
  }
  if (!prof) {
    return (
      <div className="prof-detail-page">
        <div style={{ padding: 24, color: 'rgba(255,255,255,0.5)' }}>{T.notfound}</div>
        <button className="btn-back-results" style={{ margin: '0 16px' }} onClick={onBack}>{T.back}</button>
      </div>
    )
  }

  const userNorm = userResults?.normalized_scores || {}
  const reqTraits = prof.required_traits || {}
  const details   = prof.details || {}
  const pros = Array.isArray(details.pros) ? details.pros : []
  const cons = Array.isArray(details.cons) ? details.cons : []

  return (
    <div className="prof-detail-page swipe-page" ref={swipeRef} {...swipeHandlers}>
      {/* Hero */}
      <div className="prof-detail-hero">
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          {prof.riasec_type}
        </div>
        <h1 className="prof-detail-title">{prof.title}</h1>
        {prof.description && (
          <p className="prof-detail-desc">{prof.description}</p>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          {prof.salary_range && (
            <div className="prof-detail-badge">
              💰 {prof.salary_range}
            </div>
          )}
          {prof.growth_potential && (
            <div className="prof-detail-badge" style={{ color: GROWTH_COLOR[prof.growth_potential] || '#94a3b8', borderColor: GROWTH_COLOR[prof.growth_potential] || '#94a3b8' }}>
              📈 {T.growth}: {prof.growth_potential}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Trait comparison */}
        <div className="section-card" style={{ opacity: 1, transform: 'none' }}>
          <h3 className="section-title">{T.required}</h3>
          {TRAITS.map(t => {
            const req   = reqTraits[t] || 0
            const yours = userNorm[t] || 0
            const hasUser = yours > 0
            return (
              <div key={t} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{tn[t]}</span>
                  <div style={{ display: 'flex', gap: 8, fontSize: 12 }}>
                    {hasUser && <span style={{ color: '#2ed1f2' }}>{T.yourProfile}: {yours}%</span>}
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>{T.required_s}: {req}%</span>
                  </div>
                </div>
                {/* Required bar */}
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden', marginBottom: 3 }}>
                  <div style={{ width: `${req}%`, height: '100%', background: 'rgba(255,255,255,0.25)', borderRadius: 3 }} />
                </div>
                {/* User bar */}
                {hasUser && (
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${yours}%`, height: '100%', background: TRAIT_CLR[t], borderRadius: 3, opacity: 0.9 }} />
                  </div>
                )}
              </div>
            )
          })}
          {Object.keys(userNorm).length === 0 && (
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 8, textAlign: 'center' }}>
              {isRu ? 'Пройди тест чтобы увидеть совпадение' : 'Take the test to see your match'}
            </p>
          )}
        </div>

        {/* Персонализированная секция "Подходит тебе" */}
        {Object.keys(userNorm).length > 0 && Object.keys(reqTraits).length > 0 && (() => {
          // Считаем совпадение
          const diffs = TRAITS.map(t => Math.abs((userNorm[t] || 0) - (reqTraits[t] || 50)))
          const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length
          const matchPct = Math.max(0, Math.min(100, Math.round(100 - avgDiff)))
          const matchColor = matchPct >= 70 ? '#22d3a5' : matchPct >= 50 ? '#fbbf24' : '#f97316'
          return (
            <div style={{
              background: 'rgba(34,211,165,0.06)',
              border: `1px solid ${matchColor}40`,
              borderRadius: 14, padding: 16,
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: matchColor, margin: '0 0 12px' }}>
                {isRu ? `Подходит тебе на ${matchPct}%` : `${matchPct}% match for you`}
              </h3>
              {TRAITS.map(t => {
                const userVal = userNorm[t] || 0
                const reqVal  = reqTraits[t] || 50
                const diff    = userVal - reqVal
                const isGood  = diff >= -15
                const col     = TRAIT_CLR[t]
                return (
                  <div key={t} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', width: 110, flexShrink: 0 }}>{tn[t]}</span>
                      <div style={{ flex: 1, position: 'relative', height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                        <div style={{
                          position: 'absolute', left: 0, top: 0,
                          width: `${userVal}%`, height: '100%',
                          background: isGood ? col : '#f97316',
                          borderRadius: 3, opacity: 0.85,
                        }}/>
                        {/* Requirement marker */}
                        <div style={{
                          position: 'absolute', top: -2,
                          left: `${reqVal}%`,
                          width: 2, height: 10,
                          background: 'rgba(255,255,255,0.5)',
                          borderRadius: 1,
                        }}/>
                      </div>
                      <span style={{ fontSize: 12, color: isGood ? '#22d3a5' : '#f97316', width: 16, textAlign: 'center' }}>
                        {isGood ? '✓' : '↑'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Reality */}
        {details.reality && (
          <div className="section-card" style={{ opacity: 1, transform: 'none' }}>
            <h3 className="section-title">{T.reality}</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 1.65, margin: 0 }}>{details.reality}</p>
          </div>
        )}

        {/* Pros & Cons */}
        {(pros.length > 0 || cons.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {pros.length > 0 && (
              <div className="section-card" style={{ opacity: 1, transform: 'none' }}>
                <h3 className="section-title" style={{ color: '#3fd98f' }}>✓ {T.pros}</h3>
                {pros.map((p, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, paddingLeft: 8, borderLeft: '2px solid #3fd98f' }}>
                    {p}
                  </div>
                ))}
              </div>
            )}
            {cons.length > 0 && (
              <div className="section-card" style={{ opacity: 1, transform: 'none' }}>
                <h3 className="section-title" style={{ color: '#f97316' }}>✗ {T.cons}</h3>
                {cons.map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 6, paddingLeft: 8, borderLeft: '2px solid #f97316' }}>
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button className="btn-back-results" onClick={onBack}>{T.back}</button>
      </div>
    </div>
  )
}
