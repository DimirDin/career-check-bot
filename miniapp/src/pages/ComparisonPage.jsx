/**
 * ComparisonPage — сравнение профиля с другом.
 * Открывается по ссылке t.me/bot?startapp=compare_HASH
 */
import { useEffect, useState } from 'react'
import { DualRadarChart } from '../components/DualRadarChart'
import { AppHeader }      from '../components/AppHeader/AppHeader'
import { useTelegram }    from '../hooks/useTelegram'
import { track }          from '../hooks/useAnalytics'

const TRAIT_KEYS  = ['O', 'C', 'E', 'A', 'S']
const TRAIT_LABEL = { O:'O', C:'C', E:'E', A:'A', S:'S' }

export function ComparisonPage({ hashCode, myResults, onStartTest, onBack }) {
  const { tg, haptic, initData } = useTelegram()
  const lang  = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu  = lang !== 'en'

  const [friendData, setFriendData] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [sharing,    setSharing]    = useState(false)

  useEffect(() => {
    track('comparison_open', { hash: hashCode })
    if (!hashCode) { setError('no_hash'); setLoading(false); return }
    fetch(`/api/compare/${hashCode}`)
      .then(r => { if (!r.ok) throw new Error('not_found'); return r.json() })
      .then(d => { setFriendData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [hashCode])

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  // ── Поделиться ссылкой для сравнения ──────────────────────────────────────
  const openLink = (url) => {
    if (tg?.openTelegramLink) tg.openTelegramLink(url)
    else if (tg?.openLink)    tg.openLink(url)
    else window.open(url, '_blank')
  }

  const handleShareCompare = async () => {
    haptic?.medium?.()
    track('compare_create')
    if (!initData) {
      tg?.showAlert?.(isRu ? 'Открой CareerCheck в Telegram, чтобы создать ссылку' : 'Open CareerCheck in Telegram to create a link')
      return
    }
    setSharing(true)
    try {
      const res = await fetch('/api/compare/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const text = isRu
        ? `Сравни свой профиль с моим 👥 → ${data.link}`
        : `Compare your profile with mine 👥 → ${data.link}`
      openLink(`https://t.me/share/url?url=${encodeURIComponent(data.link)}&text=${encodeURIComponent(text)}`)
    } catch (e) {
      console.error('Compare share error:', e)
      tg?.showAlert?.(isRu ? 'Ошибка создания ссылки. Попробуй позже.' : 'Could not create link. Try again later.')
    }
    setSharing(false)
  }

  const shareButton = (
    <button
      className="btn-primary"
      onClick={handleShareCompare}
      disabled={sharing}
      style={{
        width: '100%', padding: '13px', borderRadius: 12,
        background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
        border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
        cursor: sharing ? 'default' : 'pointer', opacity: sharing ? 0.6 : 1,
      }}
    >
      {sharing
        ? (isRu ? '⏳ Создаём ссылку…' : '⏳ Creating link…')
        : `👥 ${isRu ? 'Отправить другу для сравнения' : 'Send to a friend to compare'}`}
    </button>
  )

  if (loading) return (
    <>
      <AppHeader />
      <div className="loading-screen" style={{ paddingTop: 'var(--page-top)' }}>
        <div className="loading-spinner" />
        <p className="loading-text">{isRu ? 'Загружаем сравнение…' : 'Loading comparison…'}</p>
      </div>
    </>
  )

  // Пользователь открыл страницу сам, не по ссылке друга — приглашаем поделиться
  if (error === 'no_hash') return (
    <div className="comparison-page">
      <AppHeader />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '24px 20px', gap: 16,
        minHeight: '60vh', justifyContent: 'center',
        paddingTop: 'calc(var(--page-top) + 24px)',
      }}>
        <div style={{ fontSize: 48 }}>👥</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>
          {isRu ? 'Сравни себя с другом' : 'Compare yourself with a friend'}
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, maxWidth: 280, margin: 0 }}>
          {isRu
            ? 'Отправь другу ссылку — когда он откроет её, вы увидите сравнение профилей Big Five'
            : 'Send a friend the link — once they open it, you’ll both see a Big Five comparison'}
        </p>

        <div style={{
          background: 'rgba(124,58,237,0.12)',
          border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: 16, padding: 20, width: '100%',
        }}>
          {shareButton}
        </div>

        <button className="btn-back-results" onClick={onBack}>
          {isRu ? '← На главную' : '← Home'}
        </button>
      </div>
    </div>
  )

  // Реальная ошибка: ссылка истекла или не найдена
  if (error || !friendData) return (
    <div className="comparison-page">
      <AppHeader />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', padding: '24px 20px', gap: 16,
        minHeight: '60vh', justifyContent: 'center',
        paddingTop: 'calc(var(--page-top) + 24px)',
      }}>
        <div style={{ fontSize: 48 }}>🔗</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0 }}>
          {isRu ? 'Ссылка устарела' : 'Link expired'}
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, maxWidth: 280, margin: 0 }}>
          {isRu
            ? 'Ссылка для сравнения действует 48 часов. Попроси друга создать новую.'
            : 'Comparison links are valid for 48 hours. Ask your friend to create a new one.'}
        </p>

        <div style={{
          background: 'rgba(124,58,237,0.12)',
          border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: 16, padding: 20, width: '100%',
        }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 12px' }}>
            {isRu ? 'А пока — узнай свой тип личности' : 'In the meantime — discover your personality type'}
          </p>
          <button
            className="btn-primary"
            onClick={() => onStartTest?.()}
            style={{
              width: '100%', padding: '13px', borderRadius: 12,
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            🎯 {isRu ? 'Пройти тест бесплатно' : 'Take the test for free'}
          </button>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '8px 0 0' }}>
            {isRu ? '60 вопросов · 15 минут · Big Five + RIASEC' : '60 questions · 15 minutes · Big Five + RIASEC'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start', width: '100%', padding: '0 8px' }}>
          {(isRu ? ['160+ профессий', 'Психологический портрет', 'RIASEC-тип карьеры'] : ['160+ careers', 'Psychological portrait', 'RIASEC career type'])
            .map(f => (
              <div key={f} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', display: 'flex', gap: 8 }}>
                <span style={{ color: '#00d4aa' }}>✓</span> {f}
              </div>
            ))}
        </div>

        <button className="btn-back-results" onClick={onBack}>
          {isRu ? '← На главную' : '← Home'}
        </button>
      </div>
    </div>
  )

  const friendNorm = friendData.normalized_scores || {}
  const myNorm     = myResults?.normalized_scores || {}
  const hasMyData  = Object.keys(myNorm).length > 0

  // Difference analysis
  const diffs = TRAIT_KEYS.map(k => ({
    key: k,
    mine:   myNorm[k] || 0,
    friend: friendNorm[k] || 0,
    diff:   (myNorm[k] || 0) - (friendNorm[k] || 0),
  }))
  const complementary = diffs.filter(d => Math.abs(d.diff) >= 20)

  return (
    <div className="comparison-page">
      <AppHeader />
      {/* Header */}
      <div className="comp-header" style={{ paddingTop: 'var(--page-top)' }}>
        <h2 className="comp-title">
          {isRu ? '👥 Сравнение профилей' : '👥 Profile Comparison'}
        </h2>
        {hasMyData ? (
          <div className="comp-legend">
            <span className="comp-dot comp-dot-you" />
            <span>{isRu ? 'Ты' : 'You'}</span>
            <span className="comp-dot comp-dot-friend" style={{ marginLeft: 12 }} />
            <span>{isRu ? 'Друг' : 'Friend'}</span>
          </div>
        ) : null}
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Dual radar */}
        <div className="comp-radar-card">
          <h3 className="section-title">Big Five</h3>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {hasMyData ? (
              <DualRadarChart
                valuesA={TRAIT_KEYS.map(k => myNorm[k] || 0)}
                valuesB={TRAIT_KEYS.map(k => friendNorm[k] || 0)}
                labels={TRAIT_KEYS}
                size={200}
              />
            ) : (
              <div style={{ position: 'relative' }}>
                <DualRadarChart
                  valuesA={TRAIT_KEYS.map(() => 0)}
                  valuesB={TRAIT_KEYS.map(k => friendNorm[k] || 0)}
                  labels={TRAIT_KEYS}
                  size={200}
                />
                <div className="comp-no-data">
                  <p>{isRu ? 'Пройди тест, чтобы увидеть сравнение' : 'Take the test to see comparison'}</p>
                  <button className="qr-cta-btn" style={{ marginTop: 8 }} onClick={() => { haptic.medium(); onStartTest() }}>
                    {isRu ? 'Пройти тест' : 'Take test'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Friend's top profession */}
        {friendData.top_professions?.[0] && (
          <div className="section-card" style={{ opacity: 1, transform: 'none' }}>
            <h3 className="section-title">{isRu ? 'Топ профессия друга' : "Friend's top career"}</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, color: '#fff' }}>🥇 {friendData.top_professions[0].title}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#fbbf24' }}>{friendData.top_professions[0].match}%</span>
            </div>
          </div>
        )}

        {/* Complementary traits */}
        {hasMyData && complementary.length > 0 && (
          <div className="comp-insights-card">
            <h3 className="section-title">{isRu ? '🧩 Взаимодополнение' : '🧩 Complementary traits'}</h3>
            {complementary.map(({ key, mine, friend, diff }) => (
              <div key={key} className="comp-insight-row">
                <span className="comp-insight-trait">{key}</span>
                <span className="comp-insight-you" style={{ color: '#2ed1f2' }}>{mine}%</span>
                <span className="comp-insight-vs">vs</span>
                <span className="comp-insight-friend" style={{ color: '#f59e0b' }}>{friend}%</span>
                <span className="comp-insight-note">
                  {Math.abs(diff) >= 30
                    ? (isRu ? 'Сильное дополнение' : 'Strong complement')
                    : (isRu ? 'Хорошее дополнение' : 'Good complement')}
                </span>
              </div>
            ))}
          </div>
        )}

        {shareButton}

        <button className="btn-back-results" onClick={onBack}>
          {isRu ? '← Назад' : '← Back'}
        </button>
      </div>
    </div>
  )
}
