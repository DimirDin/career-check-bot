import { useEffect, useState, useMemo } from 'react'
import { useTelegram } from '../hooks/useTelegram'

const RIASEC_LABELS_RU = { R:'Реалистичный', I:'Исследовательский', A:'Артистичный', S:'Социальный', E:'Предприимчивый', C:'Конвенциональный' }
const RIASEC_LABELS_EN = { R:'Realistic', I:'Investigative', A:'Artistic', S:'Social', E:'Enterprising', C:'Conventional' }
const RIASEC_KEYS = ['R','I','A','S','E','C']
const MEDAL_COLORS = ['#fbbf24','#94a3b8','#cd7c3f']
const GROWTH_COLOR = { 'Высокий':'#3fd98f', 'High':'#3fd98f', 'Средний':'#fbbf24', 'Medium':'#fbbf24', 'Низкий':'#f97316', 'Low':'#f97316' }

export function ProfessionsPage({ userResults, onBack, onSelectProfession }) {
  const { tg, haptic, initData } = useTelegram()
  const lang  = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu  = lang !== 'en'
  const rl    = isRu ? RIASEC_LABELS_RU : RIASEC_LABELS_EN

  const [professions, setProfessions] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [filterR,     setFilterR]     = useState(null)  // RIASEC filter
  const [expanded,    setExpanded]    = useState(null)

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  useEffect(() => {
    const params = new URLSearchParams({ lang })
    if (initData) params.set('init_data', initData)
    fetch(`/api/professions?${params}`)
      .then(r => r.json())
      .then(d => { setProfessions(d.professions || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [initData, lang])

  const filtered = useMemo(() => {
    let list = professions
    if (filterR) list = list.filter(p => p.riasec_type === filterR)
    if (search)  list = list.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()))
    // Sort: with match first
    return [...list].sort((a, b) => (b.match || 0) - (a.match || 0))
  }, [professions, filterR, search])

  // Top-3 from user results
  const topTitles = useMemo(() => {
    return (userResults?.top_professions || []).slice(0, 3).map(p => p.title)
  }, [userResults])

  const T = {
    title:    isRu ? 'Профессии'        : 'Careers',
    search:   isRu ? 'Поиск...'         : 'Search...',
    all:      isRu ? 'Все'              : 'All',
    match:    isRu ? 'совпадение'       : 'match',
    growth:   isRu ? 'Перспективность:' : 'Growth:',
    top3:     isRu ? 'Ваш топ'          : 'Your top',
    detail:   isRu ? 'Подробнее →'      : 'Details →',
    back:     isRu ? '← Назад'          : '← Back',
    empty:    isRu ? 'Ничего не найдено'  : 'Nothing found',
    noMatch:  isRu ? 'Пройдите тест для совпадения' : 'Take the test to see match',
  }

  return (
    <div className="profs-page">
      {/* Header */}
      <div className="profs-header">
        <h2 className="profs-title">{T.title}</h2>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{professions.length}</span>
      </div>

      {/* Search */}
      <div style={{ padding: '0 16px 8px' }}>
        <input
          className="chat-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={T.search}
          style={{ width: '100%' }}
        />
      </div>

      {/* RIASEC filter */}
      <div className="profs-filters">
        <button
          className={`profs-filter-btn ${!filterR ? 'profs-filter-active' : ''}`}
          onClick={() => { haptic.select(); setFilterR(null) }}
        >{T.all}</button>
        {RIASEC_KEYS.map(k => (
          <button
            key={k}
            className={`profs-filter-btn ${filterR === k ? 'profs-filter-active' : ''}`}
            onClick={() => { haptic.select(); setFilterR(filterR === k ? null : k) }}
          >{k}</button>
        ))}
      </div>

      {/* List */}
      <div className="profs-list">
        {loading && <div className="loading-screen" style={{ minHeight: 200 }}><div className="loading-spinner" /></div>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 24px', color: 'rgba(255,255,255,0.4)' }}>{T.empty}</div>
        )}

        {filtered.map((prof, i) => {
          const isTop    = topTitles.includes(prof.title)
          const topIdx   = topTitles.indexOf(prof.title)
          const isExpand = expanded === i

          return (
            <div
              key={i}
              className={`profs-card ${isExpand ? 'profs-card-expanded' : ''}`}
              onClick={() => { haptic.light(); setExpanded(isExpand ? null : i) }}
            >
              <div className="profs-card-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    {isTop && (
                      <span style={{ fontSize: 14, color: MEDAL_COLORS[topIdx] || '#fbbf24' }}>
                        {['🥇','🥈','🥉'][topIdx] || '★'}
                      </span>
                    )}
                    <span className="profs-card-title">{prof.title}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="profs-card-riasec">{rl[prof.riasec_type] || prof.riasec_type}</span>
                    {prof.growth_potential && (
                      <span style={{ fontSize: 11, color: GROWTH_COLOR[prof.growth_potential] || '#94a3b8' }}>
                        {T.growth} {prof.growth_potential}
                      </span>
                    )}
                  </div>
                </div>
                {prof.match != null ? (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: prof.match >= 75 ? '#3fd98f' : prof.match >= 50 ? '#fbbf24' : '#94a3b8' }}>
                      {prof.match}%
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{T.match}</div>
                  </div>
                ) : (
                  <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.2)' }}>›</span>
                )}
              </div>

              {/* Match bar */}
              {prof.match != null && (
                <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${prof.match}%`, height: '100%', background: prof.match >= 75 ? '#3fd98f' : '#7347e6', borderRadius: 2 }} />
                </div>
              )}

              {/* Expanded */}
              {isExpand && (
                <div className="profs-card-expand">
                  {prof.description && (
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, margin: '12px 0 8px' }}>
                      {prof.description}
                    </p>
                  )}
                  {!prof.match && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{T.noMatch}</p>
                  )}
                  <button
                    className="profs-detail-btn"
                    onClick={e => { e.stopPropagation(); haptic.medium(); onSelectProfession(prof.title) }}
                  >
                    {T.detail}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <button className="btn-back-results" onClick={onBack}>{T.back}</button>
      </div>
    </div>
  )
}
