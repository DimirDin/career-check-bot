import { useEffect, useState } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { useNavigate } from '../context/NavigationContext'

export function CareerMapPage({ results, onBack }) {
  const { tg, user } = useTelegram()
  const navigate = useNavigate()
  const [aiContent, setAiContent] = useState(null)
  const [loading, setLoading] = useState(true)

  const riasec = results?.riasec_profile || {}
  const norm = results?.normalized_scores || {}
  const profs = results?.top_professions || []
  const top1 = profs[0]

  const RIASEC_LABELS = {
    R: 'Реалистичный', I: 'Исследовательский', A: 'Артистичный',
    S: 'Социальный', E: 'Предприимчивый', C: 'Конвенциональный',
  }
  const domRiasec = Object.keys(riasec).length
    ? Object.keys(riasec).sort((a, b) => riasec[b] - riasec[a])[0]
    : 'I'

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetch(`/api/ai-content/${user.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setAiContent(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [user])

  const hasPremium = aiContent && Object.keys(aiContent).length > 0
  const roadmap = aiContent?.top1_roadmap || []
  const vision5 = aiContent?.career_vision_5y || ''
  const vision10 = aiContent?.career_vision_10y || ''

  const topTrait = Object.keys(norm).length
    ? Object.keys(norm).sort((a, b) => (norm[b] || 0) - (norm[a] || 0))[0]
    : 'O'
  const TRAIT_NAMES = { O: 'Открытость', C: 'Сознательность', E: 'Экстраверсия', A: 'Доброжелательность', S: 'Стабильность' }
  const currentLevelText = `${TRAIT_NAMES[topTrait] || topTrait}: ${norm[topTrait] || 0}% · RIASEC: ${RIASEC_LABELS[domRiasec] || domRiasec}`

  const vision5Short = vision5 ? vision5.split('.').slice(0, 2).join('.') + '.' : ''
  const vision10Short = vision10 ? vision10.split('.').slice(0, 2).join('.') + '.' : ''

  const demoSteps = [
    'Освоить ключевые инструменты профессии',
    'Получить первый реальный опыт или проект',
    'Найти ментора в выбранной области',
    'Сформировать портфолио из 3–5 работ',
    'Выйти на первую профильную позицию',
  ]

  const steps = hasPremium && roadmap.length > 0 ? roadmap : demoSteps

  return (
    <div className="career-map">
      <div style={{
        padding: 'calc(var(--app-top, 0px) + 16px) 16px 8px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
          fontSize: 20, cursor: 'pointer', padding: '4px 8px 4px 0',
        }}>←</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Твой карьерный путь</div>
          {top1 && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{top1.title}</div>}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
          Загрузка...
        </div>
      ) : (
        <div style={{ padding: '8px 16px 32px' }}>
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot timeline-dot--current">●</div>
              <div className="timeline-content timeline-content--current">
                <div className="timeline-label">Сейчас</div>
                <div className="timeline-text">{currentLevelText}</div>
              </div>
            </div>

            {steps.map((step, i) => {
              const isLocked = !hasPremium
              return (
                <div className="timeline-item" key={i} style={{ position: 'relative' }}>
                  <div className="timeline-dot">{i + 1}</div>
                  <div className={`timeline-content ${isLocked ? 'timeline-locked' : ''}`}>
                    <div className="timeline-label">Шаг {i + 1}</div>
                    <div className="timeline-text">{typeof step === 'string' ? step : step?.action || step?.text || JSON.stringify(step)}</div>
                  </div>
                  {isLocked && (
                    <div className="timeline-lock-overlay">
                      🔒 Premium
                    </div>
                  )}
                </div>
              )
            })}

            <div className="timeline-item">
              <div className="timeline-dot timeline-dot--milestone">◆</div>
              <div className={`timeline-content timeline-content--milestone ${!hasPremium ? 'timeline-locked' : ''}`}>
                <div className="timeline-label">5 лет</div>
                <div className="timeline-text">{hasPremium ? vision5Short : 'Разблокируй с Premium PDF'}</div>
              </div>
              {!hasPremium && <div className="timeline-lock-overlay">🔒 Premium</div>}
            </div>

            <div className="timeline-item">
              <div className="timeline-dot timeline-dot--milestone">★</div>
              <div className={`timeline-content timeline-content--milestone ${!hasPremium ? 'timeline-locked' : ''}`}>
                <div className="timeline-label">10 лет</div>
                <div className="timeline-text">{hasPremium ? vision10Short : 'Разблокируй с Premium PDF'}</div>
              </div>
              {!hasPremium && <div className="timeline-lock-overlay">🔒 Premium</div>}
            </div>
          </div>

          {!hasPremium && (
            <button
              onClick={() => navigate('/premium')}
              style={{
                width: '100%', padding: '14px', marginTop: 16,
                background: 'linear-gradient(135deg, #6C5CE7, #00d4aa)',
                border: 'none', borderRadius: 12, color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🔓 Разблокировать план → Premium PDF
            </button>
          )}

          <button onClick={onBack} style={{
            width: '100%', padding: '12px', marginTop: 10,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12, color: 'rgba(255,255,255,0.5)',
            fontSize: 14, cursor: 'pointer',
          }}>
            ← Вернуться
          </button>
        </div>
      )}
    </div>
  )
}
