import { useEffect, useState } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { AppHeader } from '../components/AppHeader/AppHeader'
import { getProgress } from '../utils/xpLevels'

const SAMPLE_CHALLENGES_RU = [
  { id: 1, title: 'Исследуй новое поле', desc: 'Прочитай 1 статью о профессии из твоего топ-5 и запиши 3 инсайта.', xp: 20 },
  { id: 2, title: 'Сетевинг за 5 минут', desc: 'Напиши сообщение специалисту из интересующей тебя сферы — просто познакомься.', xp: 30 },
  { id: 3, title: 'Рефлексия дня', desc: 'Запиши одно профессиональное достижение за сегодня, даже маленькое.', xp: 15 },
  { id: 4, title: 'Сила привычки', desc: 'Посвяти 15 минут развитию ключевого навыка для твоей топ-профессии.', xp: 25 },
  { id: 5, title: 'Обратная связь', desc: 'Попроси коллегу или друга оценить одно из твоих профессиональных качеств.', xp: 20 },
]

const SAMPLE_CHALLENGES_EN = [
  { id: 1, title: 'Explore a new field', desc: 'Read 1 article about a profession from your top-5 and write down 3 insights.', xp: 20 },
  { id: 2, title: '5-minute networking', desc: 'Message a professional in your area of interest — just introduce yourself.', xp: 30 },
  { id: 3, title: 'Daily reflection', desc: 'Write down one professional achievement from today, even a small one.', xp: 15 },
  { id: 4, title: 'Power of habit', desc: 'Spend 15 minutes developing a key skill for your top profession.', xp: 25 },
  { id: 5, title: 'Get feedback', desc: 'Ask a colleague or friend to evaluate one of your professional qualities.', xp: 20 },
]

