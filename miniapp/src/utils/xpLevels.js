export const XP_LEVELS = [
  { level: 1, name: 'Новичок',       nameEn: 'Beginner',   minXP: 0    },
  { level: 2, name: 'Искатель',      nameEn: 'Explorer',   minXP: 100  },
  { level: 3, name: 'Исследователь', nameEn: 'Researcher', minXP: 300  },
  { level: 4, name: 'Эксперт',       nameEn: 'Expert',     minXP: 700  },
  { level: 5, name: 'Мастер',        nameEn: 'Master',     minXP: 1500 },
]

/** @param {number} xp */
export function getLevel(xp) {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i].minXP) return XP_LEVELS[i]
  }
  return XP_LEVELS[0]
}

/** @param {number} xp */
export function getProgress(xp) {
  const current = getLevel(xp)
  const next = XP_LEVELS.find(l => l.minXP > xp)
  if (!next) return { current, next: null, percent: 100 }
  const percent = Math.round((xp - current.minXP) / (next.minXP - current.minXP) * 100)
  return { current, next, percent }
}
