import { useState, useEffect, useCallback } from 'react'
import { useTelegram } from '../hooks/useTelegram'

const ADMIN_IDS = [756303]

// ── Маленькие утилиты ──────────────────────────────────────────────────────────

function num(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div style={{
      flex: '1 1 calc(50% - 6px)',
      minWidth: 0,
      background: 'rgba(255,255,255,0.05)',
      border: `1px solid ${accent || 'rgba(255,255,255,0.1)'}`,
      borderRadius: 14,
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent || '#fff', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

// ── SVG mini-bar chart ─────────────────────────────────────────────────────────

function BarChart({ data, keyField = 'count', color = '#a855f7', height = 60 }) {
  if (!data || data.length === 0) return null
  const vals = data.map(d => d[keyField] || 0)
  const max = Math.max(...vals, 1)
  const w = 320
  const barW = Math.max(2, Math.floor(w / vals.length) - 1)

  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} style={{ display: 'block' }}>
      {vals.map((v, i) => {
        const bh = Math.max(2, Math.round((v / max) * (height - 6)))
        return (
          <rect
            key={i}
            x={i * (barW + 1)}
            y={height - bh}
            width={barW}
            height={bh}
            rx={2}
            fill={color}
            opacity={0.8}
          />
        )
      })}
    </svg>
  )
}

// ── SVG horizontal bar (для RIASEC/языков) ─────────────────────────────────────

function HBar({ label, value, max, color = '#a855f7' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{num(value)}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '14px 16px',
      ...style,
    }}>
      {children}
    </div>
  )
}

const RIASEC_NAMES = { R: 'Реалистичный', I: 'Исследовательский', A: 'Артистичный', S: 'Социальный', E: 'Предприимчивый', C: 'Конвенциональный' }
const RIASEC_COLORS = { R: '#f97316', I: '#3b82f6', A: '#ec4899', S: '#22c55e', E: '#eab308', C: '#8b5cf6' }

// ── Main ────────────────────────────────────────────────────────────────────────

