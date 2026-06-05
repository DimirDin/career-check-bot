import { IconSettings, IconHelp } from './Icon'
import styles from '../styles/MenuPage.module.css'

const T = {
  ru: { settings: 'Настройки', support: 'Помощь' },
  en: { settings: 'Settings', support: 'Help' },
  hi: { settings: 'सेटिंग्स', support: 'सहायता' },
  es: { settings: 'Configuración', support: 'Ayuda' },
  pt: { settings: 'Configurações', support: 'Ajuda' },
}

const LANG_LABEL = { ru: 'Русский', en: 'English', hi: 'हिंदी', es: 'Español', pt: 'Português' }

/**
 * @param {{ language: string, onSettings: ()=>void, onSupport: ()=>void, haptic: object }} props
 */
export function MenuFooter({ language, onSettings, onSupport, haptic }) {
  const t = T[language] || T.ru

  return (
    <div className={styles.footer}>
      <div className={styles.footerLinks}>
        <button className={styles.footerLink} onClick={() => { haptic?.light?.(); onSettings() }}>
          <IconSettings size={16} color="currentColor" />
          {t.settings}
        </button>
        <button className={styles.footerLink} onClick={() => { haptic?.light?.(); onSupport() }}>
          <IconHelp size={16} color="currentColor" />
          {t.support}
        </button>
      </div>
      <p className={styles.footerVersion}>
        CareerCheck v2.1 · {LANG_LABEL[language] || language}
      </p>
    </div>
  )
}
