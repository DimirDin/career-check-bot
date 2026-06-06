/**
 * CareerCheck · AURORA V2 — MenuPage.jsx
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from '../context/NavigationContext'
import { useTelegram } from '../hooks/useTelegram'

/* ─────────────────────────────────────────────
   AURORA V2 DESIGN TOKENS
───────────────────────────────────────────── */
const T = {
  void: '#05050b',
  glass: 'rgba(13,13,26,0.65)',
  violet: '#7c3aed',
  violetSoft: 'rgba(124,58,237,0.18)',
  cyan: '#06b6d4',
  cyanSoft: 'rgba(6,182,212,0.15)',
  rose: '#f43f5e',
  green: '#22d3a5',
  textPrimary: '#f0eeff',
  textSecondary: '#9b97c0',
  textMuted: '#5a5878',
  radius: '16px',
}

/* ─────────────────────────────────────────────
   GLOBAL CSS — injected once
───────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Inter:wght@300;400;500;600&display=swap');

  @keyframes heartbeat {
    0%   { transform: scale(1); }
    14%  { transform: scale(1.08); }
    28%  { transform: scale(1); }
    42%  { transform: scale(1.05); }
    70%  { transform: scale(1); }
    100% { transform: scale(1); }
  }

  @keyframes breathe {
    0%, 100% {
      filter: drop-shadow(0 0 12px rgba(124,58,237,0.45)) drop-shadow(0 0 28px rgba(124,58,237,0.2));
      transform: scale(1);
    }
    50% {
      filter: drop-shadow(0 0 28px rgba(124,58,237,0.85)) drop-shadow(0 0 50px rgba(6,182,212,0.35));
      transform: scale(1.05);
    }
  }

  @keyframes aurora-navPulse {
    0%   { transform: scale(1);   opacity: 0.9; }
    60%  { transform: scale(2.2); opacity: 0; }
    100% { transform: scale(2.2); opacity: 0; }
  }

  @keyframes aurora-onlinePulse {
    0%   { transform: scale(1);   opacity: 1; }
    60%  { transform: scale(2.8); opacity: 0; }
    100% { transform: scale(2.8); opacity: 0; }
  }

  @keyframes aurora-fadeInUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes aurora-ctaGlow {
    0%, 100% { box-shadow: 0 0 16px rgba(6,182,212,0.4), 0 0 32px rgba(124,58,237,0.2); }
    50%       { box-shadow: 0 0 28px rgba(6,182,212,0.7), 0 0 56px rgba(124,58,237,0.4); }
  }

  @keyframes aurora-streakFlicker {
    0%, 90%, 100% { opacity: 1; }
    95%            { opacity: 0.7; }
  }

  .aurora-icon-asset {
    filter: drop-shadow(0 0 14px rgba(124,58,237,0.4)) drop-shadow(0 0 4px rgba(6,182,212,0.25));
    max-height: 80px;
    width: auto;
    object-fit: contain;
    display: block;
    will-change: filter;
  }
  .aurora-icon-asset.catalog {
    filter: drop-shadow(0 0 16px rgba(6,182,212,0.55)) drop-shadow(0 0 6px rgba(6,182,212,0.3)) brightness(1.15);
  }
  .aurora-icon-asset.challenges {
    filter: drop-shadow(0 0 16px rgba(244,63,94,0.55)) drop-shadow(0 0 6px rgba(244,63,94,0.3));
  }
  .aurora-icon-asset.compat {
    filter: drop-shadow(0 0 14px rgba(124,58,237,0.5)) drop-shadow(0 0 28px rgba(6,182,212,0.2));
  }
  .aurora-icon-asset.ai-chat {
    filter: drop-shadow(0 0 18px rgba(244,63,94,0.45)) drop-shadow(0 0 8px rgba(124,58,237,0.4));
  }
  .aurora-icon-asset.hero {
    animation: breathe 3s ease-in-out infinite;
    max-height: 110px;
    will-change: filter, transform;
  }

  .aurora-glass-card {
    background: rgba(13,13,26,0.65);
    border: 1px solid rgba(124,58,237,0.18);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    box-shadow: inset 0 0 14px rgba(6,182,212,0.12), 0 4px 24px rgba(0,0,0,0.4);
    border-radius: 16px;
  }

  .aurora-gradient-text {
    background: linear-gradient(135deg, #a78bfa, #06b6d4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .aurora-no-select { user-select: none; -webkit-user-select: none; }
`

let cssInjected = false
function injectCSS() {
  if (cssInjected) return
  cssInjected = true
  const s = document.createElement('style')
  s.textContent = GLOBAL_CSS
  document.head.appendChild(s)
}

/* ─────────────────────────────────────────────
   SVG ICONS
───────────────────────────────────────────── */
const IconArrow = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
)

