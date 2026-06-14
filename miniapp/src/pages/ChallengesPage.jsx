import { useEffect, useState, useCallback } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { AppHeader } from '../components/AppHeader/AppHeader'
import { getProgress } from '../utils/xpLevels'

const TRAIT_META = {
  O: { emoji: '🎨', ru: 'Открытость',       en: 'Openness',            color: '#06b6d4' },
  C: { emoji: '⚡', ru: 'Сознательность',    en: 'Conscientiousness',   color: '#7c3aed' },
  E: { emoji: '🌟', ru: 'Экстраверсия',      en: 'Extraversion',        color: '#f59e0b' },
  A: { emoji: '🤝', ru: 'Доброжелательность',en: 'Agreeableness',       color: '#22d3a5' },
  S: { emoji: '🧘', ru: 'Стабильность',      en: 'Stability',           color: '#f97316' },
}

const CAT_META = {
  research:   { emoji: '🔍' },
  networking: { emoji: '🤝' },
  skill:      { emoji: '🛠️' },
  reflection: { emoji: '🪞' },
  mindset:    { emoji: '🧠' },
  action:     { emoji: '⚡' },
  portfolio:  { emoji: '📁' },
  feedback:   { emoji: '💬' },
}

const DIFF_COLOR = { easy: '#22d3a5', medium: '#f59e0b', hard: '#f43f5e' }

