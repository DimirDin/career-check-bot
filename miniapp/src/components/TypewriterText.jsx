import { useState, useEffect } from 'react'

export function TypewriterText({ text, speed = 35, delay = 0 }) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setStarted(false)
    const t = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(t)
  }, [text, delay])

  useEffect(() => {
    if (!started || !text) return
    let i = 0
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, ++i))
      if (i >= text.length) clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [started, text, speed])

  return (
    <span>
      {displayed}
      {displayed.length < (text?.length || 0) && (
        <span className="typewriter-cursor">|</span>
      )}
    </span>
  )
}
