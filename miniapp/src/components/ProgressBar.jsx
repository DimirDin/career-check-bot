import styles from '../styles/MenuPage.module.css'

/**
 * Переиспользуемый прогресс-бар.
 * @param {{ value: number, max?: number, color?: 'green'|'purple'|'cyan' }} props
 */
export function ProgressBar({ value, max = 100, color = 'green' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={styles.progressBarContainer}>
      <div
        className={`${styles.progressBarFill} ${styles[`progressBar_${color}`] || ''}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
