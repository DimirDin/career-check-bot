/**
 * useTelegram — хук для работы с Telegram WebApp API.
 * Безопасен для запуска вне Telegram (браузер/dev).
 */

import { useEffect, useState } from 'react'

const tg = window.Telegram?.WebApp

export function useTelegram() {
  const [themeParams, setThemeParams] = useState(tg?.themeParams || {})

  useEffect(() => {
    if (!tg) return
    tg.ready()
    // Telegram 10.1+: полноэкранный режим; fallback — expand()
    if (tg.requestFullscreen) {
      tg.requestFullscreen()
    } else {
      tg.expand()
    }
    // Отключить свайп вниз для закрытия
    if (tg.disableVerticalSwipes) {
      tg.disableVerticalSwipes()
    }
    const handler = () => setThemeParams({ ...tg.themeParams })
    tg.onEvent('themeChanged', handler)
    return () => tg.offEvent('themeChanged', handler)
  }, [])

  return {
    tg,
    user: tg?.initDataUnsafe?.user || null,
    initData: tg?.initData || '',
    themeParams,
    isDark: tg?.colorScheme === 'dark',

    // Главная кнопка
    showMainButton: (text, onClick) => {
      if (!tg) return
      tg.MainButton.setText(text)
      tg.MainButton.onClick(onClick)
      tg.MainButton.show()
    },
    hideMainButton: () => tg?.MainButton.hide(),
    setMainButtonLoading: (v) => {
      if (!tg) return
      v ? tg.MainButton.showProgress() : tg.MainButton.hideProgress()
    },

    // Кнопка Back
    showBackButton: (onClick) => {
      if (!tg) return
      tg.BackButton.show()
      tg.BackButton.onClick(onClick)
    },
    hideBackButton: () => tg?.BackButton.hide(),

    // Haptics
    haptic: {
      light:     () => tg?.HapticFeedback?.impactOccurred('light'),
      medium:    () => tg?.HapticFeedback?.impactOccurred('medium'),
      heavy:     () => tg?.HapticFeedback?.impactOccurred('heavy'),
      rigid:     () => tg?.HapticFeedback?.impactOccurred('rigid'),
      success:   () => tg?.HapticFeedback?.notificationOccurred('success'),
      error:     () => tg?.HapticFeedback?.notificationOccurred('error'),
      select:    () => tg?.HapticFeedback?.selectionChanged(),
      selection: () => tg?.HapticFeedback?.selectionChanged(),
    },

    // Закрыть Mini App
    close: () => tg?.close(),
  }
}
