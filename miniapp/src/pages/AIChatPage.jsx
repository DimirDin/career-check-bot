/**
 * AIChatPage — AI-консультант карьеры (N4).
 * 3 бесплатных вопроса. Знает профиль Big Five + RIASEC.
 */
import { useState, useEffect, useRef } from 'react'
import { useTelegram } from '../hooks/useTelegram'
import { track }       from '../hooks/useAnalytics'
import { AppHeader }   from '../components/AppHeader/AppHeader'

const BOT_LINK = 'https://t.me/CareerCheck_Bot?start=premium'

export function AIChatPage({ onBack }) {
  const { tg, haptic, initData } = useTelegram()
  const lang   = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu   = lang !== 'en'

  const [messages,   setMessages]   = useState([])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [remaining,  setRemaining]  = useState(null)
  const [exceeded,   setExceeded]   = useState(false)
  const bottomRef = useRef(null)

  const T = {
    title:       isRu ? '🤖 AI-консультант' : '🤖 AI Career Coach',
    placeholder: isRu ? 'Задай вопрос о карьере…' : 'Ask a career question…',
    send:        isRu ? 'Отправить' : 'Send',
    free:        (n) => isRu ? `${n} бесплатных вопросов` : `${n} free questions`,
    greeting:    isRu
      ? 'Привет! Я знаю твой карьерный профиль. Спроси меня что угодно — подходит ли тебе профессия, как развить навык, с чего начать карьеру.'
      : "Hi! I know your career profile. Ask me anything — whether a career suits you, how to develop a skill, or how to start.",
    exceeded_title: isRu ? '3 бесплатных вопроса использованы' : '3 free questions used',
    exceeded_desc:  isRu
      ? 'Получи Premium для безлимитного доступа к AI-консультанту'
      : 'Get Premium for unlimited access to the AI Career Coach',
    premium_btn: isRu ? '🌟 Получить Premium — 99 Stars' : '🌟 Get Premium — 99 Stars',
    error:       isRu ? '❌ Ошибка. Попробуй снова.' : '❌ Error. Try again.',
    unavailable: isRu ? '⚠️ AI временно недоступен. Попробуй позже.' : '⚠️ AI temporarily unavailable.',
    back:        isRu ? '← Назад' : '← Back',
  }

  // Init: load quota + show greeting
  useEffect(() => {
    track('ai_chat_open')
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
    return () => { tg.BackButton.offClick(onBack); tg.BackButton.hide() }
  }, [tg, onBack])

  useEffect(() => {
    if (!initData) return
    fetch(`/api/chat/quota?init_data=${encodeURIComponent(initData)}`)
      .then(r => r.json())
      .then(d => {
        setRemaining(d.remaining)
        if (d.remaining <= 0) setExceeded(true)
      })
      .catch(() => {})
    // Show greeting
    setMessages([{ role: 'assistant', content: T.greeting, id: 0 }])
  }, [initData])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend() {
    const text = input.trim()
    if (!text || loading || exceeded) return
    haptic.select()
    setInput('')

    const userMsg = { role: 'user', content: text, id: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    track('ai_chat_question')

    // Build history (exclude greeting)
    const history = messages
      .filter(m => m.id !== 0)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData, message: text, history, lang }),
      })
      const data = await res.json()

      if (res.status === 402) {
        setExceeded(true)
        setMessages(prev => [...prev, { role: 'assistant', content: T.exceeded_desc, id: Date.now(), isExceeded: true }])
      } else if (res.status === 503) {
        setMessages(prev => [...prev, { role: 'assistant', content: T.unavailable, id: Date.now(), isError: true }])
      } else if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, id: Date.now() }])
        setRemaining(data.remaining)
        if (data.remaining <= 0) setExceeded(true)
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: T.error, id: Date.now(), isError: true }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: T.error, id: Date.now(), isError: true }])
    }
    setLoading(false)
  }

  function handlePremium() {
    haptic.medium()
    track('ai_chat_premium_click')
    tg?.openTelegramLink?.(BOT_LINK)
  }

  return (
    <div className="chat-page">
      <AppHeader />

      {/* Messages */}
      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'} ${msg.isError ? 'chat-bubble-error' : ''}`}>
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble chat-bubble-ai chat-typing">
            <span /><span /><span />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quota exceeded CTA */}
      {exceeded && (
        <div className="chat-exceeded">
          <p className="chat-exceeded-title">{T.exceeded_title}</p>
          <p className="chat-exceeded-desc">{T.exceeded_desc}</p>
          <button className="qr-cta-btn" onClick={handlePremium}>{T.premium_btn}</button>
        </div>
      )}

      {/* Input */}
      {!exceeded && (
        <div className="chat-input-row">
          <input
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={T.placeholder}
            maxLength={500}
            disabled={loading}
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || loading}
          >
            {loading ? '…' : '↑'}
          </button>
        </div>
      )}
    </div>
  )
}
