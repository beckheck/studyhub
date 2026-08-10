import { useLayoutEffect } from 'react'
import { useTheme } from './useStore'

export default function useCardOpacityStyles(): void {
  const { theme } = useTheme()
  const { cardOpacity } = theme

  // Update card opacity CSS variables
  useLayoutEffect(() => {
    let style = document.getElementById('sp-card-opacity')
    if (!style) {
      style = document.createElement('style')
      style.id = 'sp-card-opacity'
      document.head.appendChild(style)
    }

    const cssContent = `
/* Card opacity adjustments - Light Mode */
:where(:not(.dark)) .bg-white\\/80 {
  background-color: rgba(255, 255, 255, ${cardOpacity.light}%) !important;
}

/* Card opacity adjustments - Dark Mode */
:where(.dark) .bg-white\\/80,
:where(.dark) .dark\\:bg-white\\/10 {
  background-color: rgba(39, 39, 42, ${cardOpacity.dark}%) !important;
}

/* Ensure dark mode overrides */
.dark .bg-white\\/80 {
  background-color: rgba(39, 39, 42, ${cardOpacity.dark}%) !important;
}

.dark .dark\\:bg-white\\/10 {
  background-color: rgba(39, 39, 42, ${cardOpacity.dark}%) !important;
}
`

    style.textContent = cssContent
  }, [cardOpacity])
}
