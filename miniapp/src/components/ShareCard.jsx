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
    const cardTitle = prof.title.length > 28 ? prof.title.slice(0, 26) + '...' : prof.title
    ctx.fillText('#1 ' + cardTitle, 36, profY + 26)

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

// N5: LinkedIn card 1200×627
function drawLinkedInCard(canvas, { norm, riasec, profs, lang }) {
  const ctx = canvas.getContext('2d')
  const W = 1200, H = 627
  const isRu = lang !== 'en'

  ctx.fillStyle = '#0d0f1a'
  ctx.fillRect(0, 0, W, H)
  const grad = ctx.createRadialGradient(400, 0, 0, 400, 0, 600)
  grad.addColorStop(0, 'rgba(115,71,230,0.4)')
  grad.addColorStop(1, 'rgba(115,71,230,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Left panel — text
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  roundRect(ctx, 48, 48, 520, H - 96, 20)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 48px Arial, sans-serif'
  ctx.fillText('Career', 80, 120)
  ctx.fillStyle = '#a78bfa'
  ctx.fillText('Check', 80 + ctx.measureText('Career').width, 120)

  const dom = Object.entries(riasec).sort((a, b) => b[1] - a[1])[0][0]
  const RIASEC_RU = {R:'Реалистичный',I:'Исследовательский',A:'Артистичный',S:'Социальный',E:'Предприимчивый',C:'Конвенциональный'}
  const RIASEC_EN = {R:'Realistic',I:'Investigative',A:'Artistic',S:'Social',E:'Enterprising',C:'Conventional'}
  const domLabel = isRu ? RIASEC_RU[dom] : RIASEC_EN[dom]

  ctx.fillStyle = '#2ed1f2'
  ctx.font = 'bold 38px Arial, sans-serif'
  ctx.fillText(domLabel, 80, 200)
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  ctx.font = '22px Arial, sans-serif'
  ctx.fillText(isRu ? 'Профессиональный тип' : 'Professional type', 80, 240)

  // Big Five bars
  const traits = ['O','C','E','A','S']
  const SHORT_RU = {O:'Открытость',C:'Сознательность',E:'Экстраверсия',A:'Доброжелат.',S:'Стабильность'}
  const SHORT_EN = {O:'Openness',C:'Conscientiousness',E:'Extraversion',A:'Agreeableness',S:'Stability'}
  const short = isRu ? SHORT_RU : SHORT_EN

  traits.forEach((t, i) => {
    const y   = 290 + i * 52
    const pct = norm[t] || 0
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '20px Arial, sans-serif'
    ctx.fillText(short[t], 80, y + 16)
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    roundRect(ctx, 80, y + 22, 340, 10, 5)
    ctx.fill()
    if (pct > 0) {
      const fg = ctx.createLinearGradient(80, 0, 420, 0)
      fg.addColorStop(0, '#7347e6')
      fg.addColorStop(1, '#2ed1f2')
      ctx.fillStyle = fg
      roundRect(ctx, 80, y + 22, 340 * pct / 100, 10, 5)
      ctx.fill()
    }
    ctx.fillStyle = '#2ed1f2'
    ctx.font = 'bold 18px Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${pct}%`, 440, y + 16)
    ctx.textAlign = 'left'
  })

  // Right panel — top professions
  const prof = profs?.[0]
  if (prof) {
    ctx.fillStyle = 'rgba(255,215,0,0.08)'
    roundRect(ctx, 620, 48, 532, H - 96, 20)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,215,0,0.2)'
    ctx.lineWidth = 1.5
    roundRect(ctx, 620, 48, 532, H - 96, 20)
    ctx.stroke()

    ctx.fillStyle = '#fbbf24'
    ctx.font = 'bold 28px Arial, sans-serif'
    ctx.fillText(isRu ? '#1 Профессия' : '#1 Career Match', 660, 120)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 36px Arial, sans-serif'
    // Обрезаем длинные названия
    const profTitle = prof.title.length > 24 ? prof.title.slice(0, 22) + '...' : prof.title
    ctx.fillText(profTitle, 660, 175)
    ctx.fillStyle = '#2ed1f2'
    ctx.font = 'bold 52px Arial, sans-serif'
    ctx.fillText(`${prof.match}%`, 660, 255)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '22px Arial, sans-serif'
    ctx.fillText(isRu ? 'совпадение профиля' : 'profile match', 660, 285)

    // Top 2-3 (без emoji)
    profs.slice(1, 3).forEach((p, i) => {
      const py = 360 + i * 72
      ctx.fillStyle = 'rgba(255,255,255,0.07)'
      roundRect(ctx, 660, py, 450, 56, 10)
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = 'bold 20px Arial, sans-serif'
      const medal = ['#2', '#3'][i]
      const pTitle = p.title.length > 26 ? p.title.slice(0, 24) + '...' : p.title
      ctx.fillText(`${medal} ${pTitle}`, 680, py + 26)
      ctx.fillStyle = '#94a3b8'
      ctx.font = 'bold 20px Arial, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(`${p.match}%`, 1090, py + 26)
      ctx.textAlign = 'left'
    })
  }

  // Footer
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.font = '20px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('careercheck.app · ' + (isRu ? 'Карьерное тестирование Big Five' : 'Big Five Career Assessment'), W / 2, H - 28)
  ctx.textAlign = 'left'
}

