/**
 * PersonalHero — показывается на главной если тест пройден.
 * Отображает RIASEC-тип, топ профессию и кнопки действий.
 */

const RIASEC_LABELS_RU = {
  R: 'Реалистичный', I: 'Исследовательский', A: 'Артистичный',
  S: 'Социальный',   E: 'Предприимчивый',    C: 'Конвенциональный',
}
const RIASEC_LABELS_EN = {
  R: 'Realistic', I: 'Investigative', A: 'Artistic',
  S: 'Social',    E: 'Enterprising',  C: 'Conventional',
}

/**
 * @param {{
 *   riasec: Record<string,number>,
 *   topProfession: {title:string, match:number}|null,
 *   lang?: string,
 *   onResults: () => void,
 *   onRetake:  () => void,
 * }} props
 */
export function PersonalHero({ riasec = {}, topProfession = null, lang = 'ru', onResults, onRetake }) {
  const entries = Object.entries(riasec)
  const domKey  = entries.length ? entries.sort((a, b) => b[1] - a[1])[0][0] : 'I'
  const labels  = lang === 'ru' ? RIASEC_LABELS_RU : RIASEC_LABELS_EN
  const domLabel = labels[domKey] || domKey

  const isRu = lang === 'ru'

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(108,92,231,0.15) 0%, rgba(0,212,170,0.08) 100%)',
      border: '1px solid rgba(108,92,231,0.3)',
      borderLeft: '4px solid #6C5CE7',
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
        letterSpacing: '0.08em', color: '#00d4aa', marginBottom: 4,
      }}>
        {isRu ? 'Твой тип' : 'Your type'}
      </div>
      <div style={{
        fontSize: 22, fontWeight: 800, color: '#ffffff', marginBottom: 4, lineHeight: 1.2,
      }}>
        {domLabel}
      </div>
      {topProfession && (
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>
          {topProfession.title}{' '}
          <span style={{ color: '#00d4aa', fontWeight: 700 }}>— {topProfession.match}%</span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onResults}
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #6C5CE7, #00d4aa)',
            border: 'none', borderRadius: 10,
            padding: '9px 14px',
            color: '#fff', fontSize: 12, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {isRu ? 'Мои результаты' : 'My results'}
        </button>
        <button
          onClick={onRetake}
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10, padding: '9px 14px',
            color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {isRu ? 'Пройти заново' : 'Retake'}
        </button>
      </div>
    </div>
  )
}
