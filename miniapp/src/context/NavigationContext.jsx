import { createContext, useContext } from 'react'

/** @type {React.Context<{navigate:(route:string)=>void, current:string}>} */
export const NavigationContext = createContext({ navigate: () => {}, current: '/menu' })

export function useNavigate() {
  return useContext(NavigationContext).navigate
}

export function useLocation() {
  const { current } = useContext(NavigationContext)
  return { pathname: current }
}
