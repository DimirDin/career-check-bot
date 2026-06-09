export const TRAIT_INTERPRETATIONS = {
  ru: {
    O: {
      low:  'Предпочитаешь проверенное и надёжное. Сила в последовательности.',
      mid:  'Ценишь баланс нового и привычного. Гибок когда нужно.',
      high: 'Любишь новые идеи и нестандартные решения. Творческое мышление — твой козырь.',
    },
    C: {
      low:  'Работаешь лучше в гибкой среде без жёстких дедлайнов.',
      mid:  'Умеешь организоваться, когда задача важна. Баланс между структурой и свободой.',
      high: 'Высокая самодисциплина. Доводишь дела до конца — это редкое качество.',
    },
    E: {
      low:  'Энергию черпаешь в тишине и глубокой работе. Интроверсия — не слабость.',
      mid:  'Комфортно и в команде, и наедине с задачей. Универсальный режим.',
      high: 'Общение заряжает. Лидерские роли и работа с людьми — твоя стихия.',
    },
    A: {
      low:  'Умеешь отстаивать свою позицию. Прямота помогает в переговорах.',
      mid:  'Находишь баланс между своими интересами и интересами команды.',
      high: 'Высокая эмпатия. Люди тебе доверяют — это ценнейший карьерный актив.',
    },
    S: {
      low:  'Чувствителен к стрессу. Важно выбирать среду с низкой токсичностью.',
      mid:  'В целом устойчив, но сильный стресс требует восстановления.',
      high: 'Стрессоустойчивость выше среднего. Работаешь стабильно даже под давлением.',
    },
  },
  en: {
    O: {
      low:  'You prefer the proven and reliable. Your strength is consistency.',
      mid:  'You balance novelty and familiarity well. Flexible when needed.',
      high: 'You thrive on new ideas and unconventional solutions. Creative thinking is your edge.',
    },
    C: {
      low:  'You work better in flexible environments without rigid deadlines.',
      mid:  'You can organize when it matters. Balance between structure and freedom.',
      high: 'High self-discipline. You follow through — a genuinely rare quality.',
    },
    E: {
      low:  'You recharge in quiet and deep work. Introversion is a strength.',
      mid:  'Comfortable in teams and solo alike. The most versatile mode.',
      high: 'Social energy fuels you. Leadership and people-facing roles are your element.',
    },
    A: {
      low:  'You can hold your ground. Directness is an asset in negotiation.',
      mid:  "You balance your own interests with the team's needs well.",
      high: "High empathy. People trust you — that's one of the most valuable career assets.",
    },
    S: {
      low:  'Sensitive to stress. Choosing a low-toxicity environment matters for you.',
      mid:  'Generally resilient, but heavy stress needs recovery time.',
      high: 'Above-average stress tolerance. You perform consistently under pressure.',
    },
  },
}

/**
 * @param {string} trait - 'O'|'C'|'E'|'A'|'S'
 * @param {number} value - 0-100
 * @param {string} lang  - 'ru'|'en'
 */
export function getTraitInterpretation(trait, value, lang = 'ru') {
  const level = value < 35 ? 'low' : value < 65 ? 'mid' : 'high'
  return (
    TRAIT_INTERPRETATIONS[lang]?.[trait]?.[level] ??
    TRAIT_INTERPRETATIONS['en']?.[trait]?.[level] ??
    ''
  )
}
