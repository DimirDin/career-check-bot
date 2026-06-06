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

    // Полноэкранный режим (Telegram 10.1+)
    if (tg.requestFullscreen) {
      tg.requestFullscreen()
    } else {
      tg.expand()
    }

    // Отключить свайп вниз для закрытия
    if (tg.disableVerticalSwipes) {
      tg.disableVerticalSwipes()
    }

    // Цвета шапки и фона под тёмную тему
    try { tg.setHeaderColor('#0B0E1A') }     catch {}
    try { tg.setBackgroundColor('#0B0E1A') } catch {}

    // Обновляем CSS-переменную --safe-top = notch + Telegram header
    // contentSafeAreaInsets.top — высота шапки Telegram (Back/Close)
    // safeAreaInsets.top        — device notch
    const updateSafeArea = () => {
      const deviceTop  = tg.safeAreaInsets?.top        ?? 0
      const contentTop = tg.contentSafeAreaInsets?.top ?? 0
      const total = deviceTop + contentTop
      if (total > 0) {
        document.documentElement.style.setProperty('--safe-top', `${total}px`)
      }
    }

    updateSafeArea()
    tg.onEvent('safeAreaChanged',        updateSafeArea)
    tg.onEvent('contentSafeAreaChanged', updateSafeArea)

    const handler = () => setThemeParams({ ...tg.themeParams })
    tg.onEvent('themeChanged', handler)

    return () => {
      tg.offEvent('themeChanged',             handler)
      tg.offEvent('safeAreaChanged',          updateSafeArea)
      tg.offEvent('contentSafeAreaChanged',   updateSafeArea)
    }
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
