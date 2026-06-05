/**
 * Зеркало Python calculator.py — считает Big Five и RIASEC в браузере.
 * Позволяет показывать live-предпросмотр результатов без сервера.
 */

export function calculateScores(answers) {
  const traits = { O: [], C: [], E: [], A: [], S: [] }

  for (const ans of answers) {
    let score = ans.score
    if (ans.is_inverted) score = 6 - score
    traits[ans.trait].push(score)
  }

  const raw = {}
  const normalized = {}
  for (const [trait, scores] of Object.entries(traits)) {
    raw[trait] = scores.reduce((a, b) => a + b, 0)
    normalized[trait] = Math.round((raw[trait] - 12) / 48 * 100)
  }

  return { raw, normalized }
}

export function calculateRiasec(normalized) {
  const { O, C, E, A, S } = normalized
  return {
    R: Math.round((C * 0.6 + S * 0.4) * Math.max(0, (100 - O) / 100) * 0.8),
    I: Math.round((O * 0.5 + C * 0.3 + S * 0.2) * 0.9),
    A: Math.round((O * 0.7 + A * 0.3) * Math.max(0, (100 - C) / 100) * 0.8),
    S: Math.round((E * 0.5 + A * 0.5) * 0.9),
    E: Math.round((E * 0.6 + (100 - A) * 0.2 + S * 0.2) * 0.9),
    C: Math.round((C * 0.7 + A * 0.3) * 0.9),
  }
}

export function matchProfessions(normalized, riasec, professions) {
  const userRiasecMax = Object.entries(riasec).sort((a, b) => b[1] - a[1])[0][0]
  const userVector = ['O', 'C', 'E', 'A', 'S'].map(k => normalized[k])

  const matches = professions.map(prof => {
    const req = typeof prof.required_traits === 'string'
      ? JSON.parse(prof.required_traits)
      : prof.required_traits

    const profVector = ['O', 'C', 'E', 'A', 'S'].map(k => req[k])
    const diffs = profVector.map((p, i) => Math.abs(userVector[i] - p))
    const relDiffs = diffs.map((d, i) => d / Math.max(profVector[i], 15))
    const elementMatch = relDiffs.map(r => Math.max(20, 100 - r * 100))

    const sum = profVector.reduce((a, b) => a + b, 0)
    const weights = profVector.map(p => p / sum)
    const baseScore = elementMatch.reduce((acc, m, i) => acc + m * weights[i], 0)

    let keyBonus = 0
    for (let i = 0; i < 5; i++) {
      if (profVector[i] >= 80 && userVector[i] >= 80) keyBonus += 5
    }

    const profRiasec = prof.riasec_type
    const userRiasecForProf = riasec[profRiasec]
    let riasecPenalty = 0
    if (['I', 'E', 'S'].includes(profRiasec) && userRiasecForProf < 20) riasecPenalty = 15
    else if (['R', 'C'].includes(profRiasec) && userRiasecForProf < 15) riasecPenalty = 15
    else if (profRiasec === 'A' && userRiasecForProf < 15) riasecPenalty = 10

    const riasecBonus = profRiasec === userRiasecMax ? 10 : 0
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore - riasecPenalty + riasecBonus + keyBonus)))

    return {
      title: prof.title,
      match: finalScore,
      description: prof.description,
      growth: prof.growth_potential,
      riasec: prof.riasec_type,
    }
  })

  return matches.sort((a, b) => b.match - a.match).slice(0, 5)
}
