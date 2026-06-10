import { useEffect, useState } from 'react'
import { useTelegram } from '../hooks/useTelegram'

const TAGS = ['O','C','E','A','S']
const TAG_LABELS = { O: 'Открытость', C: 'Сознат.', E: 'Экстра', A: 'Добро', S: 'Стаб.' }

export function JournalPage({ onBack }) {
  const { tg, user } = useTelegram()
  const [entries, setEntries] = useState([])
  const [text, setText] = useState('')
  const [tag, setTag] = useState(null)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  useEffect(() => {
    if (!user) return
    fetch(`/api/journal/${user.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(setEntries)
      .catch(() => {})
  }, [user])

  async function addEntry() {
    if (!text.trim() || !user) return
    setLoading(true)
    try {
      await fetch(`/api/journal/${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), trait_tag: tag }),
      })
      const updated = await fetch(`/api/journal/${user.id}`).then(r => r.json())
      setEntries(updated)
      setText('')
      setTag(null)
    } catch {}
    setLoading(false)
  }

  async function deleteEntry(id) {
    if (!user) return
    await fetch(`/api/journal/${user.id}/${id}`, { method: 'DELETE' })
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  async function loadSummary() {
    if (!user) return
    setSummaryLoading(true)
    try {
      const data = await fetch(`/api/journal/${user.id}/summary`).then(r => r.json())
      setSummary(data)
    } catch {}
    setSummaryLoading(false)
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    } catch { return '' }
  }

  const TAG_CLASS = { O: 'journal-tag-O', C: 'journal-tag-C', E: 'journal-tag-E', A: 'journal-tag-A', S: 'journal-tag-S' }

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
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Карьерный дневник</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{entries.length} записей</div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <div className="journal-input-area">
          <textarea
            className="journal-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Запиши мысль о карьере, инсайт или размышление..."
            maxLength={1000}
          />
          <div className="journal-tags">
            {TAGS.map(t => (
              <button
                key={t}
                className={`journal-tag ${TAG_CLASS[t]} ${tag === t ? 'journal-tag--active' : ''}`}
                onClick={() => setTag(tag === t ? null : t)}
              >
                {TAG_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={addEntry}
          disabled={loading || !text.trim()}
          style={{
            width: '100%', padding: '13px', marginBottom: 16,
            background: text.trim() ? 'rgba(108,92,231,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${text.trim() ? 'rgba(108,92,231,0.35)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 12,
            color: text.trim() ? '#6C5CE7' : 'rgba(255,255,255,0.3)',
            fontSize: 14, fontWeight: 600, cursor: text.trim() ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >
          {loading ? '...' : '+ Добавить запись'}
        </button>

        {entries.length >= 5 && (
          <div style={{ marginBottom: 16 }}>
            {summary ? (
              <div className="journal-summary-card">
                <div className="journal-summary-label">AI-сводка за месяц</div>
                {summary.summary ? (
                  <div className="journal-summary-text">{summary.summary}</div>
                ) : (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                    Нужно минимум 5 записей за последние 30 дней
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={loadSummary}
                disabled={summaryLoading}
                style={{
                  width: '100%', padding: '13px',
                  background: 'rgba(108,92,231,0.08)', border: '1px solid rgba(108,92,231,0.2)',
                  borderRadius: 12, color: '#6C5CE7', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {summaryLoading ? '⏳ Анализирую...' : '🧠 AI-сводка за месяц'}
              </button>
            )}
          </div>
        )}

        {entries.map(entry => (
          <div key={entry.id} className="journal-entry">
            <div className="journal-entry-meta">
              <span className="journal-entry-date">{formatDate(entry.created_at)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {entry.trait_tag && (
                  <span className={`journal-tag journal-tag--active ${TAG_CLASS[entry.trait_tag]}`} style={{ cursor: 'default' }}>
                    {TAG_LABELS[entry.trait_tag]}
                  </span>
                )}
                <button className="journal-delete-btn" onClick={() => deleteEntry(entry.id)}>✕</button>
              </div>
            </div>
            <div className="journal-entry-text">{entry.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
