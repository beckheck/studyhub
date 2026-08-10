import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function uid(): string {
  return crypto.randomUUID()
}

export function cn(...inputs: Parameters<typeof clsx>): string {
  return twMerge(clsx(inputs))
}

// Convert hex to HSL components
export function getHSLComponents(hex: string) {
  if (typeof hex !== 'string') {
    return { h: 0, s: 0, l: 0 } // Return default HSL if input is invalid
  }
  // Remove the hash if present
  hex = hex.replace('#', '')

  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255
  const g = parseInt(hex.substr(2, 2), 16) / 255
  const b = parseInt(hex.substr(4, 2), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h: number,
    s: number,
    l = (max + min) / 2

  if (max === min) {
    h = s = 0
  } else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
      default:
        h = 0
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}
