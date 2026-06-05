import { useEffect } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { MagneticBtn } from '../components/MagneticBtn'
import { track } from '../hooks/useAnalytics'

const FEATURES = [
  { icon: '🧠', text: 'Психологический портрет личности' },
  { icon: '🔭', text: 'Карьерное видение на 5 и 10 лет' },
  { icon: '🗺️', text: 'Роадмап из 5 конкретных шагов' },
  { icon: '⚡', text: 'Hard & Soft skills под твой профиль' },
  { icon: '⚠️', text: 'Анализ рисков и «красных флагов»' },
  { icon: '💌', text: 'Личное послание от AI' },
]

const isRu = (tg) => tg?.initDataUnsafe?.user?.language_code?.startsWith('ru')

export function PremiumPromoPage({ onBack, onBuy }) {
  const { tg, haptic, initData } = useTelegram()
  const ru = isRu(tg)

  useEffect(() => {
    track('view_premium_promo')
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  return (
    <div className="premium-promo-page">
      {/* Hero */}
      <div className="pp-hero card-holo">
        <div className="pp-hero-badge">⭐ Premium</div>
        <h1 className="pp-hero-title">
          {ru ? 'Персональный AI-анализ' : 'Personal AI Analysis'}
        </h1>
        <p className="pp-hero-sub">
          {ru ? '6 страниц · Генерируется специально для тебя · ~30 сек'
               : '6 pages · Generated specifically for you · ~30 sec'}
        </p>
        <div className="pp-price">
          <span className="pp-price-num">99</span>
          <span className="pp-price-star">⭐ Stars</span>
          <span className="pp-price-approx">≈ $1</span>
        </div>
      </div>

      {/* Features */}
      <div className="pp-features">
        <h2 className="pp-section-title">
          {ru ? 'Что входит в отчёт' : 'What\'s included'}
        </h2>
        <div className="pp-feature-list stagger-list">
          {FEATURES.map((f, i) => (
            <div key={i} className="pp-feature-card">
              <span className="pp-feature-icon">{f.icon}</span>
              <span className="pp-feature-text">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Previews */}
      <div className="pp-previews">
        <h2 className="pp-section-title">
          {ru ? 'Страницы отчёта' : 'Report pages'}
        </h2>
        <div className="pp-previews-row">
          {['Портрет', 'Карьера', 'Роадмап'].map((label, i) => (
            <div key={i} className="pp-preview-card">
              <div className="pp-preview-icon">
                {['🎭', '🚀', '🗺️'][i]}
              </div>
              <span className="pp-preview-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Social proof */}
      <div className="pp-social-proof">
        <span className="pp-social-icon">👥</span>
        <span className="pp-social-text">
          {ru ? 'Уже 1000+ пользователей получили анализ'
               : '1000+ users have received their analysis'}
        </span>
      </div>

      {/* CTA */}
      <div className="pp-cta">
        <MagneticBtn className="btn-premium pp-buy-btn card-holo" onClick={() => { haptic.medium?.(); onBuy?.() }}>
          {ru ? '🌟 Получить за 99 Stars' : '🌟 Get for 99 Stars ⭐'}
        </MagneticBtn>
        <p className="pp-cta-note">
          {ru ? 'Генерируется персонально для тебя · ~30 секунд'
               : 'Generated personally for you · ~30 seconds'}
        </p>
      </div>

      <div style={{ height: 32 }} />
    </div>
  )
}
