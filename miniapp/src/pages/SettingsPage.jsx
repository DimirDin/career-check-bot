import { useEffect, useState } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { AppHeader } from '../components/AppHeader/AppHeader'
import { AchievementsCard } from '../components/AchievementsCard'
import { getLevel } from '../utils/xpLevels'
import { useNavigate } from '../context/NavigationContext'

const RIASEC_RU = { R:'Реалистичный',I:'Исследовательский',A:'Артистичный',S:'Социальный',E:'Предприимчивый',C:'Конвенциональный' }
const RIASEC_EN = { R:'Realistic',I:'Investigative',A:'Artistic',S:'Social',E:'Enterprising',C:'Conventional' }

export function SettingsPage({ onBack }) {
  const { tg, haptic, initData, user } = useTelegram()
  const navigate = useNavigate()
  const lang  = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu  = lang !== 'en'

  const [challenges,   setChallenges]   = useState(null)
  const [streak,       setStreak]       = useState(0)
  const [toggling,     setToggling]     = useState(false)
  const [referral,     setReferral]     = useState(null)
  const [copied,       setCopied]       = useState(false)
  const [userState,    setUserState]    = useState(null)

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  useEffect(() => {
    if (!initData) return
    fetch(`/api/challenges/status?init_data=${encodeURIComponent(initData)}`)
      .then(r => r.json())
      .then(d => { setChallenges(d.subscribed); setStreak(d.streak || 0) })
      .catch(() => setChallenges(false))
    fetch(`/api/referral/progress?init_data=${encodeURIComponent(initData)}`)
      .then(r => r.json())
      .then(d => setReferral(d))
      .catch(() => {})
    fetch(`/api/user/state?init_data=${encodeURIComponent(initData)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUserState(d))
      .catch(() => {})
  }, [initData])

  function copyReferralLink() {
    if (!referral?.link) return
    haptic.medium()
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(referral.link).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    } else {
      tg?.HapticFeedback?.notificationOccurred('success')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function toggleChallenges() {
    if (toggling || !initData) return
    haptic.medium()
    setToggling(true)
    try {
      const res  = await fetch('/api/challenges/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData }),
      })
      const data = await res.json()
      setChallenges(data.subscribed)
    } catch {}
    setToggling(false)
  }

  const T = {
    title:          isRu ? 'Настройки'              : 'Settings',
    notifications:  isRu ? 'Уведомления'            : 'Notifications',
    challenges:     isRu ? 'Ежедневные челленджи'   : 'Daily challenges',
    challDesc:      isRu ? 'Карьерное задание каждый день в 9:00' : 'Career challenge every day at 9:00',
    on:             isRu ? 'Вкл'                    : 'On',
    off:            isRu ? 'Выкл'                   : 'Off',
    streak:         (n) => isRu ? `🔥 Серия: ${n} дней` : `🔥 Streak: ${n} days`,
    profile:        isRu ? 'Профиль'                : 'Profile',
    lang:           isRu ? 'Язык'                   : 'Language',
    langVal:        isRu ? 'Из Telegram (автоматически)' : 'From Telegram (automatic)',
    referral:       isRu ? 'Пригласить друга'        : 'Invite a Friend',
    referralDesc:   isRu ? 'Копируй ссылку и отправь другу — когда он пройдёт тест, получишь бонус' : 'Share your link — when your friend completes the test, you get a bonus',
    referralCount:  (n, t) => isRu ? `Приглашено: ${n} из ${t} прошли тест` : `Invited: ${n} of ${t} completed test`,
    referralBonus:  isRu ? '🎉 Бонус получен!' : '🎉 Bonus received!',
    copyLink:       isRu ? 'Копировать ссылку' : 'Copy link',
    copied:         isRu ? 'Скопировано!' : 'Copied!',
    about:          isRu ? 'О приложении'           : 'About',
    version:        'CareerCheck v3.0',
    support:        isRu ? 'Поддержка' : 'Support',
    supportLink:    '@CareerCheckSupport',
    privacy:        isRu ? 'Тест основан на научной модели Big Five (OCEAN).\nДанные хранятся анонимно.' : 'Test based on the scientific Big Five (OCEAN) model.\nData stored anonymously.',
    back:           isRu ? '← Назад' : '← Back',
  }

  // Данные профиля
  const tgUser    = tg?.initDataUnsafe?.user
  const fullName  = tgUser?.first_name ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : (isRu ? 'Пользователь' : 'User')
  const initials  = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const totalXP   = userState?.totalXP || 0
  const lvl       = getLevel(totalXP)
  const levelName = isRu ? lvl.name : lvl.nameEn
  const hasPremium = userState?.hasPremium || false
  const hasResults = userState?.hasResults || false

  const riasecData = userState?.riasec || {}
  const riasecEntries = Object.entries(riasecData)
  const domKey = riasecEntries.length ? riasecEntries.sort((a, b) => b[1] - a[1])[0][0] : null
  const riasecLabel = domKey ? (isRu ? RIASEC_RU[domKey] : RIASEC_EN[domKey]) || domKey : null

  const achieveData = {
    testCompleted:  hasResults,
    totalXP,
    streak,
    hasPremium,
    referralCount:  referral?.count || 0,
    catalogViewed:  !!localStorage.getItem('cc_catalog_viewed'),
  }

  return (
    <div className="settings-page">
      <AppHeader />

      <div className="settings-body" style={{ paddingTop: 'var(--page-top)' }}>

        {/* Profile Hero */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: 16,
          background: 'rgba(124,58,237,0.1)',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 16, marginBottom: 20,
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff', flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f0eeff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName}
            </div>
            {riasecLabel && (
              <div style={{ fontSize: 12, color: '#06b6d4', fontWeight: 600, marginTop: 2 }}>{riasecLabel}</div>
            )}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {levelName} · {totalXP} XP
            </div>
          </div>
        </div>

        {/* Premium status */}
        {hasPremium ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', marginBottom: 16,
            background: 'rgba(253,203,110,0.08)',
            border: '1px solid rgba(253,203,110,0.25)',
            borderRadius: 14,
          }}>
            <span style={{ fontSize: 22 }}>🌟</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24' }}>{isRu ? 'Premium активен' : 'Premium active'}</div>
            </div>
          </div>
        ) : (
          <div
            onClick={() => navigate('premium-promo')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px', marginBottom: 16,
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: 14, cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 22 }}>⭐</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>{isRu ? 'Получить Premium PDF' : 'Get Premium PDF'}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                {isRu ? 'AI-анализ · 6 страниц · 99 Stars' : 'AI analysis · 6 pages · 99 Stars'}
              </div>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
          </div>
        )}

        {/* History link */}
        <div
          onClick={() => navigate('history')}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '14px 16px', marginBottom: 16,
            background: 'rgba(13,13,26,0.65)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: 20 }}>📊</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#f0eeff' }}>{isRu ? 'История тестов' : 'Test history'}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{isRu ? 'Все прошлые результаты' : 'All past results'}</div>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
        </div>

        {/* Achievements */}
        <div style={{ marginBottom: 20 }}>
          <AchievementsCard userData={achieveData} lang={lang} />
        </div>

        {/* Notifications */}
        <div className="settings-section">
          <div className="settings-section-label">{T.notifications}</div>

          <div className="settings-row">
            <div className="settings-row-info">
              <div className="settings-row-title">{T.challenges}</div>
              <div className="settings-row-desc">{T.challDesc}</div>
              {streak > 0 && challenges && (
                <div className="settings-row-streak">{T.streak(streak)}</div>
              )}
            </div>
            <button
              className={`settings-toggle ${challenges ? 'settings-toggle-on' : ''}`}
              onClick={toggleChallenges}
              disabled={toggling || challenges === null}
            >
              {challenges ? T.on : T.off}
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="settings-section">
          <div className="settings-section-label">{T.profile}</div>
          <div className="settings-row">
            <div className="settings-row-info">
              <div className="settings-row-title">{T.lang}</div>
              <div className="settings-row-desc">{T.langVal}</div>
            </div>
            <span className="settings-row-value">{lang.toUpperCase()}</span>
          </div>
        </div>

        {/* Referral */}
        <div className="settings-section">
          <div className="settings-section-label">{T.referral}</div>
          <div className="settings-info-card" style={{ gap: 10 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 8 }}>
              {T.referralDesc}
            </div>
            {referral && (
              <div style={{ fontSize: 12, color: '#a78bfa', marginBottom: 8 }}>
                {T.referralCount(referral.count, referral.total)}
                {referral.granted && <span style={{ marginLeft: 8 }}>{T.referralBonus}</span>}
              </div>
            )}
            {referral?.link && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{
                  flex: 1, fontSize: 11, color: 'rgba(255,255,255,0.4)',
                  background: 'rgba(255,255,255,0.06)', borderRadius: 8,
                  padding: '7px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {referral.link}
                </div>
                <button
                  onClick={copyReferralLink}
                  style={{
                    flexShrink: 0, background: copied ? '#22d3a5' : '#7347e6',
                    border: 'none', borderRadius: 8, padding: '7px 14px',
                    color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  {copied ? T.copied : T.copyLink}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* About */}
        <div className="settings-section">
          <div className="settings-section-label">{T.about}</div>
          <div className="settings-info-card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{T.version}</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>{T.privacy}</p>
          </div>
          <div className="settings-row" style={{ cursor: 'pointer' }} onClick={() => {
            haptic.medium()
            const link = 'https://t.me/CareerCheckSupport'
            if (tg?.openTelegramLink) tg.openTelegramLink(link)
            else window.open(link, '_blank')
          }}>
            <div className="settings-row-info">
              <div className="settings-row-title">{T.support}</div>
              <div className="settings-row-desc" style={{ color: '#7347e6', fontWeight: 600 }}>{T.supportLink}</div>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>→</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <button className="btn-back-results" onClick={onBack}>{T.back}</button>
      </div>
    </div>
  )
}
