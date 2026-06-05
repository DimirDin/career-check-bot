/**
 * @typedef {Object} UserState
 * @property {boolean} hasResults
 * @property {boolean} hasPremium
 * @property {boolean} testInProgress
 * @property {number}  currentQuestion
 * @property {string|null} lastResultDate
 * @property {string|null} lastResultId
 * @property {number}  historyCount
 * @property {string}  language
 * @property {{name:string, match:number, id:string}|null} topProfession
 */

import { useState, useEffect, useCallback } from 'react'

/** @type {UserState} */
const FALLBACK_STATE = {
  hasResults:      false,
  hasPremium:      false,
  testInProgress:  false,
  currentQuestion: 0,
  lastResultDate:  null,
  lastResultId:    null,
  historyCount:    0,
  language:        'ru',
  topProfession:   null,
}

async function fetchWithRetry(url, maxAttempts = 3) {
  let lastErr
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      lastErr = err
      if (attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt - 1) * 1000))
      }
    }
  }
  throw lastErr
}

/**
 * @param {string} initData - Telegram initData
 * @returns {{ state: UserState|null, loading: boolean, error: string|null, refresh: ()=>void }}
 */
export function useUserState(initData) {
  const [state,   setState]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tick,    setTick]    = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    if (!initData) {
      setState(FALLBACK_STATE)
      setLoading(false)
      return
    }

    fetchWithRetry(`/api/user/state?init_data=${encodeURIComponent(initData)}`)
      .then(data => { if (!cancelled) setState(data) })
      .catch(err  => { if (!cancelled) { setError(err.message); setState(FALLBACK_STATE) } })
      .finally(()  => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [initData, tick])

  const refresh = useCallback(() => setTick(t => t + 1), [])

  return { state, loading, error, refresh }
}
