/**
 * ComparisonPage — сравнение профиля с другом.
 * Открывается по ссылке t.me/bot?startapp=compare_HASH
 */
import { useEffect, useState } from 'react'
import { DualRadarChart } from '../components/DualRadarChart'
import { useTelegram }    from '../hooks/useTelegram'
import { track }          from '../hooks/useAnalytics'

const TRAIT_KEYS  = ['O', 'C', 'E', 'A', 'S']
const TRAIT_LABEL = { O:'O', C:'C', E:'E', A:'A', S:'S' }

export function ComparisonPage({ hashCode, myResults, onStartTest, onBack }) {
  const { tg, haptic } = useTelegram()
  const lang  = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu  = lang !== 'en'

  const [friendData, setFriendData] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

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

  if (loading) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <p className="loading-text">{isRu ? 'Загружаем сравнение…' : 'Loading comparison…'}</p>
    </div>
  )

  if (error || !friendData) return (
    <div className="comparison-page">
      <div style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🔗</div>
        <h3 style={{ marginTop: 16 }}>{isRu ? 'Ссылка устарела' : 'Link expired'}</h3>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
          {isRu ? 'Попроси друга создать новую ссылку' : 'Ask your friend to create a new link'}
        </p>
        <button className="btn-back-results" style={{ marginTop: 24 }} onClick={onBack}>
          {isRu ? '← Назад' : '← Back'}
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
      {/* Header */}
      <div className="comp-header">
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

        <button className="btn-back-results" onClick={onBack}>
          {isRu ? '← Назад' : '← Back'}
        </button>
      </div>
    </div>
  )
}