export function ChallengesPage({ onBack }) {
  const { tg, haptic, initData } = useTelegram()
  const lang = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu = lang !== 'en'

  const [status,     setStatus]     = useState(null)      // { subscribed, streak, total_xp }
  const [challenges, setChallenges] = useState(null)      // array | null = loading
  const [completing, setCompleting] = useState(null)      // challenge_id being completed
  const [toggling,   setToggling]   = useState(false)
  const [xpToast,    setXpToast]    = useState(null)      // { xp, id }

  const T = {
    title:      isRu ? 'Задания дня'              : 'Daily Challenges',
    subtitle:   isRu ? 'Персональные карьерные задания' : 'Personal career challenges',
    streak:     isRu ? 'Серия'                    : 'Streak',
    days:       (n) => isRu
      ? `${n} ${n===1?'день':n<5?'дня':'дней'}`
      : `${n} day${n===1?'':'s'}`,
    subOn:      isRu ? '🔔 Уведомления включены'  : '🔔 Notifications on',
    subOff:     isRu ? '🔕 Уведомления выключены' : '🔕 Notifications off',
    toggle:     isRu
      ? (s) => s ? 'Выключить' : 'Включить уведомления'
      : (s) => s ? 'Turn Off' : 'Enable Notifications',
    done:       isRu ? 'Выполнено ✓'              : 'Done ✓',
    markDone:   isRu ? 'Отметить выполненным'     : 'Mark as Done',
    loading:    isRu ? 'Загружаем задания...'      : 'Loading challenges...',
    empty:      isRu ? 'Нет заданий на сегодня'   : 'No challenges today',
    tomorrow:   isRu ? 'Завтра новые задания'      : 'New challenges tomorrow',
    back:       isRu ? '← Назад'                  : '← Back',
    lvlPrefix:  isRu ? 'Ур.'                       : 'Lv.',
    xpLabel:    'XP',
    easy:       isRu ? 'лёгкое'  : 'easy',
    medium:     isRu ? 'среднее' : 'medium',
    hard:       isRu ? 'сложное' : 'hard',
  }

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  const loadData = useCallback(async () => {
    if (!initData) return
    try {
      const [s, c] = await Promise.all([
        fetch(`/api/challenges/status?init_data=${encodeURIComponent(initData)}`).then(r => r.json()),
        fetch(`/api/challenges/today?init_data=${encodeURIComponent(initData)}`).then(r => r.json()),
      ])
      setStatus(s)
      setChallenges(c.challenges || [])
    } catch {
      setChallenges([])
    }
  }, [initData])

  useEffect(() => { loadData() }, [loadData])

  async function markDone(challenge) {
    if (completing || challenge.completed) return
    haptic.medium?.()
    setCompleting(challenge.id)
    try {
      const res = await fetch('/api/challenges/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData, challenge_id: challenge.id }),
      })
      const data = await res.json()
      if (!data.already_done) {
        haptic.success?.()
        setXpToast({ xp: data.xp, id: challenge.id })
        setTimeout(() => setXpToast(null), 2000)
        setStatus(prev => ({ ...prev, total_xp: data.total_xp, streak: data.streak }))
        setChallenges(prev => prev.map(c => c.id === challenge.id ? { ...c, completed: true } : c))
      }
    } catch {}
    setCompleting(null)
  }

  async function toggleSubscription() {
    if (toggling || !initData) return
    haptic.medium?.()
    setToggling(true)
    try {
      const res  = await fetch('/api/challenges/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData }),
      })
      const data = await res.json()
      setStatus(prev => ({ ...prev, subscribed: data.subscribed }))
    } catch {}
    setToggling(false)
  }

  const totalXp  = status?.total_xp || 0
  const streak   = status?.streak   || 0
  const { current: lvl, next: lvlNext, percent: lvlPct } = getProgress(totalXp)
  const levelName = isRu ? lvl.name : lvl.nameEn

  const doneCount = challenges ? challenges.filter(c => c.completed).length : 0
  const totalCount = challenges ? challenges.length : 3

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(160deg,#05050b 0%,#0c0c1e 60%,#08081a 100%)', color: '#f0eeff', fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        @keyframes xpPop {
          0%   { opacity: 0; transform: translateY(0) scale(0.8); }
          30%  { opacity: 1; transform: translateY(-12px) scale(1.1); }
          80%  { opacity: 1; transform: translateY(-20px) scale(1); }
          100% { opacity: 0; transform: translateY(-28px) scale(0.9); }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes completePulse {
          0%   { box-shadow: 0 0 0 0 rgba(34,211,165,0.4); }
          70%  { box-shadow: 0 0 0 10px rgba(34,211,165,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,211,165,0); }
        }
      `}</style>

      <AppHeader />
      <div style={{ paddingTop: 'var(--page-top)', paddingLeft: 16, paddingRight: 16, paddingBottom: 'var(--page-bottom)' }}>

        {/* ── Level + XP bar ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#7c3aed', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, padding: '3px 8px' }}>
                {T.lvlPrefix} {lvl.level}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{levelName}</span>
              {streak > 0 && (
                <span style={{ fontSize: 12, fontWeight: 600, color: '#f97316', background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 20, padding: '3px 10px' }}>
                  🔥 {T.days(streak)}
                </span>
              )}
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              {totalXp}{lvlNext ? ` / ${lvlNext.minXP}` : ''} XP
            </span>
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${lvlPct}%`, background: 'linear-gradient(90deg,#7c3aed,#06b6d4)', borderRadius: 4, transition: 'width 0.5s ease' }} />
          </div>
        </div>

        {/* ── Progress today ── */}
        <div style={{ background: 'rgba(13,13,26,0.7)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
              {isRu ? `Сегодня: ${doneCount} из ${totalCount}` : `Today: ${doneCount} of ${totalCount}`}
            </span>
            {doneCount > 0 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#22d3a5' }}>
                +{challenges?.filter(c => c.completed).reduce((s,c) => s + (c.xp||20), 0)} XP
              </span>
            )}
          </div>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(doneCount/totalCount)*100}%`, background: 'linear-gradient(90deg,#22d3a5,#06b6d4)', borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* ── Subscription toggle ── */}
        <div style={{ background: 'rgba(13,13,26,0.7)', border: `1px solid ${status?.subscribed ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: status?.subscribed ? '#f87171' : 'rgba(255,255,255,0.35)' }}>
            {status ? (status.subscribed ? T.subOn : T.subOff) : '…'}
          </span>
          <button onClick={toggleSubscription} disabled={toggling || status === null}
            style={{ background: status?.subscribed ? 'rgba(244,63,94,0.12)' : 'rgba(124,58,237,0.18)', border: `1px solid ${status?.subscribed ? 'rgba(244,63,94,0.35)' : 'rgba(124,58,237,0.35)'}`, borderRadius: 8, padding: '5px 13px', color: status?.subscribed ? '#f87171' : '#a78bfa', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            {T.toggle(status?.subscribed)}
          </button>
        </div>

        {/* ── Challenges list ── */}
        {challenges === null ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>⏳</div>
            {T.loading}
          </div>
        ) : challenges.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>🎯</div>
            {T.empty}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {challenges.map((c, idx) => {
              const trait  = TRAIT_META[c.trait_target] || { emoji: '💡', color: '#7c3aed', ru: '', en: '' }
              const cat    = CAT_META[c.category]  || { emoji: '💡' }
              const diff   = c.difficulty || 'easy'
              const isComp = c.completed
              const isBusy = completing === c.id
              const title  = isRu ? c.title_ru : c.title_en
              const body   = isRu ? c.text_ru : c.text_en
              const isXpThis = xpToast?.id === c.id

              return (
                <div key={c.id} style={{
                  position: 'relative',
                  background: isComp ? 'rgba(34,211,165,0.05)' : 'rgba(13,13,26,0.72)',
                  border: `1px solid ${isComp ? 'rgba(34,211,165,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  borderLeft: `3px solid ${isComp ? '#22d3a5' : trait.color}`,
                  borderRadius: 14, padding: '14px 15px',
                  animation: `cardIn 0.3s ease ${idx * 0.06}s both`,
                  transition: 'border-color 0.3s',
                }}>
                  {/* XP toast */}
                  {isXpThis && (
                    <div style={{ position: 'absolute', top: 8, right: 12, fontSize: 13, fontWeight: 800, color: '#22d3a5', animation: 'xpPop 2s ease forwards', pointerEvents: 'none' }}>
                      +{c.xp} XP ✨
                    </div>
                  )}

                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{trait.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: trait.color, fontWeight: 600, background: `${trait.color}18`, borderRadius: 6, padding: '2px 7px' }}>
                          {isRu ? trait.ru : trait.en}
                        </span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{cat.emoji}</span>
                        <span style={{ fontSize: 10, color: DIFF_COLOR[diff], opacity: 0.7 }}>
                          {T[diff]}
                        </span>
                      </div>
                      {title && (
                        <div style={{ fontSize: 14, fontWeight: 700, color: isComp ? 'rgba(255,255,255,0.5)' : '#f0eeff', textDecoration: isComp ? 'line-through' : 'none', lineHeight: 1.3 }}>
                          {isComp ? '✓ ' : ''}{title}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isComp ? '#22d3a5' : '#f43f5e', background: isComp ? 'rgba(34,211,165,0.12)' : 'rgba(244,63,94,0.12)', border: `1px solid ${isComp ? 'rgba(34,211,165,0.3)' : 'rgba(244,63,94,0.25)'}`, borderRadius: 6, padding: '3px 8px', flexShrink: 0 }}>
                      +{c.xp} {T.xpLabel}
                    </div>
                  </div>

                  {/* Body text */}
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, margin: '0 0 12px', paddingLeft: title ? 32 : 0 }}>
                    {body}
                  </p>

                  {/* Button */}
                  {isComp ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 32, fontSize: 12, fontWeight: 600, color: '#22d3a5', background: 'rgba(34,211,165,0.1)', borderRadius: 8, padding: '6px 12px', width: 'fit-content' }}>
                      ✓ {T.done}
                    </div>
                  ) : (
                    <button onClick={() => markDone(c)} disabled={isBusy}
                      style={{ width: '100%', background: isBusy ? 'rgba(124,58,237,0.15)' : 'rgba(244,63,94,0.12)', border: `1px solid ${isBusy ? 'rgba(124,58,237,0.35)' : 'rgba(244,63,94,0.3)'}`, borderRadius: 10, padding: '9px', color: isBusy ? '#a78bfa' : '#f87171', fontSize: 13, fontWeight: 600, cursor: isBusy ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                      {isBusy ? '...' : T.markDone}
                    </button>
                  )}
                </div>
              )
            })}

            {/* Tomorrow card */}
            <div style={{ background: 'rgba(13,13,26,0.4)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '18px 16px', position: 'relative', overflow: 'hidden', opacity: 0.6 }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, zIndex: 2 }}>
                <span style={{ fontSize: 22 }}>🔒</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{T.tomorrow}</span>
              </div>
              <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#f0eeff', marginBottom: 8 }}>???</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor</div>
              </div>
            </div>
          </div>
        )}

        <div style={{ paddingTop: 20 }}>
          <button onClick={onBack} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '13px', color: 'rgba(255,255,255,0.5)', fontSize: 14, cursor: 'pointer' }}>
            {T.back}
          </button>
        </div>
      </div>
    </div>
  )
}