export function ChallengesPage({ onBack }) {
  const { tg, haptic, initData } = useTelegram()
  const lang = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu = lang !== 'en'

  const [subscribed,    setSubscribed]    = useState(null)
  const [streak,        setStreak]        = useState(0)
  const [toggling,      setToggling]      = useState(false)
  const [justCompleted, setJustCompleted] = useState(null)
  const [done,          setDone]          = useState(() => {
    try { return JSON.parse(localStorage.getItem('cc_challenges_done') || '[]') } catch { return [] }
  })

  const challenges = isRu ? SAMPLE_CHALLENGES_RU : SAMPLE_CHALLENGES_EN

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  useEffect(() => {
    if (!initData) return
    fetch(`/api/challenges/status?init_data=${encodeURIComponent(initData)}`)
      .then(r => r.json())
      .then(d => { setSubscribed(d.subscribed); setStreak(d.streak || 0) })
      .catch(() => setSubscribed(false))
  }, [initData])

  async function toggleSubscription() {
    if (toggling || !initData) return
    haptic.medium()
    setToggling(true)
    try {
      const res  = await fetch('/api/challenges/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData }),
      })
      const data = await res.json()
      setSubscribed(data.subscribed)
    } catch {}
    setToggling(false)
  }

  function markDone(id) {
    haptic.success?.()
    setJustCompleted(id)
    setTimeout(() => setJustCompleted(null), 600)
    setDone(prev => {
      if (prev.includes(id)) return prev
      const next = [...prev, id]
      try { localStorage.setItem('cc_challenges_done', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const doneCount = done.filter(id => challenges.find(c => c.id === id)).length
  const totalXp   = done.filter(id => challenges.find(c => c.id === id))
                        .reduce((acc, id) => acc + (challenges.find(c => c.id === id)?.xp || 0), 0)

  const T = {
    title:      isRu ? 'Задания'                    : 'Challenges',
    subtitle:   isRu ? 'Карьерные челленджи'        : 'Career Challenges',
    streakLabel:isRu ? 'Серия'                      : 'Streak',
    days:       isRu ? 'дней'                       : 'days',
    progress:   isRu ? `Выполнено сегодня: ${doneCount}/${challenges.length}` : `Done today: ${doneCount}/${challenges.length}`,
    xp:         isRu ? `+${totalXp} XP заработано` : `+${totalXp} XP earned`,
    subOn:      isRu ? '🔔 Подписан на ежедневные задания' : '🔔 Subscribed to daily challenges',
    subOff:     isRu ? '🔕 Подписка отключена'             : '🔕 Notifications disabled',
    toggle:     isRu ? (subscribed ? 'Отписаться' : 'Подписаться') : (subscribed ? 'Unsubscribe' : 'Subscribe'),
    xpLabel:    'XP',
    done:       isRu ? 'Готово' : 'Done',
    undo:       isRu ? 'Отменить' : 'Undo',
    back:       isRu ? '← Назад' : '← Back',
  }

  const { current: lvl, next: lvlNext, percent: lvlPct } = getProgress(totalXp)
  const levelName = isRu ? lvl.name : lvl.nameEn

  return (
    <div style={{ minHeight: '100dvh', background: 'linear-gradient(160deg,#05050b 0%,#0c0c1e 60%,#08081a 100%)', color: '#f0eeff', fontFamily: "'Inter',sans-serif" }}>
      <style>{`
        @keyframes completeFlash {
          0%   { background: rgba(0,212,170,0); }
          30%  { background: rgba(0,212,170,0.2); }
          100% { background: rgba(0,212,170,0); }
        }
      `}</style>
      <AppHeader />

      <div style={{ paddingTop: 'var(--page-top)', paddingLeft: 16, paddingRight: 16, paddingBottom: 'var(--page-bottom)' }}>

        {/* Level header */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 12, fontWeight: 800, color: '#7c3aed',
                background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: 8, padding: '3px 8px',
              }}>
                {isRu ? `Ур. ${lvl.level}` : `Lv. ${lvl.level}`}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{levelName}</span>
              {streak > 0 && (
                <span style={{
                  fontSize: 12, fontWeight: 600, color: '#f97316',
                  background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)',
                  borderRadius: 20, padding: '3px 10px',
                }}>
                  🔥 {streak} {isRu ? (streak === 1 ? 'день' : streak < 5 ? 'дня' : 'дней') : 'days'}
                </span>
              )}
            </div>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              {totalXp}{lvlNext ? `/${lvlNext.minXP}` : ''} XP
            </span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${lvlPct}%`,
              background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
              borderRadius: 4, transition: 'width 0.4s ease',
            }} />
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background: 'rgba(13,13,26,0.65)', border: '1px solid rgba(244,63,94,0.18)', borderRadius: 16, padding: '14px 16px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{T.progress}</span>
            {totalXp > 0 && <span style={{ fontSize: 12, color: '#22d3a5', fontWeight: 600 }}>{T.xp}</span>}
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${(doneCount / challenges.length) * 100}%`,
              background: 'linear-gradient(90deg,#f43f5e,#7c3aed)',
              borderRadius: 4, transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Subscription toggle */}
        <div style={{
          background: 'rgba(13,13,26,0.65)', border: `1px solid ${subscribed ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 14, padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 18,
        }}>
          <span style={{ fontSize: 13, color: subscribed ? '#f43f5e' : 'rgba(255,255,255,0.4)' }}>
            {subscribed !== null ? (subscribed ? T.subOn : T.subOff) : '…'}
          </span>
          <button
            onClick={toggleSubscription}
            disabled={toggling || subscribed === null}
            style={{
              background: subscribed ? 'rgba(244,63,94,0.15)' : 'rgba(124,58,237,0.2)',
              border: `1px solid ${subscribed ? 'rgba(244,63,94,0.4)' : 'rgba(124,58,237,0.4)'}`,
              borderRadius: 8, padding: '6px 14px',
              color: subscribed ? '#f43f5e' : '#a78bfa',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {T.toggle}
          </button>
        </div>

        {/* Challenges list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {challenges.map(c => {
            const isDone      = done.includes(c.id)
            const isFlashing  = justCompleted === c.id
            return (
              <div key={c.id} style={{
                background: isDone ? 'rgba(34,211,165,0.06)' : 'rgba(13,13,26,0.65)',
                border: `1px solid ${isDone ? 'rgba(34,211,165,0.25)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 14, padding: '14px 16px',
                transition: 'all 0.2s ease',
                animation: isFlashing ? 'completeFlash 0.6s ease forwards' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: isDone ? '#22d3a5' : '#f0eeff',
                    textDecoration: isDone ? 'line-through' : 'none',
                    opacity: isDone ? 0.7 : 1, flex: 1,
                  }}>
                    {isDone ? '✓ ' : ''}{c.title}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, color: isDone ? '#22d3a5' : '#f43f5e',
                    background: isDone ? 'rgba(34,211,165,0.12)' : 'rgba(244,63,94,0.12)',
                    border: `1px solid ${isDone ? 'rgba(34,211,165,0.3)' : 'rgba(244,63,94,0.25)'}`,
                    borderRadius: 6, padding: '3px 8px', flexShrink: 0,
                  }}>
                    +{c.xp} {T.xpLabel}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 10 }}>
                  {c.desc}
                </div>
                {isDone ? (
                  /* Бейдж "Выполнено" вместо кнопки Отменить */
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 12, color: '#22d3a5',
                    padding: '6px 12px', marginTop: 4,
                    background: 'rgba(0,212,170,0.1)',
                    borderRadius: 8, width: 'fit-content',
                  }}>
                    <span>✓</span>
                    <span>{isRu ? 'Выполнено' : 'Completed'}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => markDone(c.id)}
                    style={{
                      background: 'rgba(244,63,94,0.15)',
                      border: '1px solid rgba(244,63,94,0.35)',
                      borderRadius: 8, padding: '7px 16px',
                      color: '#f43f5e',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%',
                    }}
                  >
                    {T.done}
                  </button>
                )}
              </div>
            )
          })}

          {/* Locked preview — завтрашнее задание */}
          <div style={{
            background: 'rgba(13,13,26,0.65)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, padding: '14px 16px',
            position: 'relative', overflow: 'hidden', opacity: 0.7,
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              gap: 4, zIndex: 2,
              fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.7)',
            }}>
              <span style={{ fontSize: 20 }}>🔒</span>
              <span>{isRu ? 'Завтра' : 'Tomorrow'}</span>
            </div>
            <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f0eeff', marginBottom: 8 }}>
                {isRu ? 'Следующее задание' : 'Next challenge'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {isRu ? 'Описание появится завтра в 9:00' : 'Description available tomorrow at 9:00'}
              </div>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: 16 }}>
          <button
            onClick={onBack}
            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '13px', color: 'rgba(255,255,255,0.6)', fontSize: 14, cursor: 'pointer' }}
          >
            {T.back}
          </button>
        </div>
      </div>
    </div>
  )
}
