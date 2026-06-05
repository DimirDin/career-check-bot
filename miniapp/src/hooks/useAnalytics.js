/**
 * useAnalytics — отправляет события воронки на /api/event.
 * Fire-and-forget: ошибки тихо игнорируются.
 */

const tg = window.Telegram?.WebApp

export function track(event, metadata = {}) {
  try {
    const userId = tg?.initDataUnsafe?.user?.id
    if (!userId) return
    fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, user_id: userId, ...metadata }),
    }).catch(() => {})
  } catch {}
}
