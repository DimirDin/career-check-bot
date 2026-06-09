import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Initialize Telegram before React renders.
// If the webview isn't fullscreen yet, hide the root until Telegram's expansion
// animation completes — otherwise the user sees the whole app "jumping" open.
const _tg = window.Telegram?.WebApp
if (_tg) {
  _tg.ready()
  try { _tg.setHeaderColor('#0B0E1A') }     catch {}
  try { _tg.setBackgroundColor('#0B0E1A') } catch {}
  if (_tg.disableVerticalSwipes) _tg.disableVerticalSwipes()

  if (_tg.requestFullscreen) {
    if (!_tg.isFullscreen) {
      const root = document.getElementById('root')
      root.style.opacity = '0'
      root.style.transition = 'opacity 0.25s ease'
      const show = () => { root.style.opacity = '1' }
      const onFS = () => { clearTimeout(fb); show(); _tg.offEvent('fullscreenChanged', onFS) }
      const fb = setTimeout(() => { show(); _tg.offEvent('fullscreenChanged', onFS) }, 800)
      _tg.onEvent('fullscreenChanged', onFS)
    }
    _tg.requestFullscreen()
  } else {
    _tg.expand()
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
