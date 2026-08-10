import { useLayoutEffect } from 'react'
import { useTheme } from './useStore'

export default function useBaseStyles(): void {
  const { theme } = useTheme()

  useLayoutEffect(() => {
    if (document.getElementById('sp-reset')) return
    const style = document.createElement('style')
    style.id = 'sp-reset'

    // Import font
    const fontLink = document.createElement('link')
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap'
    fontLink.rel = 'stylesheet'
    document.head.appendChild(fontLink)

    style.textContent = `
:root {
  --accent-h: 0;
  --accent-s: 0%;
  --accent-l: 50%;
}
:where(*, *::before, *::after){box-sizing:border-box}
:where(html, body){height:100%; font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif}
:where(body){margin:0; line-height:1.5; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility}
:where(img, picture, video, canvas, svg){display:block; max-width:100%}
:where(input, button, textarea, select){font:inherit}
:where(p, h1, h2, h3, h4, h5, h6){overflow-wrap:break-word; font-family: 'Space Grotesk', sans-serif}
:where(#root, #__next){isolation:isolate}
:where(iframe){border:0}
:where(.dark) label{color:#e5e7eb}
:where(.dark) h1, :where(.dark) h2, :where(.dark) h3, :where(.dark) h4{color:#fafafa}

/* Apply accent color to UI elements */
[role="tab"][data-state="active"] {
  background-color: var(--tab-accent) !important;
  color: white !important;
}

/* Primary buttons */
button:not([variant="ghost"]):not([variant="outline"]):not([variant="secondary"]):not([variant="link"]):not(.sp-red-button),
button[variant="default"],
.bg-gradient-to-br {
  background-color: hsl(var(--accent-h) var(--accent-s) var(--accent-l)) !important;
  color: white !important;
}

/* Progress bars */
[role="progressbar"] > div {
  background-color: hsl(var(--accent-h) var(--accent-s) var(--accent-l)) !important;
}

/* Switches */
[data-state="checked"] {
  background-color: hsl(var(--accent-h) var(--accent-s) var(--accent-l)) !important;
}

/* Button hover states */
button:hover:not([variant="ghost"]):not([variant="outline"]):not([variant="secondary"]):not([variant="link"]):not(.sp-red-button),
button[variant="default"]:hover {
  background-color: hsl(var(--accent-h) var(--accent-s) calc(var(--accent-l) - 5%)) !important;
}

/* Gradients */
.text-transparent.bg-gradient-to-r {
  background-image: linear-gradient(to right, 
    hsl(var(--accent-h) var(--accent-s) var(--accent-l)), 
    hsl(calc(var(--accent-h) + 60) var(--accent-s) var(--accent-l))
  ) !important;
}

/* Badge accents */
.bg-violet-500 {
  background-color: hsl(var(--accent-h) var(--accent-s) var(--accent-l)) !important;
}

/* Focus ring */
*:focus-visible {
  outline-color: hsl(var(--accent-h) var(--accent-s) var(--accent-l)) !important;
}

/* Gen Z styling enhancements */
h1, h2, h3, h4, h5, h6 {
  font-family: 'Space Grotesk', sans-serif !important;
  font-weight: 600 !important;
  letter-spacing: -0.025em !important;
}

button, .button {
  font-family: 'Space Grotesk', sans-serif !important;
  font-weight: 500 !important;
  letter-spacing: -0.01em !important;
}

/* Weather widget 3D effects */
.weather-icon-3d {
  filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.4)) drop-shadow(1px 1px 2px rgba(0,0,0,0.2));
  transform: perspective(150px) rotateX(20deg) rotateY(-5deg);
  transition: transform 0.3s ease;
}

.weather-icon-3d:hover {
  transform: perspective(150px) rotateX(25deg) rotateY(-10deg) scale(1.1);
}

/* Water wave animation for goals */
@keyframes wave {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-2px);
  }
}
`
    document.head.appendChild(style)
  }, [])

  // Handle custom cursor separately
  useLayoutEffect(() => {
    const body = document.body
    if (theme.customCursor) {
      body.style.cursor = `url(${theme.customCursor}), auto`
    } else {
      body.style.cursor = ''
    }

    return () => {
      body.style.cursor = ''
    }
  }, [theme.customCursor])
}
