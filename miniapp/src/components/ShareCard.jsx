import { useRef, useEffect, useState } from 'react'
import { useTelegram } from '../hooks/useTelegram'

const TRAIT_FULL_RU = { O:'Открытость к опыту', C:'Сознательность', E:'Экстраверсия', A:'Доброжелательность', S:'Эмоц. стабильность' }
const TRAIT_FULL_EN = { O:'Openness', C:'Conscientiousness', E:'Extraversion', A:'Agreeableness', S:'Stability' }
const RIASEC_FULL = {
  ru: { R:'Реалистичный', I:'Исследовательский', A:'Артистичный', S:'Социальный', E:'Предприимчивый', C:'Конвенциональный' },
  en: { R:'Realistic', I:'Investigative', A:'Artistic', S:'Social', E:'Enterprising', C:'Conventional' },
}
const MEDAL_COLORS = ['#fbbf24', '#94a3b8', '#cd7c3f']

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

// ── Полная карточка результатов (аналог ResultsPage) ──────────────────────────
function drawCard(canvas, { norm, riasec, profs, lang }) {
  const ctx  = canvas.getContext('2d')
  const W    = 400
  const isRu = lang !== 'en'
  const TRAITS  = ['O', 'C', 'E', 'A', 'S']
  const tNames  = isRu ? TRAIT_FULL_RU : TRAIT_FULL_EN
  const rNames  = RIASEC_FULL[isRu ? 'ru' : 'en'] || RIASEC_FULL.en

  // ── Вычисляем высоту динамически ──────────────────────────────────────────
  const HEADER_H  = 90      // лого + тип
  const SECTION_H = 28      // заголовок секции
  const TRAIT_H   = 44      // строка Big Five
  const DIV_H     = 16      // разделитель
  const PROF_H    = 60      // строка профессии
  const FOOTER_H  = 36
  const numProfs  = Math.min(profs?.length || 0, 3)
  const H = HEADER_H + DIV_H + SECTION_H + TRAITS.length * TRAIT_H
          + DIV_H + SECTION_H + numProfs * PROF_H + FOOTER_H

  canvas.height = H

  // Background
  ctx.fillStyle = '#0d0f1a'
  ctx.fillRect(0, 0, W, H)
  const grad = ctx.createRadialGradient(200, 0, 0, 200, 0, H * 0.6)
  grad.addColorStop(0, 'rgba(115,71,230,0.3)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // ── Header ────────────────────────────────────────────────────────────────
  ctx.font = 'bold 18px Arial, sans-serif'
  ctx.fillStyle = '#ffffff'
  const cw = ctx.measureText('Career').width
  ctx.fillText('Career', 24, 32)
  ctx.fillStyle = '#a78bfa'
  ctx.fillText('Check', 24 + cw, 32)

  const dom      = Object.entries(riasec).sort((a, b) => b[1] - a[1])[0][0]
  const domLabel = rNames[dom] || dom
  ctx.fillStyle  = '#2ed1f2'
  ctx.font       = 'bold 22px Arial, sans-serif'
  ctx.fillText(domLabel, 24, 62)

  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.font      = '12px Arial, sans-serif'
  ctx.fillText(isRu ? 'Профессиональный тип' : 'Professional type', 24, 80)

  // ── Big Five ──────────────────────────────────────────────────────────────
  let y = HEADER_H + DIV_H

  // Section label
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font      = '10px Arial, sans-serif'
  ctx.fillText('BIG FIVE', 24, y + 10)
  y += SECTION_H

  const BAR_X   = 175   // начало полосы
  const BAR_W   = W - BAR_X - 52  // ширина полосы
  const SCORE_X = W - 24

  TRAITS.forEach(t => {
    const pct  = norm[t] || 0
    const name = tNames[t] || t

    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font      = '12px Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(name, 24, y + 14)

    // Bar background
    ctx.fillStyle = 'rgba(255,255,255,0.1)'
    roundRect(ctx, BAR_X, y + 5, BAR_W, 8, 4)
    ctx.fill()

    // Bar fill
    if (pct > 0) {
      const fg = ctx.createLinearGradient(BAR_X, 0, BAR_X + BAR_W, 0)
      fg.addColorStop(0, '#7347e6')
      fg.addColorStop(1, '#2ed1f2')
      ctx.fillStyle = fg
      roundRect(ctx, BAR_X, y + 5, BAR_W * pct / 100, 8, 4)
      ctx.fill()
    }

    // Score
    ctx.fillStyle  = '#2ed1f2'
    ctx.font       = 'bold 12px Arial, sans-serif'
    ctx.textAlign  = 'right'
    ctx.fillText(`${pct}%`, SCORE_X, y + 14)
    ctx.textAlign  = 'left'

    // Subtle divider
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth   = 1
    ctx.beginPath(); ctx.moveTo(24, y + TRAIT_H - 2); ctx.lineTo(W - 24, y + TRAIT_H - 2); ctx.stroke()

    y += TRAIT_H
  })

  // ── Top Professions ───────────────────────────────────────────────────────
  y += DIV_H
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.font      = '10px Arial, sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(isRu ? 'ТОП ПРОФЕССИИ' : 'TOP CAREERS', 24, y + 10)
  y += SECTION_H

  ;(profs || []).slice(0, 3).forEach((prof, i) => {
    const mColor = MEDAL_COLORS[i]
    const title  = prof.title || ''
    const match  = prof.match || 0

    // Card bg
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    roundRect(ctx, 24, y, W - 48, PROF_H - 6, 10)
    ctx.fill()

    // Medal + title
    ctx.fillStyle = mColor
    ctx.font      = 'bold 15px Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`#${i + 1}`, 36, y + 22)

    ctx.fillStyle = '#ffffff'
    ctx.font      = 'bold 14px Arial, sans-serif'
    ctx.fillText(title, 62, y + 22)

    // Match %
    ctx.fillStyle  = mColor
    ctx.font       = 'bold 16px Arial, sans-serif'
    ctx.textAlign  = 'right'
    ctx.fillText(`${match}%`, W - 36, y + 22)
    ctx.textAlign  = 'left'

    // Match bar
    const BX = 62, BW = W - 62 - 60
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    roundRect(ctx, BX, y + 30, BW, 5, 2)
    ctx.fill()
    ctx.fillStyle = mColor
    roundRect(ctx, BX, y + 30, BW * match / 100, 5, 2)
    ctx.fill()

    y += PROF_H
  })

  // ── Footer ────────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.font      = '11px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('careercheck.app  ·  @CareerCheckSupport', W / 2, H - 12)
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
  const SHORT_RU = {O:'Открытость',C:'Сознательность',E:'Экстраверсия',A:'Доброжелательность',S:'Стабильность'}
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
    // Issue 4: показываем в модале вместо download (download блокируется в Telegram WebApp)
    let url = liImgUrl
    if (!url) {
      try {
        const li = liCanvasRef.current
        if (!li) return
        const data = { norm: results.normalized_scores, riasec: results.riasec_profile, profs: results.top_professions, lang }
        drawLinkedInCard(li, data)
        url = li.toDataURL('image/png')
        setLiImgUrl(url)
      } catch (e) { console.error('LinkedIn retry error:', e); return }
    }
    setShowLi(true)
  }

  return (
    <>
      {/* height задаётся динамически в drawCard */}
      <canvas ref={canvasRef}   width={400}  height={700} style={{ display: 'none' }} />
      <canvas ref={liCanvasRef} width={1200} height={627} style={{ display: 'none' }} />

      {/* Share card buttons — issue 2: Карточка = стиль Premium (фиолетовый) */}
      <div className="share-card-actions">
        <button className="btn-premium" style={{ flex: 1 }} onClick={handleShow}>
          {isRu ? '🖼 Карточка результата' : '🖼 Result card'}
        </button>
        <button className="share-card-btn share-card-btn--linkedin" onClick={handleLinkedIn} title="LinkedIn 1200×627">
          in
        </button>
      </div>

      {/* Regular card modal */}
      {showImg && imgUrl && (
        <div className="share-card-modal" onClick={() => setShowImg(false)}>
          <div className="share-card-modal-inner" onClick={e => e.stopPropagation()}>
            <p className="share-card-hint">
              {isRu ? '📸 Сохрани скриншотом или нажми Скачать' : '📸 Screenshot or tap Download'}
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

      {/* LinkedIn card modal — полная ширина экрана */}
      {showLi && liImgUrl && (
        <div className="share-card-modal" onClick={() => setShowLi(false)}>
          <div className="share-card-modal-inner share-card-modal-linkedin" onClick={e => e.stopPropagation()}>
            <p className="share-card-hint" style={{ textAlign: 'center', padding: '12px 16px 4px', color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
              {isRu ? '💼 LinkedIn 1200×627 — сохрани скриншотом' : '💼 LinkedIn 1200×627 — save as screenshot'}
            </p>
            <img src={liImgUrl} alt="LinkedIn card" className="share-card-image" />
            <button className="share-card-btn" style={{ margin: '8px 16px 0', background: 'rgba(255,255,255,0.07)' }} onClick={() => setShowLi(false)}>
              {isRu ? 'Закрыть' : 'Close'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
