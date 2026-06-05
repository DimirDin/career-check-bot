/**
 * Formats a date string according to the user's language.
 * @param {string|null} dateStr - ISO date string or YYYY-MM-DD
 * @param {string} [lang='en'] - 'ru'|'en'|'hi'|'es'|'pt'
 * @returns {string}
 */
export function formatDate(dateStr, lang = 'en') {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    const localeMap = { ru: 'ru-RU', en: 'en-US', hi: 'hi-IN', es: 'es-ES', pt: 'pt-BR' }
    return new Intl.DateTimeFormat(localeMap[lang] || 'en-US', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(date)
  } catch {
    return dateStr
  }
}
