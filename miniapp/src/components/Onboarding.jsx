import { useState } from 'react'
import { useTelegram } from '../hooks/useTelegram'

const SLIDES = {
  ru: [
    {
      emoji: '🎯',
      title: 'Узнай свой карьерный профиль',
      desc: '10 минут — и ты узнаешь, какие профессии подходят тебе по науке',
    },
    {
      emoji: '🧠',
      title: '60 вопросов о тебе',
      desc: 'Научная модель Big Five — 5 ключевых черт личности, которые определяют карьерный путь',
    },
    {
      emoji: '📊',
      title: 'Твои результаты',
      desc: 'Бесплатно: радар-чарт и топ профессий. Premium: 6-страничный AI-отчёт с персональным планом',
    },
  ],
  en: [
    {
      emoji: '🎯',
      title: 'Discover your career profile',
      desc: '10 minutes — find out which careers suit you based on science',
    },
    {
      emoji: '🧠',
      title: '60 questions about you',
      desc: 'The Big Five scientific model — 5 key personality traits that shape your career path',
    },
    {
      emoji: '📊',
      title: 'Your results',
      desc: 'Free: radar chart and top professions. Premium: 6-page AI report with a personal plan',
    },
  ],
}

const BTN = {
  ru: { next: 'Далее', start: 'Начать тест', skip: 'Пропустить' },
  en: { next: 'Next',  start: 'Start test',  skip: 'Skip' },
}

export function Onboarding({ onDone }) {
  const { haptic, tg } = useTelegram()
  const lang = tg?.initDataUnsafe?.user?.language_code?.slice(0, 2) || 'ru'
  const slides = SLIDES[lang] || SLIDES.en
  const btn    = BTN[lang]    || BTN.en

  const [idx, setIdx] = useState(0)

  function next() {
    haptic.select()
    if (idx < slides.length - 1) {
      setIdx(i => i + 1)
    } else {
      onDone()
    }
  }

  function skip() {
    haptic.light()
    onDone()
  }

  const slide = slides[idx]

  return (
    <div className="onboarding">
      {/* Skip */}
      <button className="onboarding-skip" onClick={skip}>{btn.skip}</button>

      {/* Slide */}
      <div className="onboarding-body" key={idx}>
        <div className="onboarding-emoji">{slide.emoji}</div>
        <h2 className="onboarding-title">{slide.title}</h2>
        <p className="onboarding-desc">{slide.desc}</p>
      </div>

      {/* Dots */}
      <div className="onboarding-dots">
        {slides.map((_, i) => (
          <div key={i} className={`ob-dot ${i === idx ? 'ob-dot-active' : ''}`} />
        ))}
      </div>

      {/* CTA */}
      <button className="onboarding-btn" onClick={next}>
        {idx < slides.length - 1 ? btn.next : btn.start}
      </button>
    </div>
  )
}
