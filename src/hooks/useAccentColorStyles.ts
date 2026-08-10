import { getHSLComponents } from '@/lib/utils'
import { useLayoutEffect, useMemo } from 'react'
import { useTheme } from './useStore'

// Accent color CSS variables updater
export default function useAccentColor(): void {
  const { theme } = useTheme()
  const color = useMemo(
    () => (theme.darkMode ? theme.accentColor.dark : theme.accentColor.light),
    [theme.darkMode, theme.accentColor.dark, theme.accentColor.light],
  )
  useLayoutEffect(() => {
    const root = document.documentElement
    const hsl = getHSLComponents(color)

    root.style.setProperty('--accent-h', String(hsl.h))
    root.style.setProperty('--accent-s', hsl.s + '%')
    root.style.setProperty('--accent-l', hsl.l + '%')
  }, [color])
}