export function ShareCard({ results }) {
  const canvasRef   = useRef(null)
  const liCanvasRef = useRef(null)
  const [imgUrl,    setImgUrl]    = useState(null)
  const [liImgUrl,  setLiImgUrl]  = useState(null)
  const [showImg,   setShowImg]   = useState(false)
  const [showLi,    setShowLi]    = useState(false)
  const { tg, haptic } = useTelegram()
  const lang = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const isRu = lang !== 'en'

  useEffect(() => {
    if (!results) return
    const data = { norm: results.normalized_scores, riasec: results.riasec_profile, profs: results.top_professions, lang }
    try {
      const canvas = canvasRef.current
      if (canvas) { drawCard(canvas, data); setImgUrl(canvas.toDataURL('image/png')) }
    } catch (e) { console.error('ShareCard draw error:', e) }
    try {
      const li = liCanvasRef.current
      if (li) { drawLinkedInCard(li, data); setLiImgUrl(li.toDataURL('image/png')) }
    } catch (e) { console.error('LinkedIn card draw error:', e) }
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

  function handleLinkedIn() {
    haptic.success()
    if (!liImgUrl) {
      // Canvas ещё не готов или ошибка — генерируем заново
      try {
        const li = liCanvasRef.current
        if (!li) return
        const data = { norm: results.normalized_scores, riasec: results.riasec_profile, profs: results.top_professions, lang }
        drawLinkedInCard(li, data)
        const url = li.toDataURL('image/png')
        setLiImgUrl(url)
        const a = document.createElement('a')
        a.href = url
        a.download = 'CareerCheck_LinkedIn.png'
        a.click()
      } catch (e) { console.error('LinkedIn retry error:', e) }
      return
    }
    const a = document.createElement('a')
    a.href = liImgUrl
    a.download = 'CareerCheck_LinkedIn.png'
    a.click()
  }

  return (
    <>
      <canvas ref={canvasRef}   width={400}  height={520} style={{ display: 'none' }} />
      <canvas ref={liCanvasRef} width={1200} height={627} style={{ display: 'none' }} />

      {/* Share card buttons */}
      <div className="share-card-actions">
        <button className="share-card-btn share-card-btn--preview" onClick={handleShow}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="3" width="18" height="18" rx="3"/>
            <circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
          </svg>
          {isRu ? 'Карточка' : 'Card'}
        </button>
        <button className="share-card-btn share-card-btn--share" onClick={handleShare}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          {isRu ? 'Поделиться' : 'Share'}
        </button>
        <button className="share-card-btn share-card-btn--linkedin" onClick={handleLinkedIn} title="LinkedIn 1200×627">
          in
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