export function AdminPage({ onBack }) {
  const { user, initData } = useTelegram()
  const [stats, setStats]   = useState(null)
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!initData) return
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`/api/admin/stats?init_data=${encodeURIComponent(initData)}`)
      if (r.status === 403) { setError('Нет доступа'); return }
      if (!r.ok) { setError('Ошибка сервера'); return }
      setStats(await r.json())
    } catch {
      setError('Нет соединения')
    } finally {
      setLoading(false)
    }
  }, [initData])

  useEffect(() => { load() }, [load])

  // Проверка на клиенте (дублирует серверную)
  if (user && !ADMIN_IDS.includes(user.id)) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
        🔒 Нет доступа
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #0a0a0f)', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,10,15,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 20, cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
        <span style={{ fontWeight: 800, fontSize: 16 }}>Admin</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>CareerCheck</span>
        <button onClick={load} style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)', color: '#a855f7', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>↻</button>
      </div>

      <div style={{ padding: '16px 16px 80px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: 'rgba(255,255,255,0.4)' }}>
            Загрузка статистики…
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: 32, color: '#f87171' }}>{error}</div>
        )}

        {stats && !loading && (
          <>
            {/* KPI */}
            <Section title="Ключевые метрики">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <KpiCard label="Пользователей" value={num(stats.kpi.total_users)} sub={`+${stats.kpi.users_today} сегодня · +${stats.kpi.users_7d} за 7д`} accent="#a855f7" />
                <KpiCard label="Тестов пройдено" value={num(stats.kpi.tests_completed)} sub={`Конверсия ${stats.kpi.conversion_pct}%`} accent="#22c55e" />
                <KpiCard label="Покупок Premium" value={num(stats.kpi.total_purchases)} sub={`${num(stats.kpi.total_stars)} ★ всего`} accent="#fbbf24" />
                <KpiCard label="Рефералов" value={num(stats.kpi.total_referrals)} sub={`${stats.kpi.ref_bonus_granted} бонусов выдано`} accent="#38bdf8" />
              </div>
            </Section>

            {/* Регистрации + тесты */}
            <Section title="Регистрации за 30 дней">
              <Card>
                <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: '#a855f7' }}>■ Регистрации</span>
                  <span style={{ fontSize: 11, color: '#22c55e' }}>■ Тесты</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <BarChart data={stats.registrations_30d} color="#a855f7" height={55} />
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                    <BarChart data={stats.tests_30d} color="#22c55e22" height={55} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    {stats.registrations_30d[0]?.date?.slice(5)}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    {stats.registrations_30d[stats.registrations_30d.length - 1]?.date?.slice(5)}
                  </span>
                </div>
              </Card>
            </Section>

            {/* Покупки */}
            <Section title="Покупки Premium за 30 дней">
              <Card>
                <BarChart data={stats.purchases_30d} keyField="stars" color="#fbbf24" height={55} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    {stats.purchases_30d[0]?.date?.slice(5)}
                  </span>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                    {stats.purchases_30d[stats.purchases_30d.length - 1]?.date?.slice(5)}
                  </span>
                </div>
              </Card>
            </Section>

            {/* Последние покупки */}
            {stats.last_purchases.length > 0 && (
              <Section title="Последние покупки">
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  {stats.last_purchases.map((p, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 14px',
                      borderBottom: i < stats.last_purchases.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{p.date} · A/B: {p.ab_group ?? '?'}</div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#fbbf24' }}>{p.stars} ★</div>
                    </div>
                  ))}
                </Card>
              </Section>
            )}

            {/* RIASEC */}
            {Object.keys(stats.riasec_distribution).length > 0 && (
              <Section title="RIASEC — доминирующие типы">
                <Card>
                  {(() => {
                    const entries = Object.entries(stats.riasec_distribution).sort((a, b) => b[1] - a[1])
                    const maxVal = entries[0]?.[1] || 1
                    return entries.map(([k, v]) => (
                      <HBar key={k} label={`${k} — ${RIASEC_NAMES[k] || k}`} value={v} max={maxVal} color={RIASEC_COLORS[k] || '#a855f7'} />
                    ))
                  })()}
                </Card>
              </Section>
            )}

            {/* Топ профессий */}
            {stats.top_professions.length > 0 && (
              <Section title="Топ профессий (1-е место)">
                <Card>
                  {(() => {
                    const maxVal = stats.top_professions[0]?.count || 1
                    return stats.top_professions.map((p, i) => (
                      <HBar key={i} label={p.title} value={p.count} max={maxVal} color="#a855f7" />
                    ))
                  })()}
                </Card>
              </Section>
            )}

            {/* Языки */}
            <Section title="Языки пользователей">
              <Card>
                {(() => {
                  const maxVal = stats.languages[0]?.count || 1
                  return stats.languages.map((l, i) => (
                    <HBar key={i} label={l.lang?.toUpperCase() || '?'} value={l.count} max={maxVal} color="#38bdf8" />
                  ))
                })()}
              </Card>
            </Section>

            {/* A/B тест */}
            <Section title="A/B тест цен">
              <Card>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['A', 'B', 'C'].map((g, i) => {
                    const pData = stats.ab_groups.purchases.find(p => p.ab_group === i)
                    const uData = stats.ab_groups.users.find(u => Number(u.ab_group) === i)
                    const purchases = pData?.purchases || 0
                    const users = uData?.cnt || 0
                    const cvr = users > 0 ? ((purchases / users) * 100).toFixed(1) : '0.0'
                    return (
                      <div key={g} style={{
                        flex: 1, textAlign: 'center',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 10, padding: '10px 8px',
                        border: `1px solid rgba(168,85,247,${0.1 + i * 0.08})`,
                      }}>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Группа {g}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24' }}>{purchases}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>покупок</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', marginTop: 4 }}>{cvr}%</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>конверсия</div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </Section>
          </>
        )}
      </div>
    </div>
  )
}
