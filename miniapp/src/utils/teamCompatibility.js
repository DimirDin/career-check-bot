export const RIASEC_STRENGTHS = {
  R: { role: "Исполнитель", strength: "Делает реальные вещи. Надёжность.", need: "I,E" },
  I: { role: "Аналитик",   strength: "Решает сложные проблемы. Данные.",  need: "E,S" },
  A: { role: "Креатор",    strength: "Генерирует идеи. Нестандартность.", need: "C,E" },
  S: { role: "Коммуникатор", strength: "Сплачивает команду. Эмпатия.",   need: "R,I" },
  E: { role: "Лидер",      strength: "Двигает вперёд. Продажи.",         need: "C,I" },
  C: { role: "Организатор", strength: "Выстраивает систему. Контроль.",  need: "A,E" },
};

export function analyzeTeam(members) {
  const typeCount = {};
  members.forEach(m => {
    if (m.riasec) typeCount[m.riasec] = (typeCount[m.riasec] || 0) + 1;
  });

  const present = Object.keys(typeCount);
  const missing = ['R','I','A','S','E','C'].filter(t => !typeCount[t]);

  const strengths = present.map(t => RIASEC_STRENGTHS[t]?.strength).filter(Boolean);
  const gaps = missing.map(t => ({ type: t, role: RIASEC_STRENGTHS[t]?.role }));

  const diversity = present.length;
  const score = Math.round(diversity / 6 * 100);

  return { typeCount, present, missing, strengths, gaps, score };
}
