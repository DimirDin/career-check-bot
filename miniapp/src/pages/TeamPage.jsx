import { useState, useEffect } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { analyzeTeam, RIASEC_STRENGTHS } from '../utils/teamCompatibility'

const RIASEC_TYPES = ['R','I','A','S','E','C']
const RIASEC_NAMES = { R:'Реалист', I:'Аналитик', A:'Креатор', S:'Коммуникатор', E:'Лидер', C:'Организатор' }

export function TeamPage({ userResults, onBack }) {
  const { tg } = useTelegram()
  const STORAGE_KEY = 'cc_team_v1'

  const userRiasec = userResults?.riasec_profile
    ? Object.keys(userResults.riasec_profile).sort((a, b) => userResults.riasec_profile[b] - userResults.riasec_profile[a])[0]
    : null

  function loadMembers() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch {}
    return userRiasec
      ? [{ id: 1, name: 'Я', riasec: userRiasec }]
      : [{ id: 1, name: 'Участник 1', riasec: null }]
  }

  const [members, setMembers] = useState(loadMembers)
  const [analysis, setAnalysis] = useState(null)

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(members)) } catch {}
  }, [members])

  function addMember() {
    if (members.length >= 8) return
    const newId = Date.now()
    setMembers(prev => [...prev, { id: newId, name: `Участник ${prev.length + 1}`, riasec: null }])
    setAnalysis(null)
  }

  function removeMember(id) {
    setMembers(prev => prev.filter(m => m.id !== id))
    setAnalysis(null)
  }

  function updateName(id, name) {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, name } : m))
  }

  function setType(id, riasec) {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, riasec: m.riasec === riasec ? null : riasec } : m))
    setAnalysis(null)
  }

  function runAnalysis() {
    const validMembers = members.filter(m => m.riasec)
    if (validMembers.length < 2) return
    setAnalysis(analyzeTeam(validMembers))
  }

  return (
    <div style={{ minHeight: '100dvh', padding: '0 0 32px' }}>
      <div style={{
        padding: 'calc(var(--app-top, 0px) + 16px) 16px 12px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
          fontSize: 20, cursor: 'pointer', padding: '4px 8px 4px 0',
        }}>←</button>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Команда мечты</div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {members.map((member, idx) => (
          <div key={member.id} className="team-member-row">
            <div className="team-member-avatar">
              {member.name.slice(0, 1).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <input
                className="team-member-name-input"
                value={member.name}
                onChange={e => updateName(member.id, e.target.value)}
                placeholder="Имя"
              />
              <div className="team-type-pills">
                {RIASEC_TYPES.map(t => (
                  <button
                    key={t}
                    className={`team-type-pill ${member.riasec === t ? 'team-type-pill--selected' : ''}`}
                    onClick={() => setType(member.id, t)}
                  >
                    {t} {RIASEC_NAMES[t]}
                  </button>
                ))}
              </div>
            </div>
            {idx > 0 && (
              <button
                onClick={() => removeMember(member.id)}
                style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)',
                  fontSize: 18, cursor: 'pointer', padding: '4px',
                }}
              >✕</button>
            )}
          </div>
        ))}

        {members.length < 8 && (
          <button
            onClick={addMember}
            style={{
              width: '100%', padding: '12px', marginTop: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.15)',
              borderRadius: 12, color: 'rgba(255,255,255,0.4)',
              fontSize: 14, cursor: 'pointer',
            }}
          >
            + Добавить участника
          </button>
        )}

        <button
          onClick={runAnalysis}
          disabled={members.filter(m => m.riasec).length < 2}
          style={{
            width: '100%', padding: '14px', marginTop: 16,
            background: members.filter(m => m.riasec).length >= 2
              ? 'linear-gradient(135deg, #6C5CE7, #00d4aa)'
              : 'rgba(255,255,255,0.06)',
            border: 'none', borderRadius: 12, color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          Проанализировать команду
        </button>

        {analysis && (
          <div className="team-result-card">
            <div className="team-score">{analysis.score}%</div>
            <div className="team-score-label">разнообразие типов</div>

            {analysis.strengths.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Сильные стороны
                </div>
                {analysis.strengths.map((s, i) => (
                  <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', padding: '4px 0' }}>
                    ✓ {s}
                  </div>
                ))}
              </div>
            )}

            {analysis.gaps.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Не хватает
                </div>
                {analysis.gaps.map(g => (
                  <div key={g.type} className="team-gap-item">
                    <div className="team-gap-dot" />
                    {g.role} ({g.type}-тип)
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
