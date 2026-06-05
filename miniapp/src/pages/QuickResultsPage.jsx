/**
 * QuickResultsPage — результаты быстрого теста.
 * Показывает топ-2 черты, размытый радар, CTA на полный тест.
 */
import { useEffect, useState } from 'react'
import { RadarChart }  from '../components/RadarChart'
import { useTelegram } from '../hooks/useTelegram'
import { track }       from '../hooks/useAnalytics'

const TRAIT_KEYS = ['O', 'C', 'E', 'A', 'S']
const TRAIT_NAME = {
  ru: { O:'Открытость', C:'Сознательность', E:'Экстраверсия', A:'Доброжелат.', S:'Стабильность' },
  en: { O:'Openness', C:'Conscientiousness', E:'Extraversion', A:'Agreeableness', S:'Stability' },
}

export function QuickResultsPage({ results, onFullTest, onBack }) {
  const { tg, haptic } = useTelegram()
  const lang  = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu  = lang !== 'en'
  const names = TRAIT_NAME[isRu ? 'ru' : 'en']
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    track('quick_test_view_results')
    haptic.success?.()
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  const { normalized_scores: norm, top_professions: profs } = results
  const sorted = TRAIT_KEYS
    .map(k => ({ key: k, val: norm[k] || 0 }))
    .sort((a, b) => b.val - a.val)
  const top2 = sorted.slice(0, 2)

  return (
    <div className="quick-results">
      {/* Header */}
      <div className={`qr-hero ${visible ? 'visible' : ''}`}>
        <div className="qr-title">{isRu ? '⚡ Твой экспресс-профиль' : '⚡ Your Express Profile'}</div>
        <p className="qr-subtitle">
          {isRu ? 'На основе 10 вопросов — приблизительная оценка' : 'Based on 10 questions — approximate assessment'}
        </p>
      </div>

      {/* Top 2 traits */}
      <div className={`qr-traits ${visible ? 'visible' : ''}`}>
        {top2.map(({ key, val }) => (
          <div key={key} className="qr-trait-card">
            <div className="qr-trait-name">{names[key]}</div>
            <div className="qr-trait-bar-bg">
              <div className="qr-trait-bar-fill" style={{ width: `${val}%` }} />
            </div>
            <div className="qr-trait-val">{val}%</div>
          </div>
        ))}
      </div>

      {/* Blurred radar */}
      <div className="qr-radar-wrap">
        <RadarChart
          values={TRAIT_KEYS.map(k => norm[k] || 0)}
          labels={['O','C','E','A','S']}
          color="#7347e6"
          size={160}
        />
        <div className="qr-radar-blur" />
        <div className="qr-radar-overlay">
          <div className="qr-overlay-lock">🔒</div>
          <div className="qr-overlay-text">
            {isRu ? 'Полный профиль — в развёрнутом тесте' : 'Full profile in the complete test'}
          </div>
        </div>
      </div>

      {/* Top profession teaser */}
      {profs?.[0] && (
        <div className="qr-prof-teaser">
          <span className="qr-prof-label">{isRu ? '🥇 Лучшее совпадение' : '🥇 Best match'}</span>
          <span className="qr-prof-name">{profs[0].title}</span>
          <span className="qr-prof-match">{profs[0].match}%</span>
        </div>
      )}

      {/* CTA */}
      <div className="qr-cta-section">
        <button className="qr-cta-btn" onClick={() => { haptic.success(); track('quick_to_full'); onFullTest() }}>
          {isRu ? '🚀 Пройти полный тест — 60 вопросов' : '🚀 Take the full test — 60 questions'}
        </button>
        <p className="qr-cta-hint">
          {isRu ? 'Получи полный radar-чарт, RIASEC-профиль и топ-5 профессий' : 'Get the full radar chart, RIASEC profile and top-5 careers'}
        </p>
        <button className="btn-back-results" onClick={onBack}>
          {isRu ? '← Назад' : '← Back'}
        </button>
      </div>
    </div>
  )
}
