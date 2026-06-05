import { useRef, useEffect, useState } from 'react'
import { useTelegram } from '../hooks/useTelegram'

const TRAIT_SHORT = { O: 'Открыт.', C: 'Сознат.', E: 'Экстр.', A: 'Доброж.', S: 'Стабил.' }
const TRAIT_SHORT_EN = { O: 'Open.', C: 'Consc.', E: 'Extra.', A: 'Agree.', S: 'Stabil.' }
const RIASEC = {
  ru: { R:'Реалистичный', I:'Исследоват.', A:'Артистичный', S:'Социальный', E:'Предприимч.', C:'Конвенц.' },
  en: { R:'Realistic', I:'Investigative', A:'Artistic', S:'Social', E:'Enterprising', C:'Conventional' },
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function drawCard(canvas, { norm, riasec, profs, lang }) {
  const ctx = canvas.getContext('2d')
  const W = 400, H = 520
  const isRu = lang !== 'en'

  // Background
  ctx.fillStyle = '#0d0f1a'
  ctx.fillRect(0, 0, W, H)

  // Purple gradient overlay
  const grad = ctx.createRadialGradient(200, 0, 0, 200, 0, 280)
  grad.addColorStop(0, 'rgba(115,71,230,0.35)')
  grad.addColorStop(1, 'rgba(115,71,230,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Title "CareerCheck"
  ctx.font = 'bold 20px -apple-system, Arial, sans-serif'
  ctx.fillStyle = '#ffffff'
  const careerW = ctx.measureText('Career').width
  ctx.fillText('Career', 24, 46)
  ctx.fillStyle = '#a78bfa'
  ctx.fillText('Check', 24 + careerW, 46)

  // RIASEC dominant type
  const dom = Object.entries(riasec).sort((a, b) => b[1] - a[1])[0][0]
  const domLabel = (RIASEC[isRu ? 'ru' : 'en'] || RIASEC.en)[dom]
  ctx.fillStyle = '#2ed1f2'
  ctx.font = 'bold 26px -apple-system, Arial, sans-serif'
  ctx.fillText(domLabel, 24, 88)

  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font = '13px -apple-system, Arial, sans-serif'
  ctx.fillText(isRu ? 'Профессиональный тип' : 'Professional type', 24, 110)

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(24, 128); ctx.lineTo(376, 128); ctx.stroke()

  // Big Five label
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font = '10px -apple-system, Arial, sans-serif'
  ctx.fillText('BIG FIVE', 24, 150)

  // Big Five bars
  const traits = ['O', 'C', 'E', 'A', 'S']
  const tShort = isRu ? TRAIT_SHORT : TRAIT_SHORT_EN
  const barStartY = 162
  const barH = 7
  const labelW = 68
  const barW = 230

  traits.forEach((t, i) => {
    const y = barStartY + i * 36
    const pct = norm[t] || 0

    ctx.fillStyle = 'rgba(255,255,255,0.65)'
    ctx.font = '12px -apple-system, Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(tShort[t], 24, y + barH)

    // Bar background
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    roundRect(ctx, 24 + labelW, y, barW, barH, 3)
    ctx.fill()

    // Bar fill
    if (pct > 0) {
      const fg = ctx.createLinearGradient(24 + labelW, 0, 24 + labelW + barW, 0)
      fg.addColorStop(0, '#7347e6')
      fg.addColorStop(1, '#2ed1f2')
      ctx.fillStyle = fg
      roundRect(ctx, 24 + labelW, y, barW * pct / 100, barH, 3)
      ctx.fill()
    }

    // Score
    ctx.fillStyle = '#2ed1f2'
    ctx.font = 'bold 12px -apple-system, Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${pct}%`, W - 24, y + barH)
    ctx.textAlign = 'left'
  })

  // Top profession card
  const prof = profs?.[0]
  if (prof) {
    const profY = 360
    ctx.fillStyle = 'rgba(115,71,230,0.15)'
    roundRect(ctx, 24, profY, W - 48, 60, 10)
    ctx.fill()
    ctx.strokeStyle = 'rgba(115,71,230,0.4)'
    ctx.lineWidth = 1
    roundRect(ctx, 24, profY, W - 48, 60, 10)
    ctx.stroke()

    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 15px -apple-system, Arial, sans-serif'
    ctx.fillText('🥇 ' + prof.title, 36, profY + 26)

    ctx.fillStyle = '#2ed1f2'
    ctx.font = 'bold 18px -apple-system, Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${prof.match}%`, W - 36, profY + 26)
    ctx.textAlign = 'left'

    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '12px -apple-system, Arial, sans-serif'
    ctx.fillText(isRu ? 'Топ профессия' : 'Top career match', 36, profY + 46)
  }

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.font = '11px -apple-system, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('careercheck.app · ' + (isRu ? 'Узнай свой карьерный профиль' : 'Discover your career profile'), W / 2, H - 16)
  ctx.textAlign = 'left'
}

export function ShareCard({ results }) {
  const canvasRef = useRef(null)
  const [imgUrl,   setImgUrl]   = useState(null)
  const [showImg,  setShowImg]  = useState(false)
  const { tg, haptic } = useTelegram()
  const lang = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu = lang !== 'en'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !results) return
    drawCard(canvas, {
      norm:   results.normalized_scores,
      riasec: results.riasec_profile,
      profs:  results.top_professions,
      lang,
    })
    setImgUrl(canvas.toDataURL('image/png'))
  }, [results, lang])

  function handleShow() {
    haptic.medium()
    setShowImg(true)
  }

  function handleDownload() {
    haptic.success()
    const a = document.createElement('a')
    a.href = imgUrl
    a.download = 'CareerCheck_Result.png'
    a.click()
  }

  function handleShare() {
    haptic.medium()
    const dom = Object.entries(results.riasec_profile).sort((a, b) => b[1] - a[1])[0][0]
    const domLabel = (RIASEC[isRu ? 'ru' : 'en'] || RIASEC.en)[dom]
    const text = isRu
      ? `Прошёл тест CareerCheck 🚀\nМой тип: ${domLabel}\nУзнай свой → @CareerCheck_Bot`
      : `Took CareerCheck career test 🚀\nMy type: ${domLabel}\nFind yours → @CareerCheck_Bot`
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=https://careercheck.app&text=${encodeURIComponent(text)}`)
    } else if (navigator.share && imgUrl) {
      fetch(imgUrl).then(r => r.blob()).then(blob => {
        navigator.share({ files: [new File([blob], 'result.png', { type: 'image/png' })], text })
      }).catch(() => navigator.share?.({ text }))
    }
  }

  return (
    <>
      {/* Hidden canvas for drawing */}
      <canvas ref={canvasRef} width={400} height={520} style={{ display: 'none' }} />

      {/* Share card buttons */}
      <div className="share-card-actions">
        <button className="share-card-btn share-card-btn--preview" onClick={handleShow}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
          </svg>
          {isRu ? 'Карточка результата' : 'Result card'}
        </button>
        <button className="share-card-btn share-card-btn--share" onClick={handleShare}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          {isRu ? 'Поделиться' : 'Share'}
        </button>
      </div>

      {/* Image preview modal */}
      {showImg && imgUrl && (
        <div className="share-card-modal" onClick={() => setShowImg(false)}>
          <div className="share-card-modal-inner" onClick={e => e.stopPropagation()}>
            <p className="share-card-hint">
              {isRu ? '📸 Сохрани скриншотом или скачай' : '📸 Screenshot or download'}
            </p>
            <img src={imgUrl} alt="Result card" className="share-card-image" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="share-card-btn share-card-btn--share" style={{ flex: 1 }} onClick={handleDownload}>
                {isRu ? 'Скачать' : 'Download'}
              </button>
              <button className="share-card-btn" style={{ flex: 1, background: 'rgba(255,255,255,0.07)' }} onClick={() => setShowImg(false)}>
                {isRu ? 'Закрыть' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
