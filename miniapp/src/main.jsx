import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Initialize Telegram before React renders to prevent fullscreen viewport shift during splash
const _tg = window.Telegram?.WebApp
if (_tg) {
  _tg.ready()
  try { _tg.setHeaderColor('#0B0E1A') }     catch {}
  try { _tg.setBackgroundColor('#0B0E1A') } catch {}
  if (_tg.requestFullscreen) _tg.requestFullscreen()
  else _tg.expand()
  if (_tg.disableVerticalSwipes) _tg.disableVerticalSwipes()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