const IconFire = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#f97316">
    <path d="M12 2c-1 2-3 3-3 6 0 2 1.5 3 1.5 3S9 9.5 9 8c2 1 3 3 3 6 0 2-1 3.5-1 3.5S14 16 14 13c2 1 2 4 2 4s2-2 2-5c0-4-3-7-6-10z"/>
  </svg>
)

/* ─────────────────────────────────────────────
   RADAR CHART (pure SVG)
───────────────────────────────────────────── */
function RadarChart({ scores = { O: 82, C: 65, E: 71, A: 88, N: 45 }, size = 118 }) {
  const keys = ['O', 'C', 'E', 'A', 'N']
  const cx = size / 2, cy = size / 2, r = size * 0.38
  const levels = [0.25, 0.5, 0.75, 1]
  const angleOf = (i) => (Math.PI * 2 * i) / 5 - Math.PI / 2
  const pt = (i, ratio) => ({
    x: cx + r * ratio * Math.cos(angleOf(i)),
    y: cy + r * ratio * Math.sin(angleOf(i)),
  })
  const polyPoints = keys.map((k, i) => { const p = pt(i, scores[k] / 100); return `${p.x},${p.y}` }).join(' ')

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="auroraRadarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15"/>
        </radialGradient>
        <filter id="auroraRadarGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {levels.map((lvl, li) => (
        <polygon key={li} points={keys.map((_, i) => { const p = pt(i, lvl); return `${p.x},${p.y}` }).join(' ')}
          fill="none" stroke="rgba(124,58,237,0.2)" strokeWidth="0.8"/>
      ))}
      {keys.map((_, i) => {
        const outer = pt(i, 1)
        return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="rgba(124,58,237,0.25)" strokeWidth="0.8"/>
      })}
      <polygon points={polyPoints} fill="url(#auroraRadarFill)" stroke="#06b6d4" strokeWidth="1.5" filter="url(#auroraRadarGlow)"/>
      {keys.map((k, i) => {
        const p = pt(i, scores[k] / 100)
        return <circle key={k} cx={p.x} cy={p.y} r="3.5" fill="#06b6d4" stroke="rgba(6,182,212,0.5)" strokeWidth="4" filter="url(#auroraRadarGlow)"/>
      })}
    </svg>
  )
}

