import { useLayoutEffect } from 'react'
import { useTheme } from './useStore'

export default function useDarkMode(): void {
  const { theme } = useTheme()
  // Apply theme and accent color before paint + minimal reset for consistency
  useLayoutEffect(() => {
    const root = document.documentElement
    if (theme.darkMode) {
      root.classList.remove('light')
      root.classList.add('dark')
      root.style.colorScheme = 'dark'
      root.style.setProperty('--background', '#1e1e1e')
    } else {
      root.classList.remove('dark')
      root.classList.add('light')
      root.style.colorScheme = 'light'
      root.style.setProperty('--background', '#ffffff')
    }
  }, [theme.darkMode])
}
