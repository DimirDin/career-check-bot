/**
 * AIChatPage — AI-консультант карьеры.
 * 10 бесплатных вопросов / 30 дней. История сохраняется в localStorage.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { track }       from '../hooks/useAnalytics'
import { AppHeader }   from '../components/AppHeader/AppHeader'

const BOT_LINK       = 'https://t.me/CareerCheck_Bot?start=premium'
const MAX_INPUT      = 400
const SEND_TIMEOUT   = 30000   // 30 секунд до показа ошибки таймаута
const STORAGE_KEY    = 'cc_chat_history_v2'
const MAX_STORED_MSG = 30      // сколько сообщений хранить в localStorage

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveHistory(msgs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_STORED_MSG))) } catch {}
}

export function AIChatPage({ onBack }) {
  const { tg, haptic, initData } = useTelegram()
  const lang = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu = lang !== 'en'

  const [messages,  setMessages]  = useState(() => loadHistory())
  const [input,     setInput]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [remaining, setRemaining] = useState(null)
  const [total,     setTotal]     = useState(10)
  const [exceeded,  setExceeded]  = useState(false)

  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const timerRef   = useRef(null)

  const T = {
    title:       isRu ? 'AI-консультант'              : 'AI Career Coach',
    placeholder: isRu ? 'Спроси о карьере…'           : 'Ask a career question…',
    send:        isRu ? '↑'                           : '↑',
    greeting:    isRu
      ? 'Привет! Я знаю твой карьерный профиль — Big Five и топ-профессии. Спроси что угодно: подходит ли профессия, как развить навык, с чего начать или как пройти собеседование.'
      : "Hi! I know your career profile — Big Five and top careers. Ask anything: whether a career suits you, how to develop a skill, or how to ace an interview.",
    quota:       (n, t) => isRu
      ? `${n} из ${t} вопросов`
      : `${n} of ${t} questions`,
    exceeded_title: isRu ? 'Вопросы закончились'           : 'Questions used up',
    exceeded_desc:  isRu
      ? 'Твои 10 бесплатных вопросов израсходованы. Они обновятся через 30 дней.'
      : 'Your 10 free questions are used up. They reset in 30 days.',
    premium_btn: isRu ? '🌟 Получить Premium — 99 Stars' : '🌟 Get Premium — 99 Stars',
    clear:       isRu ? 'Очистить чат'                   : 'Clear chat',
    error:       isRu ? 'Ошибка. Попробуй снова.'        : 'Error. Please try again.',
    timeout:     isRu ? 'Ответ занял слишком долго. Попробуй снова.' : 'Response took too long. Please try again.',
    unavailable: isRu ? 'AI временно недоступен. Попробуй через минуту.' : 'AI temporarily unavailable. Try in a minute.',
    chars:       (n) => isRu ? `${n}/${MAX_INPUT}` : `${n}/${MAX_INPUT}`,
    thinking:    isRu ? 'Думает…' : 'Thinking…',
  }

  // BackButton
  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  // Load quota + show greeting if no history
  useEffect(() => {
    track('ai_chat_open')
    if (!initData) return
    fetch(`/api/chat/quota?init_data=${encodeURIComponent(initData)}`)
      .then(r => r.json())
      .then(d => {
        setRemaining(d.remaining)
        setTotal(d.total || 10)
        if (d.remaining <= 0) setExceeded(true)
      })
      .catch(() => {})

    // Greeting только если история пустая
    setMessages(prev => {
      if (prev.length === 0) {
        return [{ role: 'assistant', content: T.greeting, id: 'greeting' }]
      }
      return prev
    })
  }, [initData]) // eslint-disable-line

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Persist history (except greeting)
  useEffect(() => {
    const toSave = messages.filter(m => m.id !== 'greeting')
    if (toSave.length > 0) saveHistory(toSave)
  }, [messages])

  const clearChat = useCallback(() => {
    haptic.medium?.()
    localStorage.removeItem(STORAGE_KEY)
    setMessages([{ role: 'assistant', content: T.greeting, id: 'greeting' }])
  }, [haptic, T.greeting])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading || exceeded) return
    if (text.length > MAX_INPUT) return

    haptic.select?.()
    setInput('')
    inputRef.current?.focus()

    const userMsg = { role: 'user', content: text, id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    track('ai_chat_question')

    // Таймаут
    timerRef.current = setTimeout(() => {
      setLoading(false)
      setMessages(prev => [...prev, {
        role: 'assistant', content: T.timeout, id: Date.now() + 1, isError: true
      }])
    }, SEND_TIMEOUT)

    // History для API (без greeting, только role+content)
    const history = messages
      .filter(m => m.id !== 'greeting')
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const res  = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ init_data: initData, message: text, history, lang }),
      })
      clearTimeout(timerRef.current)

      // Таймер уже сработал — не добавляем ответ
      if (!timerRef.current) return

      const data = await res.json()

      if (res.status === 402) {
        setExceeded(true)
        setRemaining(0)
      } else if (res.status === 503) {
        setMessages(prev => [...prev, {
          role: 'assistant', content: T.unavailable, id: Date.now(), isError: true
        }])
      } else if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, id: Date.now() }])
        setRemaining(data.remaining)
        if (data.remaining <= 0) setExceeded(true)
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant', content: T.error, id: Date.now(), isError: true
        }])
      }
    } catch {
      clearTimeout(timerRef.current)
      setMessages(prev => [...prev, {
        role: 'assistant', content: T.error, id: Date.now(), isError: true
      }])
    }

    timerRef.current = null
    setLoading(false)
  }

  // Очищаем таймер при анмаунте
  useEffect(() => () => clearTimeout(timerRef.current), [])

  const charsLeft   = MAX_INPUT - input.length
  const charsNear   = input.length > MAX_INPUT * 0.8
  const quotaPct    = remaining !== null && total ? (remaining / total) * 100 : 100
  const quotaColor  = quotaPct > 40 ? '#22d3a5' : quotaPct > 15 ? '#f59e0b' : '#f43f5e'

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100dvh', background: 'linear-gradient(160deg,#05050b 0%,#0c0c1e 60%,#08081a 100%)',
      color: '#f0eeff', fontFamily: "'Inter',sans-serif",
    }}>
      <style>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot {
          0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
          40%         { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      <AppHeader />

      {/* ── Quota bar ── */}
      <div style={{ paddingTop: 'var(--page-top)', paddingLeft: 16, paddingRight: 16, paddingBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
            {remaining !== null ? T.quota(remaining, total) : '…'}
          </span>
          {messages.filter(m => m.id !== 'greeting').length > 0 && (
            <button onClick={clearChat} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: 0,
            }}>
              {T.clear}
            </button>
          )}
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${quotaPct}%`,
            background: quotaColor, borderRadius: 2,
            transition: 'width 0.4s ease, background 0.3s',
          }} />
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map(msg => (
          <div key={msg.id} style={{
            animation: 'msgIn 0.25s ease',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '82%',
          }}>
            <div style={{
              padding: '10px 13px',
              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #7c3aed, #5b21b6)'
                : msg.isError
                  ? 'rgba(244,63,94,0.1)'
                  : 'rgba(255,255,255,0.07)',
              border: msg.isError ? '1px solid rgba(244,63,94,0.25)' : 'none',
              fontSize: 14, lineHeight: 1.55,
              color: msg.isError ? '#f87171' : '#f0eeff',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {msg.content}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{
              padding: '12px 16px', borderRadius: '14px 14px 14px 4px',
              background: 'rgba(255,255,255,0.07)',
              display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0, 0.18, 0.36].map((delay, i) => (
                <span key={i} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: '#a78bfa', display: 'inline-block',
                  animation: `dot 1.2s ${delay}s infinite`,
                }} />
              ))}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3, marginLeft: 4 }}>
              {T.thinking}
            </div>
          </div>
        )}
        <div ref={bottomRef} style={{ height: 4 }} />
      </div>

      {/* ── Quota exceeded ── */}
      {exceeded && (
        <div style={{
          margin: '8px 14px', padding: '14px 16px',
          background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.2)',
          borderRadius: 14, textAlign: 'center',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 4 }}>{T.exceeded_title}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 12 }}>{T.exceeded_desc}</div>
          <button onClick={() => { haptic.medium?.(); track('ai_chat_premium_click'); tg?.openTelegramLink?.(BOT_LINK) }}
            style={{
              width: '100%', padding: '11px', borderRadius: 10,
              background: 'linear-gradient(135deg,#7c3aed,#5b21b6)',
              border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
            {T.premium_btn}
          </button>
        </div>
      )}

      {/* ── Input ── */}
      {!exceeded && (
        <div style={{ padding: '8px 14px', paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}>
          {charsNear && (
            <div style={{
              textAlign: 'right', fontSize: 11, marginBottom: 4,
              color: charsLeft < 40 ? '#f43f5e' : 'rgba(255,255,255,0.3)',
            }}>
              {T.chars(input.length)}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.slice(0, MAX_INPUT))}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              placeholder={T.placeholder}
              disabled={loading}
              rows={1}
              style={{
                flex: 1, padding: '11px 14px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, color: '#f0eeff', fontSize: 14,
                outline: 'none', resize: 'none', lineHeight: 1.5,
                fontFamily: 'inherit', maxHeight: 100, overflowY: 'auto',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || input.length > MAX_INPUT}
              style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: input.trim() && !loading
                  ? 'linear-gradient(135deg,#7c3aed,#5b21b6)'
                  : 'rgba(255,255,255,0.07)',
                border: 'none', color: '#fff', fontSize: 18,
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.2s',
              }}
            >
              {loading ? '…' : '↑'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
