import { useEffect, useState } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { AppHeader } from '../components/AppHeader/AppHeader'
import { useNavigate } from '../context/NavigationContext'

const RIASEC_RU = { R:'Реалистичный',I:'Исследовательский',A:'Артистичный',S:'Социальный',E:'Предприимчивый',C:'Конвенциональный' }
const RIASEC_EN = { R:'Realistic',I:'Investigative',A:'Artistic',S:'Social',E:'Enterprising',C:'Conventional' }

export function SettingsPage({ onBack }) {
  const { tg, haptic, initData, user } = useTelegram()
  const navigate = useNavigate()
  const lang  = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu  = lang !== 'en'

  const [userState,    setUserState]    = useState(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [sendingFeedback, setSendingFeedback] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  useEffect(() => {
    if (!initData) return
    fetch(`/api/user/state?init_data=${encodeURIComponent(initData)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setUserState(d))
      .catch(() => {})
  }, [initData])

  async function sendFeedback() {
    if (!feedbackText.trim() || sendingFeedback || !initData) return
    haptic.medium()
    setSendingFeedback(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData, text: feedbackText.trim() }),
      })
      if (!res.ok) throw new Error('send failed')
      setFeedbackText('')
      setFeedbackSent(true)
      setTimeout(() => setFeedbackSent(false), 3000)
    } catch {
      tg?.HapticFeedback?.notificationOccurred('error')
    }
    setSendingFeedback(false)
  }

  const T = {
    title:          isRu ? 'Настройки'              : 'Settings',
    notifications:  isRu ? 'Уведомления'            : 'Notifications',
    profile:        isRu ? 'Профиль'                : 'Profile',
    lang:           isRu ? 'Язык'                   : 'Language',
    langVal:        isRu ? 'Из Telegram (автоматически)' : 'From Telegram (automatic)',
    about:          isRu ? 'О приложении'           : 'About',
    version:        'CareerCheck v3.0',
    devChat:        isRu ? 'Написать разработчику' : 'Message the developer',
    devChatPlaceholder: isRu ? 'Опиши баг, идею или просто напиши привет...' : 'Describe a bug, an idea, or just say hi...',
    devChatSend:    isRu ? 'Отправить' : 'Send',
    devChatSending: isRu ? 'Отправляю...' : 'Sending...',
    devChatSent:    isRu ? '✓ Сообщение отправлено' : '✓ Message sent',
    privacy:        isRu ? 'Тест основан на научной модели Big Five (OCEAN).\nДанные хранятся анонимно.' : 'Test based on the scientific Big Five (OCEAN) model.\nData stored anonymously.',
    back:           isRu ? '← Назад' : '← Back',
  }

  // Данные профиля
  const tgUser    = tg?.initDataUnsafe?.user
  const fullName  = tgUser?.first_name ? `${tgUser.first_name} ${tgUser.last_name || ''}`.trim() : (isRu ? 'Пользователь' : 'User')
  const initials  = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const riasecData = userState?.riasec || {}
  const riasecEntries = Object.entries(riasecData)
  const domKey = riasecEntries.length ? riasecEntries.sort((a, b) => b[1] - a[1])[0][0] : null
  const riasecLabel = domKey ? (isRu ? RIASEC_RU[domKey] : RIASEC_EN[domKey]) || domKey : null

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
          </div>
        </div>

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

        {/* About */}
        <div className="settings-section">
          <div className="settings-section-label">{T.about}</div>
          <div className="settings-info-card">
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{T.version}</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.6 }}>{T.privacy}</p>
          </div>
        </div>

        {/* Написать разработчику */}
        <div className="settings-section">
          <div className="settings-section-label">{T.devChat}</div>
          <div className="settings-info-card" style={{ gap: 10 }}>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder={T.devChatPlaceholder}
              rows={3}
              style={{
                width: '100%', resize: 'vertical', fontFamily: 'inherit',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10, padding: '10px 12px', color: '#f0eeff', fontSize: 16,
              }}
            />
            <button
              onClick={sendFeedback}
              disabled={sendingFeedback || !feedbackText.trim()}
              style={{
                alignSelf: 'flex-start', background: '#7347e6',
                border: 'none', borderRadius: 8, padding: '8px 16px',
                color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: sendingFeedback || !feedbackText.trim() ? 'default' : 'pointer',
                opacity: sendingFeedback || !feedbackText.trim() ? 0.6 : 1,
              }}
            >
              {sendingFeedback ? T.devChatSending : T.devChatSend}
            </button>
            {feedbackSent && (
              <div style={{ fontSize: 12, color: '#22d3a5' }}>{T.devChatSent}</div>
            )}
          </div>
        </div>
      </div>

      {[756303].includes(user?.id) && (
        <div style={{ padding: '0 16px 8px' }}>
          <button
            onClick={() => navigate('/admin')}
            style={{
              width: '100%', padding: '11px 16px',
              background: 'rgba(168,85,247,0.1)',
              border: '1px solid rgba(168,85,247,0.25)',
              borderRadius: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: '#a855f7' }}>⚙ Admin панель</span>
            <span style={{ fontSize: 12, color: 'rgba(168,85,247,0.6)' }}>→</span>
          </button>
        </div>
      )}

      <div style={{ padding: '0 16px 16px' }}>
        <button className="btn-back-results" onClick={onBack}>{T.back}</button>
      </div>
    </div>
  )
}
