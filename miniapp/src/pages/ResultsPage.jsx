import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { RadarChart }      from '../components/RadarChart'
import { ShareCard }       from '../components/ShareCard'
import { Confetti }        from '../components/Confetti'
import { TypewriterText }  from '../components/TypewriterText'
import { OdometerNumber }  from '../components/OdometerNumber'
import { MagneticBtn }     from '../components/MagneticBtn'
import { ProfessionMatchRow } from '../components/ProfessionMatchRow'
import { useTelegram }     from '../hooks/useTelegram'
import { useNavigate }     from '../context/NavigationContext'
import { track }           from '../hooks/useAnalytics'
import { getBadges }       from '../utils/calculator'
import { getTraitInterpretation } from '../utils/traitInterpretations'

const isRuLang = (tg) => tg?.initDataUnsafe?.user?.language_code?.startsWith('ru')

const BOT_USERNAME = 'CareerCheck_Bot'

const TRAIT_LABELS = ['Открытость', 'Сознательность', 'Экстраверсия', 'Доброжелательность', 'Стабильность']
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
  const { haptic, tg, user, initData } = useTelegram()
  const navigate = useNavigate()
  const lang = tg?.initDataUnsafe?.user?.language_code?.startsWith('ru') ? 'ru' : 'en'
  const [expanded,        setExpanded]        = useState(null)
  const [percentiles,     setPercentiles]     = useState(null)
  const [confetti,        setConfetti]        = useState(false)
  const [compareLink,     setCompareLink]     = useState(null)
  const [premiumLoading,  setPremiumLoading]  = useState(false)
  const [premiumMsg,      setPremiumMsg]      = useState(null)
  const [referralProgress, setReferralProgress] = useState(null)
  const premiumRef = useRef(null)

  const norm   = results?.normalized_scores || {}
  const riasec = results?.riasec_profile    || {}
  const profs  = results?.top_professions   || []

  const badges = useMemo(() => getBadges(norm), [norm])

  const { domRiasec, domLabel, topTrait } = useMemo(() => {
    const entries = Object.entries(riasec)
    const dom = entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : 'I'
    const scores = TRAIT_KEYS.map(k => norm[k] || 0)
    const topScore = Math.max(...scores, 0)
    return {
      domRiasec: dom,
      domLabel:  RIASEC_LABELS[dom] || dom,
      topTrait:  TRAIT_KEYS.find(k => norm[k] === topScore) || 'O',
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

  // Перцентили
  useEffect(() => {
    const uid = user?.id || tg?.initDataUnsafe?.user?.id
    if (!uid) return
    fetch(`/api/stats/percentiles/${uid}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setPercentiles(d))
      .catch(() => {})
  }, [user, tg])

  // T7: referral progress — грузим и обновляем раз в 30 сек пока бонус не выдан
  const loadReferralProgress = useCallback(async () => {
    if (!initData) return
    try {
      const r = await fetch(`/api/referral/progress?init_data=${encodeURIComponent(initData)}`)
      if (!r.ok) return
      const d = await r.json()
      setReferralProgress(d)
    } catch {}
  }, [initData])

  useEffect(() => {
    loadReferralProgress()
    const interval = setInterval(() => {
      setReferralProgress(prev => {
        if (prev?.granted) return prev // бонус уже выдан — не опрашиваем
        return prev
      })
      loadReferralProgress()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadReferralProgress])

  // Confetti если топ-матч ≥ 80%
  useEffect(() => {
    haptic.success?.()
    if (profs?.[0]?.match >= 80) {
      const t = setTimeout(() => setConfetti(true), 600)
      return () => clearTimeout(t)
    }
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

  // ── Открыть ссылку в Telegram (универсальный helper) ────────────────────
  const openLink = (url) => {
    if (tg?.openTelegramLink) tg.openTelegramLink(url)
    else if (tg?.openLink)    tg.openLink(url)
    else window.open(url, '_blank')
  }

  // ── Compare (N2) ──────────────────────────────────────────────────────────
  const handleCompare = async () => {
    haptic.medium?.()
    track('compare_create')
    if (!initData) {
      // Нет initData — просто копируем ссылку на приложение
      const link = 'https://careercheck.app'
      navigator.clipboard?.writeText(link).catch(() => {})
      tg?.showAlert?.('Открой CareerCheck в Telegram для создания ссылки сравнения')
      return
    }
    try {
      const res  = await fetch('/api/compare/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCompareLink(data.link)
      const text = isRuLang(tg)
        ? `Сравни свой профиль с моим 👥 → ${data.link}`
        : `Compare your profile with mine 👥 → ${data.link}`
      openLink(`https://t.me/share/url?url=${encodeURIComponent(data.link)}&text=${encodeURIComponent(text)}`)
    } catch (e) {
      console.error('Compare error:', e)
      if (tg?.showAlert) tg.showAlert('Ошибка создания ссылки. Попробуй позже.')
      else alert('Ошибка создания ссылки. Попробуй позже.')
    }
  }

  // ── Refer (M3) ────────────────────────────────────────────────────────────
  const handleRefer = () => {
    haptic.medium?.()
    track('refer_click')
    const link = referralProgress?.link
      || `https://t.me/${BOT_USERNAME}?start=ref_${user?.id || tg?.initDataUnsafe?.user?.id}`
    const text = isRuLang(tg)
      ? 'Пройди карьерный тест CareerCheck и узнай свой профиль — 10 минут, бесплатно!'
      : 'Take the CareerCheck career test and discover your profile — 10 minutes, free!'
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`
    openLink(shareUrl)
    // Обновляем прогресс через 3 секунды после отправки
    setTimeout(loadReferralProgress, 3000)
  }

  // ── Referral claim — бесплатный PDF без оплаты ───────────────────────────
  const handleReferralClaim = async () => {
    haptic.success?.()
    track('referral_claim_pdf')
    setPremiumLoading(true)
    setPremiumMsg(isRuLang(tg) ? '⏳ Генерируем PDF… ~30 сек' : '⏳ Generating PDF… ~30 sec')
    try {
      const res = await fetch('/api/premium/referral-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'failed')
      }
      haptic.success?.()
      setPremiumMsg(isRuLang(tg)
        ? '✅ PDF отправлен в Telegram!'
        : '✅ PDF sent to Telegram!')
    } catch (e) {
      setPremiumMsg(isRuLang(tg) ? '❌ Ошибка. Попробуй позже.' : '❌ Error. Try again later.')
      console.error('Referral claim error:', e)
    } finally {
      setPremiumLoading(false)
    }
  }

  // ── Premium — openInvoice в Mini App (issue 7) ────────────────────────────
  const handlePremium = async () => {
    haptic.medium?.()
    track('view_premium_click')

    // Если нет tg.openInvoice — открываем бота как fallback
    if (!tg?.openInvoice) {
      openLink('https://t.me/CareerCheck_Bot?start=premium')
      return
    }

    setPremiumLoading(true)
    setPremiumMsg(null)
    try {
      const res  = await fetch('/api/premium/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData }),
      })
      if (!res.ok) throw new Error('invoice_failed')
      const { invoice_link } = await res.json()

      // Сбрасываем loading ДО openInvoice — React должен завершить re-render
      // перед тем как Telegram откроет нативный payment sheet
      setPremiumLoading(false)
      await new Promise(r => setTimeout(r, 80))

      tg.openInvoice(invoice_link, async (status) => {
        if (status === 'paid') {
          haptic.success?.()
          setPremiumMsg(isRuLang(tg) ? '⏳ Генерируем PDF…' : '⏳ Generating PDF…')
          // Полируем статус, пока бот не обработает платёж
          let ready = false
          for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 2000))
            try {
              const s = await fetch(`/api/premium/status?init_data=${encodeURIComponent(initData)}`)
              const d = await s.json()
              if (d.status === 'ready') { ready = true; break }
            } catch {}
          }
          if (ready) {
            // Скачиваем PDF
            const dlRes = await fetch('/api/premium/download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ init_data: initData }),
            })
            const blob = await dlRes.blob()
            const url  = URL.createObjectURL(blob)
            const a    = document.createElement('a')
            a.href     = url
            a.download = 'CareerCheck_Premium.pdf'
            a.click()
            URL.revokeObjectURL(url)
            setPremiumMsg(isRuLang(tg) ? '✅ PDF скачан!' : '✅ PDF downloaded!')
          } else {
            setPremiumMsg(isRuLang(tg)
              ? '✅ Оплата получена! PDF придёт в бот @CareerCheck_Bot'
              : '✅ Payment received! PDF will arrive in @CareerCheck_Bot')
          }
        } else if (status === 'cancelled') {
          setPremiumMsg(null)
        } else {
          setPremiumMsg(isRuLang(tg) ? '❌ Ошибка оплаты. Попробуй снова.' : '❌ Payment failed.')
        }
      })
    } catch (e) {
      console.error('Premium invoice error:', e)
      setPremiumLoading(false)
      openLink('https://t.me/CareerCheck_Bot?start=premium')
    }
  }

  return (
    <div className="results-page">
      <Confetti active={confetti} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="results-hero visible">
        <div className="hero-bg" />
        <div className="results-type-label">{isRuLang(tg) ? 'Твой профессиональный тип' : 'Your professional type'}</div>
        <div className="results-type-name">
          <TypewriterText text={domLabel} delay={300} speed={40} />
        </div>
        <div className="results-top-trait">
          {isRuLang(tg) ? 'Сильная черта: ' : 'Top trait: '}
          <strong>{TRAIT_LABELS[TRAIT_KEYS.indexOf(topTrait)]}</strong> — {norm[topTrait]}%
        </div>
        {/* Premium CTA — компактный, вверху результатов */}
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={handlePremium} disabled={premiumLoading} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px',
            background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(124,58,237,0.22))',
            border: '1px solid rgba(251,191,36,0.4)',
            borderRadius: 12,
            cursor: 'pointer', width: '100%',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⭐</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>
                {premiumLoading
                  ? (isRuLang(tg) ? '⏳ Загрузка…' : '⏳ Loading…')
                  : (isRuLang(tg) ? 'Получить Premium PDF' : 'Get Premium PDF')}
              </span>
            </div>
            <span style={{ fontSize: 12, color: 'rgba(251,191,36,0.8)', fontWeight: 700 }}>99 ★</span>
          </button>

          {referralProgress && (
            referralProgress.granted ? (
              /* Бонус выдан — показываем кнопку получить Premium бесплатно */
              <button onClick={handleReferralClaim} disabled={premiumLoading} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 16px',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(124,58,237,0.2))',
                border: '1px solid rgba(34,197,94,0.5)',
                borderRadius: 12, cursor: 'pointer', width: '100%',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🎁</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e' }}>
                    {premiumLoading
                      ? (isRuLang(tg) ? '⏳ Генерируем PDF…' : '⏳ Generating PDF…')
                      : (isRuLang(tg) ? 'Получить Premium PDF — бесплатно!' : 'Get Premium PDF — Free!')}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'rgba(34,197,94,0.8)', fontWeight: 700 }}>0 ★</span>
              </button>
            ) : (
              /* Бонус не выдан — показываем прогресс */
              <div style={{
                padding: '10px 14px',
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.2)',
                borderRadius: 10,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {/* Заголовок */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                    👥 {isRuLang(tg) ? 'Premium за приглашения' : 'Free Premium via referrals'}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#a855f7' }}>
                    {referralProgress.count}/3
                  </span>
                </div>
                {/* Прогресс-бар */}
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(referralProgress.count / 3 * 100, 100)}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                    borderRadius: 4,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                {/* Подсказка */}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
                  {isRuLang(tg)
                    ? `Друзья: ${referralProgress.total} зарегистрировалось, ${referralProgress.count} прошли тест. Нужно ещё ${Math.max(0, 3 - referralProgress.count)} тестов.`
                    : `Friends: ${referralProgress.total} registered, ${referralProgress.count} completed test. Need ${Math.max(0, 3 - referralProgress.count)} more.`
                  }
                </div>
                {/* Кнопка поделиться */}
                <button onClick={handleRefer} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 14px',
                  background: 'rgba(168,85,247,0.15)',
                  border: '1px solid rgba(168,85,247,0.35)',
                  borderRadius: 8, cursor: 'pointer', width: '100%',
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#a855f7' }}>
                    {isRuLang(tg) ? '📤 Пригласить друзей (они должны пройти тест)' : '📤 Invite friends (they must complete the test)'}
                  </span>
                </button>
              </div>
            )
          )}
        </div>
      </div>

      <div className="tab-content">

        {/* ── Big Five ───────────────────────────────────────────────────── */}
        <div className="section-card visible">
          <h3 className="section-title">{isRuLang(tg) ? 'Big Five личности' : 'Big Five personality'}</h3>
          <div className="trait-list">
            {TRAIT_KEYS.map((key, i) => (
              <div key={key} className="trait-row">
                <div className="trait-header">
                  <span className="trait-name">{TRAIT_LABELS[i]}</span>
                  <span className="trait-score"><OdometerNumber value={norm[key]} delay={i * 120} />%</span>
                </div>
                <div className="trait-bar-bg">
                  <div className="trait-bar-fill" style={{ '--target-w': `${norm[key]}%`, '--delay': `${i * 70}ms` }} />
                </div>
                <p className="trait-desc">{TRAIT_DESCRIPTIONS[key]}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4, marginBottom: 4, lineHeight: 1.4 }}>
                  {getTraitInterpretation(key, norm[key] || 0, lang)}
                </p>
              </div>
            ))}
          </div>
          {/* Перцентиль */}
          {percentiles && (() => {
            const topKey   = TRAIT_KEYS.reduce((a, b) => (percentiles[a] || 99) < (percentiles[b] || 99) ? a : b)
            const topPct   = percentiles[topKey]
            const topName  = TRAIT_LABELS[TRAIT_KEYS.indexOf(topKey)]
            if (!topPct || topPct > 30) return null
            return (
              <div style={{
                marginTop: 14, padding: '12px 14px',
                background: 'rgba(0,212,170,0.07)',
                border: '1px solid rgba(0,212,170,0.2)',
                borderRadius: 10,
              }}>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>
                  {isRuLang(tg) ? 'Среди всех пользователей' : 'Among all users'}
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>
                  {isRuLang(tg) ? 'Топ' : 'Top'}{' '}
                  <strong style={{ color: '#00d4aa' }}>{topPct}%</strong>{' '}
                  {isRuLang(tg) ? `по «${topName}»` : `in ${topName}`}
                </p>
              </div>
            )
          })()}
        </div>

        {/* ── Badges / Ачивки ───────────────────────────────────────────── */}
        {badges.length > 0 && (
          <div className="section-card visible">
            <h3 className="section-title">Твои ачивки</h3>
            <div className="badges-list stagger-list">
              {badges.map(b => (
                <div key={b.id} className="badge-card">
                  <span className="badge-emoji">{b.emoji}</span>
                  <div className="badge-info">
                    <p className="badge-title">{b.title}</p>
                    <p className="badge-desc">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Radar Charts ───────────────────────────────────────────────── */}
        <div className="section-card radars-card visible">
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
        <div className="section-card visible">
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
        <div className="section-card visible">
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

        {/* ── Топ профессий с ProfessionMatchRow ─────────────────────────── */}
        {profs.length > 0 && (
          <div className="section-card visible">
            <h3 className="section-title">{isRuLang(tg) ? 'Твои профессии' : 'Your careers'}</h3>
            {profs.slice(0, 5).map((prof, i) => (
              <ProfessionMatchRow
                key={prof.title || i}
                rank={i + 1}
                title={prof.title}
                match={prof.match}
                riasec={RIASEC_LABELS[prof.riasec] || prof.riasec}
                onClick={() => { haptic.light?.(); navigate('profession-detail', { professionTitle: prof.title }) }}
              />
            ))}
          </div>
        )}

        {/* ── Premium (большой блок внизу — якорь для ref/shimmer) ─────── */}
        <div ref={premiumRef} className="premium-block card-holo">
          <div className="premium-title">🌟 Хотите детальный отчёт?</div>
          <div className="premium-desc">
            Premium PDF — 6 страниц с персональным AI‑анализом:<br />
            психологический портрет, карьерное видение, роадмап
          </div>
          <button className="btn-premium" onClick={handlePremium} disabled={premiumLoading}>
            {premiumLoading
              ? (isRuLang(tg) ? '⏳ Загрузка…' : '⏳ Loading…')
              : `🌟 ${isRuLang(tg) ? 'Получить Premium PDF' : 'Get Premium PDF'}`}
          </button>
          {premiumMsg && (
            <p style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
              {premiumMsg}
            </p>
          )}
        </div>

        {/* ── Share Card (U4) ────────────────────────────────────────────── */}
        <ShareCard results={results} />

        {/* ── Поделиться с другом ────────────────────────────────────────── */}
        <button className="btn-share-friend" onClick={handleShare}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          {isRuLang(tg) ? 'Поделиться результатом' : 'Share result'}
        </button>

        {/* ── Кнопка Назад ───────────────────────────────────────────────── */}
        <button className="btn-back-results" onClick={handleBack}>
          ← {isRuLang(tg) ? 'Назад в меню' : 'Back to menu'}
        </button>

        <p className="results-footer">CareerCheck · @CareerCheckSupport</p>

      </div>
    </div>
  )
}
