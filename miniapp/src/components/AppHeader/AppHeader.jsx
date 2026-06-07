/**
 * AppHeader — единая шапка для всех экранов Mini App.
 * Точная копия HeaderProfile из MenuPage. Использовать на каждом экране.
 */
import { useTelegram } from '../../hooks/useTelegram'

export function AppHeader() {
  const { user, tg } = useTelegram()

  const firstName = user?.first_name || tg?.initDataUnsafe?.user?.first_name || 'Пользователь'
  const lastName  = user?.last_name  || tg?.initDataUnsafe?.user?.last_name  || ''
  const initials  = ((firstName[0] ?? '') + (lastName[0] ?? '')).toUpperCase() || '?'

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 200,
      background: 'rgba(5,5,11,0.82)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(124,58,237,0.14)',
      padding: 'calc(10px + env(safe-area-inset-top, 0px)) 16px 12px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}>
        {/* Аватар с инициалами */}
        <div style={{
          width: 36, height: 36,
          borderRadius: 10,
          flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))',
          border: '1px solid rgba(124,58,237,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#a78bfa',
          boxShadow: '0 0 12px rgba(124,58,237,0.25)',
          letterSpacing: '0.03em',
        }}>
          {initials}
        </div>

        {/* Имя */}
        <div>
          <div style={{
            fontSize: 15, fontWeight: 600, lineHeight: 1.2,
            background: 'linear-gradient(135deg, #e2e0f0, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            {firstName}
          </div>
          <div style={{
            fontSize: 10,
            color: '#5a5878',
            letterSpacing: '0.05em',
            marginTop: 1,
          }}>
            ПРОФИЛЬ АКТИВЕН
          </div>
        </div>
      </div>
    </div>
  )
}
