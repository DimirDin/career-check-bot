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

    // Устанавливаем --tg-header-h = высота шапки Telegram (Back/Close + device notch в fullscreen)
    // contentSafeAreaInsets.top — Telegram UI header (в fullscreen уже включает notch)
    // safeAreaInsets.top        — device notch
    const applyInsets = () => {
      const contentTop = tg.contentSafeAreaInsets?.top ?? 0
      const safeTop    = tg.safeAreaInsets?.top        ?? 0
      let top = Math.max(contentTop, safeTop)
      // В fullscreen Telegram отрисовывает строку BackButton (~44px) поверх контента.
      // Если contentSafeAreaInsets ещё не включает эту строку (старый API или гонка),
      // добавляем её вручную: notch + стандартная высота Telegram-шапки.
      if (tg.isFullscreen && contentTop <= safeTop + 10 && safeTop > 0) {
        top = safeTop + 44
      }
      if (top > 0) {
        document.documentElement.style.setProperty('--tg-header-h', top + 'px')
      }
    }

    applyInsets()
    // Ретраи: contentSafeAreaInsets может обновиться позже (BackButton, fullscreen-анимация)
    const t1 = setTimeout(applyInsets, 300)
    const t2 = setTimeout(applyInsets, 800)
    tg.onEvent('safeAreaChanged',        applyInsets)
    tg.onEvent('contentSafeAreaChanged', applyInsets)
    tg.onEvent('fullscreenChanged',      applyInsets)

    const handler = () => setThemeParams({ ...tg.themeParams })
    tg.onEvent('themeChanged', handler)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      tg.offEvent('themeChanged',           handler)
      tg.offEvent('safeAreaChanged',        applyInsets)
      tg.offEvent('contentSafeAreaChanged', applyInsets)
      tg.offEvent('fullscreenChanged',      applyInsets)
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
