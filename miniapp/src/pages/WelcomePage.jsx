import { useEffect, useState } from 'react'
import { useTelegram } from '../hooks/useTelegram'

export function WelcomePage({ onStart }) {
  const { user, haptic } = useTelegram()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  const handleStart = () => {
    haptic.medium()
    onStart()
  }

  return (
    <div className="welcome-page" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.5s' }}>

      <div className="welcome-bg">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>

      <div className="welcome-content">
        <div className="logo-block">
          <span className="logo-career">CAREER</span>
          <span className="logo-check">CHECK</span>
        </div>

        {user && (
          <div className="user-greeting">
            <div className="avatar">
              {user.first_name?.[0]?.toUpperCase() || '?'}
            </div>
            <p className="greeting-text">
              Привет, <strong>{user.first_name}</strong>!
            </p>
          </div>
        )}

        <div className="welcome-card">
          <div className="welcome-stats">
            <div className="stat">
              <span className="stat-num">60</span>
              <span className="stat-label">вопросов</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-num">~7</span>
              <span className="stat-label">минут</span>
            </div>
            <div className="stat-divider" />
            <div className="stat">
              <span className="stat-num">30+</span>
              <span className="stat-label">профессий</span>
            </div>
          </div>
        </div>

        <div className="welcome-badges">
          <span className="badge">Big Five</span>
          <span className="badge">RIASEC</span>
          <span className="badge">Научная модель</span>
        </div>

        <p className="welcome-desc">
          Узнай свои сильные черты личности и топ‑3 профессии, которые подходят именно тебе
        </p>

        <button className="btn-start" onClick={handleStart}>
          Начать тест
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <p className="footer-credit">@CareerCheckSupport</p>
      </div>
    </div>
  )
}
