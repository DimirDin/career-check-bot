import { useEffect, useState } from 'react'
import { RadarChart } from '../components/RadarChart'
import { useTelegram } from '../hooks/useTelegram'

const TRAIT_LABELS = ['Открытость', 'Сознат.', 'Экстравер.', 'Согласие', 'Стабильность']
const TRAIT_KEYS   = ['O', 'C', 'E', 'A', 'S']
const RIASEC_KEYS  = ['R', 'I', 'A', 'S', 'E', 'C']
const RIASEC_LABELS = {
  R: 'Реалистичный', I: 'Исследовательский', A: 'Артистичный',
  S: 'Социальный', E: 'Предприимчивый', C: 'Конвенциональный',
}

const MEDAL = ['🥇', '🥈', '🥉']
const MEDAL_COLORS = ['#fbbf24', '#94a3b8', '#cd7c3f']

const TRAIT_DESCRIPTIONS = {
  O: 'Любопытство, творчество, тяга к новому',
  C: 'Организованность, ответственность, настойчивость',
  E: 'Общительность, энергичность, оптимизм',
  A: 'Доброта, сотрудничество, доверие',
  S: 'Эмоциональная устойчивость, спокойствие',
}

export function ResultsPage({ results }) {
  const { haptic, tg } = useTelegram()
  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'professions'
  const [visibleSection, setVisibleSection] = useState(0)
  const [expandedProf, setExpandedProf] = useState(null)

  const { normalized_scores: norm, riasec_profile: riasec, top_professions: profs } = results

  const domRiasec = Object.entries(riasec).sort((a, b) => b[1] - a[1])[0][0]
  const domLabel = RIASEC_LABELS[domRiasec]

  // Последовательно показываем секции
  useEffect(() => {
    haptic.success()
    const timers = [0, 300, 600, 900].map((delay, i) =>
      setTimeout(() => setVisibleSection(i + 1), delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  const handleShare = () => {
    haptic.medium()
    if (tg?.switchInlineQuery) {
      tg.switchInlineQuery(`Мой тип: ${domLabel} — узнай свой на @CareerCheckBot`)
    }
  }

  const handleTabChange = (tab) => {
    haptic.light()
    setActiveTab(tab)
  }

  const topScore = Math.max(...TRAIT_KEYS.map(k => norm[k]))
  const topTrait = TRAIT_KEYS.find(k => norm[k] === topScore)

  return (
    <div className="results-page">

      {/* Hero */}
      <div className={`results-hero ${visibleSection >= 1 ? 'visible' : ''}`}>
        <div className="hero-bg" />
        <div className="results-type-label">Твой профессиональный тип</div>
        <div className="results-type-name">{domLabel}</div>
        <div className="results-top-trait">
          Сильная черта: <strong>{TRAIT_LABELS[TRAIT_KEYS.indexOf(topTrait)]}</strong> — {norm[topTrait]}%
        </div>
      </div>

      {/* Tabs */}
      <div className="results-tabs">
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabChange('profile')}
        >
          Профиль
        </button>
        <button
          className={`tab-btn ${activeTab === 'professions' ? 'active' : ''}`}
          onClick={() => handleTabChange('professions')}
        >
          Профессии
        </button>
      </div>

      {/* PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className="tab-content">

          {/* Trait bars */}
          <div className={`section-card ${visibleSection >= 2 ? 'visible' : ''}`}>
            <h3 className="section-title">Big Five личности</h3>
            <div className="trait-list">
              {TRAIT_KEYS.map((key, i) => (
                <div key={key} className="trait-row">
                  <div className="trait-header">
                    <span className="trait-name">{TRAIT_LABELS[i]}</span>
                    <span className="trait-score">{norm[key]}%</span>
                  </div>
                  <div className="trait-bar-bg">
                    <div
                      className="trait-bar-fill"
                      style={{ width: `${norm[key]}%`, '--delay': `${i * 80}ms` }}
                    />
                  </div>
                  <p className="trait-desc">{TRAIT_DESCRIPTIONS[key]}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Radars */}
          <div className={`section-card radars-card ${visibleSection >= 3 ? 'visible' : ''}`}>
            <h3 className="section-title">Радары</h3>
            <div className="radars-row">
              <div className="radar-block">
                <RadarChart
                  values={TRAIT_KEYS.map(k => norm[k])}
                  labels={['O', 'C', 'E', 'A', 'S']}
                  color="#06b6d4"
                  size={150}
                />
                <p className="radar-label">Big Five</p>
              </div>
              <div className="radar-block">
                <RadarChart
                  values={RIASEC_KEYS.map(k => riasec[k])}
                  labels={RIASEC_KEYS}
                  color="#7c3aed"
                  size={150}
                />
                <p className="radar-label">RIASEC</p>
              </div>
            </div>
          </div>

          {/* RIASEC breakdown */}
          <div className={`section-card ${visibleSection >= 4 ? 'visible' : ''}`}>
            <h3 className="section-title">RIASEC-профиль</h3>
            <div className="riasec-list">
              {RIASEC_KEYS.sort((a, b) => riasec[b] - riasec[a]).map(key => (
                <div key={key} className={`riasec-row ${key === domRiasec ? 'riasec-dom' : ''}`}>
                  <span className="riasec-key">{key}</span>
                  <span className="riasec-name">{RIASEC_LABELS[key]}</span>
                  <div className="riasec-bar-bg">
                    <div className="riasec-bar-fill" style={{ width: `${riasec[key]}%` }} />
                  </div>
                  <span className="riasec-val">{riasec[key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PROFESSIONS TAB */}
      {activeTab === 'professions' && (
        <div className="tab-content">
          {profs.map((prof, i) => (
            <div
              key={i}
              className={`prof-card ${expandedProf === i ? 'expanded' : ''}`}
              onClick={() => {
                haptic.light()
                setExpandedProf(expandedProf === i ? null : i)
              }}
            >
              <div className="prof-header">
                <span className="prof-medal">{MEDAL[i] || `#${i + 1}`}</span>
                <div className="prof-info">
                  <p className="prof-title">{prof.title}</p>
                  <p className="prof-riasec">{RIASEC_LABELS[prof.riasec] || prof.riasec}</p>
                </div>
                <div className="prof-match" style={{ '--color': MEDAL_COLORS[i] || '#64748b' }}>
                  {prof.match}%
                </div>
              </div>

              {/* Match bar */}
              <div className="prof-bar-bg">
                <div
                  className="prof-bar-fill"
                  style={{
                    width: `${prof.match}%`,
                    background: MEDAL_COLORS[i] || '#64748b',
                  }}
                />
              </div>

              {expandedProf === i && (
                <div className="prof-details">
                  <p className="prof-desc">{prof.description}</p>
                  {prof.growth && (
                    <div className="prof-growth">
                      <span className="growth-label">Перспективность:</span>
                      <span className="growth-val">{prof.growth}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Share */}
          <button className="btn-share" onClick={handleShare}>
            Поделиться результатом
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 2l2 2-2 2M14 4H5a3 3 0 000 6h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <p className="results-footer">@Dimirdin · CareerCheck</p>
        </div>
      )}
    </div>
  )
}
