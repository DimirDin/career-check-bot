import { useEffect, useRef, useState, useCallback } from 'react'
import { useTelegram }         from '../hooks/useTelegram'
import { useUserState }        from '../hooks/useUserState'
import { useNavigate }         from '../context/NavigationContext'
import { HeroBanner }          from '../components/HeroBanner'
import { PrimaryCTA }          from '../components/PrimaryCTA'
import { QuickActionsGrid }    from '../components/QuickActionsGrid'
import { SmartRecommendation } from '../components/SmartRecommendation'
import { MenuFooter }          from '../components/MenuFooter'
import { NeuralNet }           from '../components/NeuralNet'
import styles from '../styles/MenuPage.module.css'

const MAIN_BTN_TEXTS = {
  ru: { noTest: 'Начать тест', hasTest: 'Пройти снова', inProgress: 'Продолжить тест' },
  en: { noTest: 'Start Test',  hasTest: 'Retake Test',  inProgress: 'Continue Test' },
  hi: { noTest: 'परीक्षण शुरू करें', hasTest: 'दोबारा लें', inProgress: 'जारी रखें' },
  es: { noTest: 'Iniciar test', hasTest: 'Repetir test', inProgress: 'Continuar test' },
  pt: { noTest: 'Iniciar teste', hasTest: 'Refazer teste', inProgress: 'Continuar teste' },
}

export function MenuPage() {
  const navigate = useNavigate()
  const { initData, haptic, tg } = useTelegram()
  const { state, loading, error, refresh } = useUserState(initData)

  // Toast
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  // D1: Aurora blobs — через ref + direct DOM, без re-render
  const blobPurpleRef = useRef(null)
  const blobCyanRef   = useRef(null)
  const rafRef        = useRef(null)
  const handlePointerMove = useCallback((e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      if (blobPurpleRef.current) {
        blobPurpleRef.current.style.left = (clientX - 80) + 'px'
        blobPurpleRef.current.style.top  = (clientY - 80) + 'px'
      }
      if (blobCyanRef.current) {
        blobCyanRef.current.style.left = (clientX + 40) + 'px'
        blobCyanRef.current.style.top  = (clientY + 20) + 'px'
      }
    })
  }, [])

  const showToast = useCallback((msg) => {
    setToast(msg)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2800)
  }, [])

  // Pull-to-refresh
  const containerRef = useRef(null)
  const pullStartY   = useRef(0)
  const isPulling    = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onTouchStart = (e) => {
      // Pull-to-refresh только если: контент вверху И тач начался в ВЕРХНЕЙ трети экрана
      if (el.scrollTop === 0 && e.touches[0].clientY < window.innerHeight * 0.35) {
        pullStartY.current = e.touches[0].clientY
        isPulling.current  = true
      } else {
        isPulling.current = false
      }
    }
    const onTouchEnd = (e) => {
      if (!isPulling.current) return
      isPulling.current = false
      const delta = e.changedTouches[0].clientY - pullStartY.current
      if (delta > 70) { refresh(); haptic.light?.() }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend',   onTouchEnd,   { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [refresh, haptic])

  // Telegram Back / Main Buttons
  useEffect(() => {
    if (!tg) return
    tg.BackButton.hide()

    if (!state) { tg.MainButton.hide(); return }

    const lang  = state.language || 'ru'
    const texts = MAIN_BTN_TEXTS[lang] || MAIN_BTN_TEXTS.ru
    const text  = state.testInProgress ? texts.inProgress : state.hasResults ? texts.hasTest : texts.noTest

    tg.MainButton.setParams({ text, color: '#7347e6', text_color: '#ffffff', is_active: true, is_visible: true })

    const handler = () => { haptic.medium?.(); navigate('/test') }
    tg.MainButton.onClick(handler)

    return () => {
      tg.MainButton.offClick(handler)
      tg.MainButton.hide()
    }
  }, [state, tg, navigate, haptic])

  // Error toast
  useEffect(() => {
    if (error) showToast('⚠️ Не удалось загрузить данные')
  }, [error, showToast])

  if (loading) {
    return (
      <div className={styles.loadingMenu}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Загрузка...</p>
      </div>
    )
  }

  const s = state || {
    hasResults: false, hasPremium: false, testInProgress: false,
    currentQuestion: 0, lastResultDate: null, lastResultId: null,
    historyCount: 0, language: 'ru', topProfession: null,
  }

  return (
    <div
      className={styles.menuContainer}
      ref={containerRef}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      style={{ position: 'relative' }}
    >
      <NeuralNet />
      <div ref={blobPurpleRef} className="aurora-blob aurora-blob-purple" style={{ left: -80, top: -80 }} />
      <div ref={blobCyanRef}   className="aurora-blob aurora-blob-cyan"   style={{ left: 40,  top: 20  }} />
      <div className={styles.safeAreaTop} />

      <HeroBanner
        userState={s}
        onStartTest   ={() => { haptic.medium?.(); navigate('/test') }}
        onContinueTest={() => { haptic.medium?.(); navigate('/test') }}
        onViewResults ={() => { haptic.medium?.(); navigate('/results') }}
        onOpenPremium ={() => { haptic.medium?.(); navigate('/premium') }}
      />

      <PrimaryCTA
        userState={s}
        onClick={() => { haptic.medium?.(); navigate('/test') }}
      />

      <QuickActionsGrid
        userState={s}
        haptic={haptic}
        onResults    ={() => navigate('/results')}
        onPremium    ={() => navigate('/premium')}
        onProfessions={() => navigate('/professions')}
        onHistory    ={() => navigate('/history')}
      />

      {s.topProfession && (
        <SmartRecommendation
          profession={s.topProfession}
          language={s.language}
          haptic={haptic}
          onClick={() => navigate('/professions')}
        />
      )}

      <MenuFooter
        language={s.language}
        haptic={haptic}
        onSettings={() => navigate('/settings')}
      />

      <div className={styles.safeAreaBottom} />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  )
}
