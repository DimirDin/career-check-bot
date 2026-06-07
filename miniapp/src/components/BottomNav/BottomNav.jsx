import { useContext } from 'react'
import { NavigationContext } from '../../context/NavigationContext'
import './BottomNav.css'

const TABS = [
  {
    id: 'home',
    label: 'Главная',
    path: '/menu',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
          stroke={active ? '#6C5CE7' : '#8B8FA8'}
          strokeWidth="2"
          strokeLinejoin="round"
          fill={active ? 'rgba(108,92,231,0.15)' : 'none'}
        />
      </svg>
    ),
  },
  {
    id: 'test',
    label: 'Тест',
    path: '/test',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <polygon
          points="12,2 21.5,8 18,19.5 6,19.5 2.5,8"
          stroke={active ? '#6C5CE7' : '#8B8FA8'}
          strokeWidth="2"
          strokeLinejoin="round"
          fill={active ? 'rgba(108,92,231,0.15)' : 'none'}
        />
        <circle cx="12" cy="12" r="2.5" fill={active ? '#6C5CE7' : '#8B8FA8'} />
      </svg>
    ),
  },
  {
    id: 'catalog',
    label: 'Каталог',
    path: '/professions',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect
          x="3" y="3" width="18" height="18" rx="3"
          stroke={active ? '#06b6d4' : '#8B8FA8'}
          strokeWidth="2"
          fill={active ? 'rgba(6,182,212,0.12)' : 'none'}
        />
        <path
          d="M7 8h10M7 12h10M7 16h6"
          stroke={active ? '#06b6d4' : '#8B8FA8'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'challenges',
    label: 'Задания',
    path: '/challenges',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z"
          stroke={active ? '#f43f5e' : '#8B8FA8'}
          strokeWidth="2"
          strokeLinejoin="round"
          fill={active ? 'rgba(244,63,94,0.12)' : 'none'}
        />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Профиль',
    path: '/settings',
    icon: (active) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12" cy="8" r="4"
          stroke={active ? '#6C5CE7' : '#8B8FA8'}
          strokeWidth="2"
          fill={active ? 'rgba(108,92,231,0.15)' : 'none'}
        />
        <path
          d="M4 20C4 16.686 7.582 14 12 14C16.418 14 20 16.686 20 20"
          stroke={active ? '#6C5CE7' : '#8B8FA8'}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
]

function resolveActiveTab(current) {
  if (!current || current === '/menu' || current === '/') return 'home'
  if (current.startsWith('/test') || current.startsWith('/results') || current.startsWith('/quiz') || current.startsWith('/quick')) return 'test'
  if (current.startsWith('/professions')) return 'catalog'
  if (current.startsWith('/challenges')) return 'challenges'
  if (current.startsWith('/settings') || current.startsWith('/profile')) return 'profile'
  return 'home'
}

export function BottomNav() {
  const { navigate, current } = useContext(NavigationContext)
  const activeTab = resolveActiveTab(current)

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Основная навигация">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            className={`bottom-nav__tab${isActive ? ' bottom-nav__tab--active' : ''}`}
            onClick={() => navigate(tab.path)}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="bottom-nav__icon">{tab.icon(isActive)}</span>
            <span className="bottom-nav__label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
