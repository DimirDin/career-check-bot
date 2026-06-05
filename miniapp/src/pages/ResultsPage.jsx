import { useEffect, useState, useMemo, useRef } from 'react'
import { RadarChart }  from '../components/RadarChart'
import { ShareCard }   from '../components/ShareCard'
import { Confetti }    from '../components/Confetti'
import { useTelegram } from '../hooks/useTelegram'
import { useNavigate } from '../context/NavigationContext'
import { track }       from '../hooks/useAnalytics'

const BOT_USERNAME = 'CareerCheck_Bot'

const TRAIT_LABELS = ['Открытость', 'Сознательность', 'Экстраверсия', 'Доброжелат.', 'Стабильность']
const TRAIT_KEYS   = ['O', 'C', 'E', 'A', 'S']
const RIASEC_KEYS  = ['R', 'I', 'A', 'S', 'E', 'C']
const RIASEC_LABELS = {
  R: 'Реалистичный', I: 'Исследовательский', A: 'Артистичный',
  S: 'Социальный',   E: 'Предприимчивый',    C: 'Конвенциональный',
}
const MEDAL        = ['🥇', '🥈', '🥉']
const MEDAL_COLORS = ['#fbbf24', '#94a3b8', '#cd7c3f']
const TRAIT_DESCRIPTIONS = {
  O: 'Любопытство, творчество, тяга к новому',
  C: 'Организованность, ответственность, настойчивость',
  E: 'Общительность, энергичность, оптимизм',
  A: 'Доброта, сотрудничество, доверие',
  S: 'Эмоциональная устойчивость, спокойствие',
}

