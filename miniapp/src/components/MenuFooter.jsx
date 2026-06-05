import { IconSettings } from './Icon'
import styles from '../styles/MenuPage.module.css'

const T = {
  ru: { settings: 'Настройки', support: 'Помощь', supportLink: 'По всем вопросам: @CareerCheckSupport' },
  en: { settings: 'Settings',  support: 'Help',   supportLink: 'Support: @CareerCheckSupport' },
  hi: { settings: 'सेटिंग्स',  support: 'सहायता', supportLink: 'सहायता: @CareerCheckSupport' },
  es: { settings: 'Configuración', support: 'Ayuda', supportLink: 'Soporte: @CareerCheckSupport' },
  pt: { settings: 'Configurações', support: 'Ajuda', supportLink: 'Suporte: @CareerCheckSupport' },
}

const LANG_LABEL = { ru: 'Русский', en: 'English', hi: 'हिंदी', es: 'Español', pt: 'Português' }

const tg = window.Telegram?.WebApp

/**
 * @param {{ language: string, onSettings: ()=>void, onSupport: ()=>void, haptic: object }} props
 */
export function MenuFooter({ language, onSettings, haptic }) {
  const t = T[language] || T.ru

  function openSupport() {
    haptic?.medium?.()
    const link = 'https://t.me/CareerCheckSupport'
    if (tg?.openTelegramLink) tg.openTelegramLink(link)
    else if (tg?.openLink)    tg.openLink(link)
    else window.open(link, '_blank')
  }

  return (
    <div className={styles.footer}>
      <div className={styles.footerLinks}>
        <button className={styles.footerLink} onClick={() => { haptic?.light?.(); onSettings() }}>
          <IconSettings size={16} color="currentColor" />
          {t.settings}
        </button>
      </div>

      {/* Поддержка — крупная жирная кликабельная ссылка */}
      <button className="footer-support-link" onClick={openSupport}>
        {t.supportLink}
      </button>

      <p className={styles.footerVersion}>
        CareerCheck v2.1 · {LANG_LABEL[language] || language}
      </p>
    </div>
  )
}
