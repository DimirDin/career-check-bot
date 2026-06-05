import { useEffect } from 'react'
import { useTelegram } from '../hooks/useTelegram'

const TRAIT_META = {
  O: { ru: 'Открытость к опыту',   en: 'Openness',          emoji: '🎨' },
  C: { ru: 'Сознательность',        en: 'Conscientiousness', emoji: '⚡' },
  E: { ru: 'Экстраверсия',          en: 'Extraversion',      emoji: '🌟' },
  A: { ru: 'Доброжелательность',    en: 'Agreeableness',     emoji: '🤝' },
  S: { ru: 'Эмоц. стабильность',   en: 'Stability',         emoji: '🧘' },
}

function getTopTrait(answers) {
  const sums   = {}
  const counts = {}
  for (const a of answers) {
    const score = a.is_inverted ? 6 - a.score : a.score
    sums[a.trait]   = (sums[a.trait]   || 0) + score
    counts[a.trait] = (counts[a.trait] || 0) + 1
  }
  let top = 'O', topAvg = 0
  for (const t of Object.keys(sums)) {
    const avg = sums[t] / counts[t]
    if (avg > topAvg) { topAvg = avg; top = t }
  }
  return { trait: top, pct: Math.round((topAvg - 1) / 4 * 100) }
}

export function MilestoneCard({ answers, totalQuestions, lang, onContinue }) {
  const { haptic } = useTelegram()
  useEffect(() => { haptic.success?.() }, []) // eslint-disable-line
  const { trait, pct } = getTopTrait(answers)
  const meta      = TRAIT_META[trait]
  const remaining = totalQuestions - answers.length
  const isRu      = !lang || lang === 'ru'

  const traitName = isRu ? meta.ru : meta.en
  const level     = pct >= 65 ? (isRu ? 'высокая' : 'high')
                  : pct <= 35 ? (isRu ? 'низкая'  : 'low')
                  :              (isRu ? 'средняя' : 'average')

  const text = isRu
    ? `Судя по ответам, у тебя ${level} ${traitName} ${meta.emoji}\nОсталось ещё ${remaining} вопросов — полная картина уже близко!`
    : `Based on your answers, you have ${level} ${traitName} ${meta.emoji}\n${remaining} more questions — your full profile is almost ready!`

  const btnText = isRu ? 'Продолжить' : 'Continue'

  return (
    <div className="milestone-overlay">
      <div className="milestone-card">
        <div className="milestone-badge">
          {answers.length === 20 ? (isRu ? '⭐ Четверть пути!' : '⭐ Quarter done!') : (isRu ? '🔥 Две трети!' : '🔥 Two thirds!')}
        </div>
        <p className="milestone-text">{text}</p>
        <button className="milestone-btn" onClick={onContinue}>{btnText}</button>
      </div>
    </div>
  )
}