export function ResultsPage({ results, onBack }) {
  const { haptic, tg }   = useTelegram()
  const navigate          = useNavigate()
  const [expanded,     setExpanded]     = useState(null)
  const [visible,      setVisible]      = useState(0)
  const [confetti,     setConfetti]     = useState(false)
  const [compareLink,  setCompareLink]  = useState(null)
  const premiumRef     = useRef(null)

  const { normalized_scores: norm, riasec_profile: riasec, top_professions: profs } = results

  const { domRiasec, domLabel, topTrait } = useMemo(() => {
    const dom = Object.entries(riasec).sort((a, b) => b[1] - a[1])[0][0]
    const topScore = Math.max(...TRAIT_KEYS.map(k => norm[k]))
    return {
      domRiasec: dom,
      domLabel:  RIASEC_LABELS[dom],
      topTrait:  TRAIT_KEYS.find(k => norm[k] === topScore),
    }
  }, [norm, riasec])

  // ── Назад ──────────────────────────────────────────────────────────────────
  const handleBack = () => {
    haptic.light?.()
    if (onBack)         onBack()
    else                navigate('/menu')
  }

  // Telegram BackButton
  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(handleBack)
    return () => { tg.BackButton.offClick(handleBack); tg.BackButton.hide() }
  }, [tg]) // eslint-disable-line

  // M1: view_results event
  useEffect(() => { track('view_results') }, [])

  // Последовательный reveal + confetti если топ-матч ≥ 80%
  useEffect(() => {
    haptic.success?.()
    const timers = [0, 200, 400, 600, 800].map((ms, i) =>
      setTimeout(() => setVisible(v => Math.max(v, i + 1)), ms)
    )
    // V6: confetti при высоком match
    if (profs?.[0]?.match >= 80) {
      const t = setTimeout(() => setConfetti(true), 400)
      timers.push(t)
    }
    return () => timers.forEach(clearTimeout)
  }, []) // eslint-disable-line

  // V4: IntersectionObserver — premium shimmer при появлении
  useEffect(() => {
    const el = premiumRef.current
    if (!el) return
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('premium-shimmer-active')
        track('view_premium')
        obs.disconnect()
      }
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // ── Шаринг ────────────────────────────────────────────────────────────────
  const handleShare = () => {
    haptic.medium?.()
    const text = `Прошёл карьерный тест CareerCheck 🚀\nМой тип: ${domLabel}\nУзнай свой → @CareerCheck_Bot`
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=https://careercheck.app&text=${encodeURIComponent(text)}`)
    } else if (navigator.share) {
      navigator.share({ text })
    } else {
      navigator.clipboard?.writeText(text)
      tg?.showAlert?.('Текст скопирован!')
    }
  }

  // ── Compare (N2) ──────────────────────────────────────────────────────────
  const handleCompare = async () => {
    haptic.medium?.()
    track('compare_create')
    try {
      const res  = await fetch('/api/compare/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData }),
      })
      const data = await res.json()
      setCompareLink(data.link)
      if (tg?.openTelegramLink) {
        const text = `Сравни свой профиль с моим 👥 → ${data.link}`
        tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(data.link)}&text=${encodeURIComponent(text)}`)
      }
    } catch (e) {
      tg?.showAlert?.('Ошибка создания ссылки')
    }
  }

  // ── Refer (M3) ────────────────────────────────────────────────────────────
  const handleRefer = () => {
    haptic.medium?.()
    track('refer_click')
    const uid  = user?.id
    const link = `https://t.me/${BOT_USERNAME}?start=ref_${uid}`
    const text = 'Пройди карьерный тест CareerCheck — 10 минут и узнаешь свой профиль!'
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`)
    }
  }

  // ── Premium ────────────────────────────────────────────────────────────────
  const handlePremium = () => {
    haptic.medium?.()
    if (tg?.openTelegramLink) {
      tg.openTelegramLink('https://t.me/CareerCheck_Bot?start=premium')
    } else {
      window.open('https://t.me/CareerCheck_Bot?start=premium', '_blank')
    }
  }

  return (
    <div className="results-page">
      <Confetti active={confetti} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className={`results-hero ${visible >= 1 ? 'visible' : ''}`}>
        <div className="hero-bg" />
        <div className="results-type-label">Твой профессиональный тип</div>
        <div className="results-type-name">{domLabel}</div>
        <div className="results-top-trait">
          Сильная черта: <strong>{TRAIT_LABELS[TRAIT_KEYS.indexOf(topTrait)]}</strong> — {norm[topTrait]}%
        </div>
      </div>

      <div className="tab-content">

        {/* ── Big Five ───────────────────────────────────────────────────── */}
        <div className={`section-card ${visible >= 2 ? 'visible' : ''}`}>
          <h3 className="section-title">Big Five личности</h3>
          <div className="trait-list">
            {TRAIT_KEYS.map((key, i) => (
              <div key={key} className="trait-row">
                <div className="trait-header">
                  <span className="trait-name">{TRAIT_LABELS[i]}</span>
                  <span className="trait-score">{norm[key]}%</span>
                </div>
                <div className="trait-bar-bg">
                  <div className="trait-bar-fill" style={{ width: `${norm[key]}%`, '--delay': `${i * 70}ms` }} />
                </div>
                <p className="trait-desc">{TRAIT_DESCRIPTIONS[key]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Radar Charts ───────────────────────────────────────────────── */}
        <div className={`section-card radars-card ${visible >= 3 ? 'visible' : ''}`}>
          <h3 className="section-title">Радары</h3>
          <div className="radars-row">
            <div className="radar-block">
              <RadarChart values={TRAIT_KEYS.map(k => norm[k])} labels={['O','C','E','A','S']} color="#2ed1f2" size={145} interactive />
              <p className="radar-label">Big Five</p>
            </div>
            <div className="radar-block">
              <RadarChart values={RIASEC_KEYS.map(k => riasec[k])} labels={RIASEC_KEYS} color="#7347e6" size={145} interactive />
              <p className="radar-label">RIASEC</p>
            </div>
          </div>
        </div>

        {/* ── RIASEC ─────────────────────────────────────────────────────── */}
        <div className={`section-card ${visible >= 4 ? 'visible' : ''}`}>
          <h3 className="section-title">RIASEC-профиль</h3>
          <div className="riasec-list">
            {[...RIASEC_KEYS].sort((a, b) => riasec[b] - riasec[a]).map(key => (
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

        {/* ── Профессии ──────────────────────────────────────────────────── */}
        <div className={`section-card ${visible >= 5 ? 'visible' : ''}`}>
          <h3 className="section-title">Топ профессий</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profs.map((prof, i) => (
              <div
                key={i}
                className={`prof-card ${expanded === i ? 'expanded' : ''}`}
                onClick={() => { haptic.light?.(); setExpanded(expanded === i ? null : i) }}
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
                <div className="prof-bar-bg">
                  <div className="prof-bar-fill" style={{ width: `${prof.match}%`, background: MEDAL_COLORS[i] || '#64748b' }} />
                </div>
                {expanded === i && (
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
          </div>
        </div>

        {/* ── Premium (V4: shimmer on first view) ────────────────────────── */}
        <div ref={premiumRef} className="premium-block">
          <div className="premium-title">🌟 Хотите детальный отчёт?</div>
          <div className="premium-desc">
            Premium PDF — 6 страниц с персональным AI‑анализом:<br />
            психологический портрет, карьерное видение, роадмап
          </div>
          <button className="btn-premium" onClick={handlePremium}>
            🌟 Получить Premium PDF — 99 Stars
          </button>
        </div>

        {/* ── Share Card (U4) ────────────────────────────────────────────── */}
        <ShareCard results={results} />

        {/* ── Compare + Refer (N2, M3) ───────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="share-card-btn" style={{ flex: 1 }} onClick={handleCompare}>
            👥 {initData ? (tg?.initDataUnsafe?.user?.language_code?.startsWith('ru') ? 'Сравнить с другом' : 'Compare with friend') : 'Compare'}
          </button>
          <button className="share-card-btn" style={{ flex: 1 }} onClick={handleRefer}>
            🔗 {tg?.initDataUnsafe?.user?.language_code?.startsWith('ru') ? 'Пригласить' : 'Invite'}
          </button>
        </div>

        {/* ── Кнопка Назад ───────────────────────────────────────────────── */}
        <button className="btn-back-results" onClick={handleBack}>
          ← Назад в меню
        </button>

        <p className="results-footer">@Dimirdin · CareerCheck</p>

      </div>
    </div>
  )
}