/* ─────────────────────────────────────────────
   HEADER
───────────────────────────────────────────── */
function HeaderProfile({ user }) {
  const initials = ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || '?'
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(5,5,11,0.82)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(124,58,237,0.14)',
      padding: 'calc(10px + env(safe-area-inset-top, 0px)) 16px 12px',
    }}>
      {/* Имя по центру */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))',
          border: '1px solid rgba(124,58,237,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#a78bfa',
          boxShadow: '0 0 12px rgba(124,58,237,0.25)',
          letterSpacing: '0.03em',
        }}>
          {initials}
        </div>
        <div>
          <div style={{
            fontSize: 15, fontWeight: 600, lineHeight: 1.2,
            background: 'linear-gradient(135deg, #e2e0f0, #a78bfa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {user.firstName || 'Пользователь'}
          </div>
          <div style={{ fontSize: 10, color: T.textMuted, letterSpacing: '0.05em', marginTop: 1 }}>
            ПРОФИЛЬ АКТИВЕН
          </div>
        </div>
      </div>
      {/* Бейджи второй строкой по центру */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)',
          borderRadius: 8, padding: '4px 9px',
          animation: 'aurora-streakFlicker 4s ease-in-out infinite',
        }}>
          <IconFire/>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fb923c', letterSpacing: '0.06em' }}>7 ДНЕЙ</span>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(6,182,212,0.15))',
          border: '1px solid rgba(124,58,237,0.35)',
          borderRadius: 8, padding: '4px 10px',
          fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.07em',
        }}>
          LVL 4
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   HERO CARD
───────────────────────────────────────────── */
function HeroCard({ testDone, radarScores, onStartTest, onOpenResults }) {
  return (
    <div className="aurora-glass-card" style={{
      padding: '22px 20px', marginBottom: 14,
      overflow: 'hidden', position: 'relative',
      animation: 'aurora-fadeInUp 0.5s ease both', animationDelay: '0.05s',
    }}>
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 180, height: 180,
        background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>
      <div style={{
        position: 'absolute', bottom: -20, left: -20, width: 120, height: 120,
        background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }}/>

      {testDone ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', color: T.cyan, marginBottom: 6, textTransform: 'uppercase' }}>
              ВАШ ПСИХОТИП
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: T.textPrimary, lineHeight: 1.2, marginBottom: 4 }}>
              Исследователь
            </div>
            <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 14, lineHeight: 1.5 }}>
              Big Five · RIASEC · Тип I
            </div>
            <button onClick={onOpenResults} style={{
              background: 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(124,58,237,0.2))',
              border: '1px solid rgba(6,182,212,0.4)', borderRadius: 10, padding: '9px 16px',
              color: T.cyan, fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', gap: 6,
              animation: 'aurora-ctaGlow 2.5s ease-in-out infinite',
            }}>
              Открыть результаты <IconArrow size={13} color={T.cyan}/>
            </button>
          </div>
          <div style={{ flexShrink: 0 }}>
            <RadarChart size={118} scores={radarScores}/>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.1em', color: T.violet, marginBottom: 8, textTransform: 'uppercase' }}>
              НАУЧНАЯ ДИАГНОСТИКА
            </div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: T.textPrimary, lineHeight: 1.15, marginBottom: 8 }}>
              Раскрой<br/>свой потенциал
            </div>
            <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 18, lineHeight: 1.5 }}>
              Big Five + RIASEC · 60 вопросов
            </div>
            <button onClick={onStartTest} className="aurora-no-select" style={{
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              border: 'none', borderRadius: 12, padding: '11px 20px',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', gap: 7,
              animation: 'heartbeat 1.6s ease-in-out infinite',
              boxShadow: '0 4px 20px rgba(124,58,237,0.45)',
              willChange: 'transform',
            }}>
              Начать тест <IconArrow size={14} color="#fff"/>
            </button>
          </div>
          <div style={{
            flexShrink: 0, width: 120, height: 120,
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img src="/webh/hero_logo.webp" alt="CareerCheck AI"
              className="aurora-icon-asset hero" loading="eager"
              style={{ maxHeight: 110, width: '100%', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   QUICK ACTIONS GRID
───────────────────────────────────────────── */
const CARDS = [
  {
    id: 'catalog', title: 'Каталог', sub: '160+ профессий',
    img: '/webh/ic_catalog.webp', cls: 'catalog', route: '/professions',
    accentColor: 'rgba(6,182,212,0.15)', borderColor: 'rgba(6,182,212,0.22)', delay: '0.1s',
  },
  {
    id: 'ai', title: 'ИИ-Эксперт', sub: 'Чат активен',
    img: '/webh/ic_ai_chat.webp', cls: 'ai-chat', route: '/ai-chat',
    online: true,
    accentColor: 'rgba(244,63,94,0.1)', borderColor: 'rgba(244,63,94,0.2)', delay: '0.15s',
  },
  {
    id: 'challenges', title: 'Челленджи', sub: 'Задание дня',
    img: '/webh/ic_challenges.webp', cls: 'challenges', route: '/challenges',
    accentColor: 'rgba(244,63,94,0.1)', borderColor: 'rgba(244,63,94,0.18)', delay: '0.2s',
  },
  {
    id: 'compat', title: 'Сравнение', sub: 'Профиль друга',
    img: '/webh/ic_compat.webp', cls: 'compat', route: '/comparison',
    accentColor: 'rgba(124,58,237,0.15)', borderColor: 'rgba(124,58,237,0.22)', delay: '0.25s',
  },
]

function QuickActionsGrid({ navigate }) {
  const [pressed, setPressed] = useState(null)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 14 }}>
      {CARDS.map((card) => (
        <div key={card.id} className="aurora-no-select"
          onTouchStart={() => setPressed(card.id)}
          onTouchEnd={() => { setPressed(null); navigate(card.route) }}
          onTouchCancel={() => setPressed(null)}
          onClick={() => navigate(card.route)}
          style={{
            background: 'rgba(13,13,26,0.65)',
            border: `1px solid ${card.borderColor}`,
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            boxShadow: `inset 0 0 14px ${card.accentColor}, 0 4px 20px rgba(0,0,0,0.35)`,
            borderRadius: 16, padding: '16px 14px', cursor: 'pointer',
            position: 'relative', overflow: 'hidden',
            transition: 'transform 0.15s ease',
            transform: pressed === card.id ? 'scale(0.97)' : 'scale(1)',
            animation: 'aurora-fadeInUp 0.45s ease both',
            animationDelay: card.delay,
            willChange: 'transform',
          }}
        >
          {card.online && (
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.green, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: T.green, animation: 'aurora-onlinePulse 1.8s ease-out infinite' }}/>
              </div>
            </div>
          )}
          <div style={{
            position: 'absolute', top: 0, right: 0, width: 60, height: 60,
            background: `radial-gradient(circle at top right, ${card.accentColor}, transparent 70%)`,
            pointerEvents: 'none',
          }}/>
          <div style={{
            width: 68, height: 68, borderRadius: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <img src={card.img} alt={card.title}
              className={`aurora-icon-asset ${card.cls}`} loading="lazy"
              style={{ maxHeight: 64, width: '100%', objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted, marginBottom: 3 }}>
            МОДУЛЬ
          </div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: T.textPrimary, lineHeight: 1.2, marginBottom: 3 }}>
            {card.title}
          </div>
          <div style={{ fontSize: 12, color: T.textSecondary }}>{card.sub}</div>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────────── */
function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.textMuted }}>
        {title}
      </div>
      {action && (
        <button onClick={onAction} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, color: T.cyan, fontWeight: 600, letterSpacing: '0.04em',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          {action} <IconArrow size={11} color={T.cyan}/>
        </button>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   MAIN: MenuPage
───────────────────────────────────────────── */
export function MenuPage() {
  const navigate = useNavigate()
  const { tg, user } = useTelegram()

  useEffect(() => { injectCSS() }, [])

  useEffect(() => {
    if (!tg) return
    tg.setHeaderColor?.('#05050b')
    tg.setBackgroundColor?.('#05050b')
  }, [tg])

  // Данные пользователя из Telegram
  const userData = {
    firstName: user?.first_name || tg?.initDataUnsafe?.user?.first_name || 'Пользователь',
    lastName: user?.last_name || tg?.initDataUnsafe?.user?.last_name || '',
  }

  // Проверяем есть ли результаты теста
  const testDone = !!localStorage.getItem('cc_test_done')
  const radarScores = { O: 82, C: 65, E: 71, A: 88, N: 45 }

  const HEADER_H = 96

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(160deg, #05050b 0%, #0c0c1e 60%, #08081a 100%)',
      paddingTop: `calc(${HEADER_H}px + env(safe-area-inset-top, 0px))`,
      paddingLeft: 14, paddingRight: 14,
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
    }}>
      {/* Ambient glows */}
      <div style={{
        position: 'fixed', top: '15%', left: '10%', width: 260, height: 260,
        background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }}/>
      <div style={{
        position: 'fixed', top: '50%', right: '-5%', width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
        pointerEvents: 'none', zIndex: 0,
      }}/>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 430, margin: '0 auto' }}>
        {/* Hero */}
        <div style={{ marginTop: 12, marginBottom: 4 }}>
          <SectionHeader title={testDone ? 'Ваш результат' : 'Начни здесь'}/>
          <HeroCard
            testDone={testDone}
            radarScores={radarScores}
            onStartTest={() => navigate('/test')}
            onOpenResults={() => navigate('/results')}
          />
        </div>

        {/* Quick Actions */}
        <div style={{ marginBottom: 4 }}>
          <SectionHeader title="Модули" action="Все" onAction={() => navigate('/professions')}/>
          <QuickActionsGrid navigate={navigate}/>
        </div>

        {/* XP Progress block */}
        <div className="aurora-glass-card aurora-no-select" style={{
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
          cursor: 'pointer',
          animation: 'aurora-fadeInUp 0.45s ease both', animationDelay: '0.3s',
          marginBottom: 16,
        }}
          onClick={() => navigate('/history')}
        >
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(34,211,165,0.2), rgba(6,182,212,0.1))',
            border: '1px solid rgba(34,211,165,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="8" stroke="rgba(34,211,165,0.4)" strokeWidth="1.5"/>
              <path d="M10 5v5l3 2" stroke="#22d3a5" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, marginBottom: 4 }}>
              История прохождений
            </div>
            <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: '68%',
                background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
                borderRadius: 4, boxShadow: '0 0 6px rgba(6,182,212,0.5)',
              }}/>
            </div>
          </div>
          <IconArrow size={14} color={T.textMuted}/>
        </div>
      </div>

      {/* Fixed Header */}
      <HeaderProfile user={userData}/>
    </div>
  )
}
